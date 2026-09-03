import type { ParsedBankTransaction, StatementParseResult } from '@na-regua/contracts'
import { Money } from '@na-regua/money'

/**
 * Leitor de OFX — RF-076, RF-077.
 *
 * ## Por que nao usar um parser de XML
 *
 * OFX 1.x, que e o que banco brasileiro exporta, **nao e XML**: e SGML com
 * fechamento de tag OPCIONAL. Um arquivo real do Itau ou do Bradesco tem
 *
 *     <TRNAMT>-480.00
 *     <FITID>2026091012345
 *
 * sem `</TRNAMT>` nem `</FITID>`. Qualquer parser de XML recusa isso como mal
 * formado, e recusaria a maioria dos extratos que o lojista tem na mao. Por
 * isso a leitura aqui e por expressao regular sobre tag conhecida, e nao por
 * arvore.
 *
 * OFX 2.x e XML de verdade, mas as tags e a estrutura sao as mesmas — a leitura
 * abaixo funciona nos dois, porque o fechamento opcional so torna o padrao mais
 * permissivo.
 */

/** Marcas que identificam um arquivo OFX antes de tentar le-lo. */
const ASSINATURAS = ['<OFX>', 'OFXHEADER', '<STMTTRN>']

export function pareceOfx(conteudo: string): boolean {
  const inicio = conteudo.slice(0, 2048).toUpperCase()
  return ASSINATURAS.some((a) => inicio.includes(a))
}

/**
 * Decodifica o arquivo descobrindo a codificacao.
 *
 * ## Por que isto nao e detalhe
 *
 * Extrato de banco brasileiro vem em `ISO-8859-1`/`Windows-1252` com
 * frequencia, e CSV exportado de Excel recente vem em UTF-8 com BOM. Errar a
 * codificacao **nao falha**: devolve "PAGAMENTO SANEPAR ÁGUA" com o acento
 * virado em outro caractere, e esse texto vai direto para a descricao que o
 * lojista le na tela da conciliacao.
 *
 * Uma primeira versao daqui assumia `latin1` sempre que o arquivo nao
 * declarasse charset. OFX declara no cabecalho; **CSV nao declara nada**.
 * Resultado: todo CSV em UTF-8 chegava corrompido, e o proprio nome da coluna
 * "DESCRIÇÃO" deixava de casar — a importacao dizia que o arquivo nao tinha
 * coluna de descricao. O teste que pegou isso falhou por um motivo que nao
 * aparecia lendo o codigo.
 *
 * ## A ordem
 *
 * 1. **BOM** decide sozinho, e e removido. BOM que fica vira parte do primeiro
 *    nome de coluna: um BOM colado antes de "data" faz o nome da coluna
 *    deixar de casar com "data", e o caractere nao aparece no editor.
 * 2. **Cabecalho declarado**, quando existe (OFX).
 * 3. **UTF-8 estrito**: se os bytes formam UTF-8 valido, e UTF-8. Texto
 *    latin1 com acento quase nunca forma sequencia UTF-8 valida por acidente,
 *    entao o teste e confiavel neste sentido.
 * 4. **`latin1`** por ultimo, que nunca falha na decodificacao.
 */
export function decodificar(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return Buffer.from(bytes.subarray(3)).toString('utf8')
  }

  /* Lido como latin1 so para achar o cabecalho, que e ASCII nos dois formatos
     de OFX. Decodificar duas vezes e barato; adivinhar errado, nao. */
  const sonda = Buffer.from(bytes).toString('latin1').slice(0, 1024).toUpperCase()

  const declarado = /CHARSET[:=]\s*"?([\w-]+)/.exec(sonda)?.[1]
  const doXml = /ENCODING\s*=\s*"([\w-]+)"/.exec(sonda)?.[1]
  const rotulo = (declarado ?? doXml ?? '').replace(/[^A-Z0-9]/g, '')

  if (rotulo !== '') {
    /* `USASCII` e `1252` sao latin1 para o que interessa aqui. */
    return Buffer.from(bytes).toString(
      rotulo === 'UTF8' || rotulo === 'UNICODE' ? 'utf8' : 'latin1',
    )
  }

  return Buffer.from(bytes).toString(ehUtf8Valido(bytes) ? 'utf8' : 'latin1')
}

/**
 * Os bytes formam UTF-8 valido?
 *
 * `fatal: true` faz o decodificador LANCAR em sequencia invalida, em vez de
 * substituir por `�` em silencio — e e justamente o silencio que
 * transforma codificacao errada em texto errado na tela.
 */
function ehUtf8Valido(bytes: Uint8Array): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

/** Le o conteudo de uma tag, com ou sem fechamento. */
function tag(bloco: string, nome: string): string | undefined {
  /*
   * Para no `<` da tag seguinte OU no fechamento. E o que faz a leitura
   * funcionar em SGML e em XML com o mesmo padrao: sem fechamento, o valor
   * termina onde a proxima tag comeca.
   */
  const m = new RegExp(`<${nome}>([^<]*)`, 'i').exec(bloco)
  return m?.[1]?.trim() || undefined
}

/**
 * `DTPOSTED` para `AAAA-MM-DD`.
 *
 * O formato e `AAAAMMDDHHMMSS[-3:BRT]`, e ficam **os oito primeiros
 * caracteres**. Converter para instante e depois formatar no fuso local
 * mudaria o dia: uma transacao de `20260910000000[-3:BRT]` viraria 09/09 em
 * UTC. Data de lancamento e DIA, nao instante — e conciliacao compara dias.
 */
function dataDoLancamento(bruto: string): string | undefined {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.length < 8) return undefined

  const ano = digitos.slice(0, 4)
  const mes = digitos.slice(4, 6)
  const dia = digitos.slice(6, 8)

  const mesN = Number(mes)
  const diaN = Number(dia)
  if (mesN < 1 || mesN > 12 || diaN < 1 || diaN > 31) return undefined

  return `${ano}-${mes}-${dia}`
}

export function lerOfx(conteudo: string): StatementParseResult {
  if (!pareceOfx(conteudo)) {
    return {
      outcome: 'rejected',
      code: 'FORMATO_DESCONHECIDO',
      message: 'Este arquivo nao parece um extrato OFX. Baixe o extrato do banco em OFX ou CSV.',
      line: null,
    }
  }

  const blocos = [...conteudo.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)]

  if (blocos.length === 0) {
    /*
     * Estrutura invalida e nao "sem transacoes": um OFX de periodo sem
     * movimento traz `<BANKTRANLIST>` vazio, e chegar aqui sem NENHUM
     * `<STMTTRN>` fechado quase sempre significa arquivo truncado — download
     * interrompido. As duas situacoes pedem acoes diferentes do lojista.
     */
    const temListaVazia = /<BANKTRANLIST>/i.test(conteudo)
    return temListaVazia
      ? {
          outcome: 'rejected',
          code: 'SEM_TRANSACOES',
          message: 'Este extrato nao tem nenhuma transacao no periodo. Confira as datas no banco.',
          line: null,
        }
      : {
          outcome: 'rejected',
          code: 'ESTRUTURA_INVALIDA',
          message:
            'Nao encontramos transacoes neste OFX. O arquivo pode estar incompleto — baixe de novo.',
          line: null,
        }
  }

  const transacoes: ParsedBankTransaction[] = []

  for (const [indice, bloco] of blocos.entries()) {
    const conteudoDoBloco = bloco[1]!
    const lida = lerTransacao(conteudoDoBloco)

    if (lida === undefined) {
      /*
       * Uma transacao ilegivel recusa o ARQUIVO INTEIRO — RF-077.
       *
       * Importar as outras 44 e deixar esta de fora daria um extrato pela
       * metade dentro do sistema, e a conciliacao passaria a nao fechar por um
       * motivo que ninguem consegue ver: o lojista procuraria a transacao que
       * falta no banco e ela estaria la. Recusar e dizer qual e a linha e a
       * unica saida que ele consegue agir sobre.
       */
      return {
        outcome: 'rejected',
        code: 'TRANSACAO_INVALIDA',
        message:
          `A transacao ${indice + 1} do arquivo esta incompleta ou com valor invalido. ` +
          'Nada foi importado. Baixe o extrato de novo no banco.',
        line: linhaDoBloco(conteudo, bloco[0]!),
      }
    }

    transacoes.push(lida)
  }

  return {
    outcome: 'parsed',
    format: 'ofx',
    transactions: transacoes,
    account: contaDoArquivo(conteudo),
  }
}

function lerTransacao(bloco: string): ParsedBankTransaction | undefined {
  const fitid = tag(bloco, 'FITID')
  const bruto = tag(bloco, 'TRNAMT')
  const postado = tag(bloco, 'DTPOSTED')

  if (fitid === undefined || bruto === undefined || postado === undefined) return undefined

  const postedOn = dataDoLancamento(postado)
  if (postedOn === undefined) return undefined

  let centavos: bigint
  try {
    /* `Money.parse` porque o OFX traz decimal — "-480.00", e as vezes
       "-1.234,56" em arquivo gerado por sistema brasileiro. Multiplicar por
       100 em ponto flutuante e como o erro de centavo entra no sistema. */
    centavos = Money.parse(bruto).cents
  } catch {
    return undefined
  }

  /* Valor zero nao e transacao, e aparece em arquivo de banco como linha de
     saldo ou de tarifa estornada no mesmo instante. Ignorar em silencio seria
     pior que recusar: some do extrato sem explicacao. */
  if (centavos === 0n) return undefined

  /*
   * O SINAL do `TRNAMT` decide a direcao, e nao o `TRNTYPE`.
   *
   * `TRNTYPE` varia demais entre bancos — alem de DEBIT/CREDIT aparecem
   * XFER, PAYMENT, FEE, DEP, e alguns bancos mandam `OTHER` para tudo. O
   * sinal do valor e a informacao que todos preenchem certo, porque e dela
   * que o saldo do proprio extrato depende.
   */
  const negativo = centavos < 0n
  const absoluto = negativo ? -centavos : centavos

  /* `NAME` e a contraparte, `MEMO` e a descricao livre. Bancos preenchem um,
     o outro, ou os dois — o que existir serve de descricao. */
  const nome = tag(bloco, 'NAME')
  const memo = tag(bloco, 'MEMO')

  return {
    externalId: fitid,
    direction: negativo ? 'debit' : 'credit',
    amountCents: Number(absoluto),
    postedOn,
    description: memo ?? nome ?? 'lancamento sem descricao',
    counterparty: nome ?? null,
  }
}

/** Conta e agencia, so para o lojista conferir que subiu o extrato certo. */
function contaDoArquivo(conteudo: string): string | null {
  const banco = tag(conteudo, 'BANKID')
  const conta = tag(conteudo, 'ACCTID')
  if (conta === undefined) return null
  return banco === undefined ? conta : `${banco}/${conta}`
}

/** Numero da linha onde o bloco comeca, base 1 — e o que o editor mostra. */
function linhaDoBloco(conteudo: string, bloco: string): number {
  const posicao = conteudo.indexOf(bloco)
  if (posicao < 0) return 1
  return conteudo.slice(0, posicao).split('\n').length
}
