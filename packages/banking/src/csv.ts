import { createHash } from 'node:crypto'
import type { ParsedBankTransaction, StatementParseResult } from '@na-regua/contracts'
import { Money } from '@na-regua/money'

/**
 * Leitor de CSV de extrato — RF-076, RF-077.
 *
 * ## O problema que o OFX nao tem
 *
 * CSV de extrato **nao tem padrao**. Cada banco escolhe separador, ordem de
 * coluna, nome de coluna e formato de data. E, pior para nos, quase nenhum traz
 * identificador de transacao — o OFX traz `FITID`, o CSV traz "Data, Historico,
 * Valor" e nada mais.
 *
 * Sem identificador, importar o mesmo arquivo duas vezes duplicaria tudo. E
 * importar duas vezes nao e acidente raro: e a forma normal de conferir se a
 * importacao funcionou.
 *
 * Por isso este leitor SINTETIZA um id estavel — ver `idSintetico`.
 */

const SEPARADORES = [';', ',', '\t'] as const

/**
 * Nomes de coluna que cada campo aceita.
 *
 * Lista, e nao configuracao por banco: um mapa por instituicao precisaria ser
 * mantido a cada mudanca de layout de cada banco, e o lojista descobriria o
 * desatualizado na hora de importar. Casar por nome cobre o que os bancos
 * brasileiros usam de fato, e o que nao casar cai numa recusa que diz quais
 * colunas sao esperadas.
 */
const COLUNAS = {
  data: ['data', 'data lancamento', 'data do lancamento', 'dt', 'date', 'data mov'],
  descricao: ['historico', 'descricao', 'lancamento', 'memo', 'description', 'detalhe'],
  valor: ['valor', 'valor r$', 'amount', 'vlr', 'valor lancamento'],
  documento: ['documento', 'doc', 'numero documento', 'id', 'identificador'],
} as const

export function pareceCsv(conteudo: string): boolean {
  const primeira = conteudo.split(/\r?\n/, 1)[0] ?? ''
  if (primeira === '') return false

  /* Cabecalho com data E valor e o que distingue de um texto qualquer com
     ponto e virgula. */
  const normalizada = normalizar(primeira)
  const temData = COLUNAS.data.some((c) => normalizada.includes(c))
  const temValor = COLUNAS.valor.some((c) => normalizada.includes(c))
  return temData && temValor
}

/**
 * Sem acento, minusculo, espaco colapsado — para casar nome de coluna.
 *
 * A remocao de acento compara CODE POINT, e nao usa uma classe de caracteres
 * com os sinais combinantes escritos direto na regex. Aqueles sinais sao
 * invisiveis no editor, e a versao anterior daqui os tinha: o `no-irregular-whitespace`
 * do lint reprovou o arquivo, e o motivo nao aparecia lendo o codigo. Comparar
 * numero e explicito e nao depende de o caractere sobreviver a copia, ao
 * formatador e ao proximo editor.
 *
 * `U+0300` a `U+036F` e o bloco dos diacriticos combinantes, que e onde `NFD`
 * coloca o acento depois de separa-lo da letra.
 */
const PRIMEIRO_DIACRITICO = 0x0300
const ULTIMO_DIACRITICO = 0x036f

function normalizar(s: string): string {
  const semAcento = [...s.normalize('NFD')]
    .filter((c) => {
      const cp = c.codePointAt(0)!
      return cp < PRIMEIRO_DIACRITICO || cp > ULTIMO_DIACRITICO
    })
    .join('')

  return semAcento.toLowerCase().replace(/\s+/g, ' ').trim()
}

function separadorDe(cabecalho: string): (typeof SEPARADORES)[number] {
  /*
   * O que aparece mais vezes ganha. Ponto e virgula vem primeiro no desempate
   * porque e o padrao do Excel em portugues — e o CSV que o lojista exporta
   * costuma passar pelo Excel antes de chegar aqui.
   */
  let melhor: (typeof SEPARADORES)[number] = ';'
  let maior = -1
  for (const s of SEPARADORES) {
    const n = cabecalho.split(s).length
    if (n > maior) {
      maior = n
      melhor = s
    }
  }
  return melhor
}

/**
 * Divide uma linha respeitando campo entre aspas.
 *
 * Necessario porque descricao de extrato tem virgula com frequencia — "PAGTO
 * FORNECEDOR, PARCELA 3" — e um `split` cru transformaria uma linha de tres
 * campos em quatro, jogando o valor para a coluna errada. O erro que isso
 * produz e o pior tipo: importa, com valor trocado.
 */
function dividir(linha: string, separador: string): string[] {
  const campos: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i]!

    if (c === '"') {
      /* Aspas dobradas dentro de campo entre aspas sao uma aspa literal. */
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i += 1
      } else {
        dentroDeAspas = !dentroDeAspas
      }
      continue
    }

    if (c === separador && !dentroDeAspas) {
      campos.push(atual.trim())
      atual = ''
      continue
    }

    atual += c
  }

  campos.push(atual.trim())
  return campos
}

function acharColuna(cabecalho: readonly string[], aceitos: readonly string[]): number {
  const normalizados = cabecalho.map(normalizar)

  /* Igualdade exata primeiro: "valor" nao deve casar com "valor saldo" quando
     existe uma coluna chamada exatamente "valor". */
  const exato = normalizados.findIndex((c) => aceitos.includes(c))
  if (exato >= 0) return exato

  return normalizados.findIndex((c) => aceitos.some((a) => c.includes(a)))
}

/**
 * Data em `dd/mm/aaaa` ou `aaaa-mm-dd` para `AAAA-MM-DD`.
 *
 * Ano de dois digitos e RECUSADO em vez de adivinhado: "10/09/26" pode ser
 * 2026 ou 1926, e a regra de janela que a maioria dos sistemas usa erra em
 * silencio. Extrato de banco sempre tem ano de quatro digitos; quem chegar
 * aqui com dois provavelmente exportou errado, e vale dizer isso.
 */
function lerData(bruto: string): string | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto)
  if (iso) return validarData(iso[1]!, iso[2]!, iso[3]!)

  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(bruto)
  if (br) return validarData(br[3]!, br[2]!.padStart(2, '0'), br[1]!.padStart(2, '0'))

  return undefined
}

function validarData(ano: string, mes: string, dia: string): string | undefined {
  const m = Number(mes)
  const d = Number(dia)
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
  return `${ano}-${mes}-${dia}`
}

/**
 * Id estavel para linha de CSV sem documento.
 *
 * Hash de data + valor + descricao + **posicao entre as iguais daquele dia**.
 *
 * As tres primeiras partes fazem a mesma transacao gerar o mesmo id em duas
 * importacoes do mesmo arquivo, que e o que a deduplicacao precisa. A quarta
 * resolve o caso que sem ela quebraria: duas transacoes legitimamente
 * identicas no mesmo dia — dois cafes de R$ 8,00 na mesma padaria — teriam o
 * mesmo hash, e a segunda seria descartada como duplicata. O lojista veria o
 * extrato com uma transacao a menos e nada explicando.
 *
 * O prefixo `csv:` deixa claro na base que este id foi sintetizado, e nao veio
 * do banco. Quem for depurar uma duplicata precisa saber a diferenca.
 */
function idSintetico(
  postedOn: string,
  centavos: bigint,
  descricao: string,
  ordinal: number,
): string {
  const digest = createHash('sha256')
    .update(`${postedOn}|${centavos}|${normalizar(descricao)}|${ordinal}`)
    .digest('hex')
    .slice(0, 24)
  return `csv:${digest}`
}

export function lerCsv(conteudo: string): StatementParseResult {
  const linhas = conteudo.split(/\r?\n/)
  const cabecalhoBruto = linhas.find((l) => l.trim() !== '')

  if (cabecalhoBruto === undefined || !pareceCsv(cabecalhoBruto)) {
    return {
      outcome: 'rejected',
      code: 'FORMATO_DESCONHECIDO',
      message:
        'Nao reconhecemos as colunas deste arquivo. O CSV precisa ter uma linha de cabecalho ' +
        'com data, historico e valor.',
      line: 1,
    }
  }

  const separador = separadorDe(cabecalhoBruto)
  const cabecalho = dividir(cabecalhoBruto, separador)

  const iData = acharColuna(cabecalho, COLUNAS.data)
  const iValor = acharColuna(cabecalho, COLUNAS.valor)
  const iDescricao = acharColuna(cabecalho, COLUNAS.descricao)
  const iDocumento = acharColuna(cabecalho, COLUNAS.documento)

  if (iData < 0 || iValor < 0) {
    return {
      outcome: 'rejected',
      code: 'ESTRUTURA_INVALIDA',
      message: 'O CSV precisa de uma coluna de data e uma de valor. Confira o cabecalho.',
      line: 1,
    }
  }

  const inicio = linhas.indexOf(cabecalhoBruto) + 1
  const transacoes: ParsedBankTransaction[] = []
  /* Conta quantas iguais ja apareceram, para o ordinal do id sintetico. */
  const vistas = new Map<string, number>()

  for (let i = inicio; i < linhas.length; i += 1) {
    const linha = linhas[i]!
    if (linha.trim() === '') continue

    const campos = dividir(linha, separador)
    const bruto = campos[iValor]

    /*
     * Linha de saldo passa batido de proposito.
     *
     * Extrato em CSV costuma terminar com "SALDO DO DIA" ou "SALDO ANTERIOR"
     * sem valor, ou com o valor numa coluna de saldo. Recusar o arquivo por
     * causa dela obrigaria o lojista a editar o CSV a mao antes de importar —
     * e ele nao vai editar, vai desistir da conciliacao.
     */
    if (bruto === undefined || bruto === '') continue

    const postedOn = lerData(campos[iData] ?? '')
    if (postedOn === undefined) {
      return {
        outcome: 'rejected',
        code: 'TRANSACAO_INVALIDA',
        message:
          `A data da linha ${i + 1} nao foi reconhecida. Use dd/mm/aaaa ou aaaa-mm-dd, ` +
          'com ano de quatro digitos. Nada foi importado.',
        line: i + 1,
      }
    }

    let centavos: bigint
    try {
      centavos = Money.parse(bruto).cents
    } catch {
      return {
        outcome: 'rejected',
        code: 'TRANSACAO_INVALIDA',
        message: `O valor da linha ${i + 1} nao foi reconhecido. Nada foi importado.`,
        line: i + 1,
      }
    }

    if (centavos === 0n) continue

    const descricao = (campos[iDescricao] ?? '').trim() || 'lancamento sem descricao'
    const documento = iDocumento < 0 ? undefined : campos[iDocumento]?.trim()

    const negativo = centavos < 0n
    const absoluto = negativo ? -centavos : centavos

    const chave = `${postedOn}|${centavos}|${normalizar(descricao)}`
    const ordinal = vistas.get(chave) ?? 0
    vistas.set(chave, ordinal + 1)

    transacoes.push({
      /* Documento do banco quando existe: id de verdade e sempre melhor que
         hash, porque sobrevive a mudanca de descricao no proximo extrato. */
      externalId:
        documento !== undefined && documento !== ''
          ? `doc:${documento}`
          : idSintetico(postedOn, centavos, descricao, ordinal),
      direction: negativo ? 'debit' : 'credit',
      amountCents: Number(absoluto),
      postedOn,
      description: descricao,
      counterparty: null,
    })
  }

  if (transacoes.length === 0) {
    return {
      outcome: 'rejected',
      code: 'SEM_TRANSACOES',
      message: 'Este arquivo tem cabecalho mas nenhuma transacao. Confira o periodo no banco.',
      line: null,
    }
  }

  return { outcome: 'parsed', format: 'csv', transactions: transacoes, account: null }
}
