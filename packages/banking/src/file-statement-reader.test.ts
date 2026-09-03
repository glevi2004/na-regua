import { describe, expect, it } from 'vitest'
import { lerArquivo } from './file-statement-reader.js'

/**
 * Leitura de extrato em arquivo — NR-047, RF-076, RF-077.
 *
 * Os arquivos daqui imitam o que banco brasileiro exporta de verdade, e nao um
 * OFX de manual: tag sem fechamento, `latin1`, fuso no `DTPOSTED`, CSV com
 * ponto e virgula e linha de saldo no fim. Um teste com arquivo bem formado
 * passaria e nao diria nada sobre o arquivo que o lojista tem na mao.
 */

const bytes = (s: string, encoding: BufferEncoding = 'utf8') =>
  new Uint8Array(Buffer.from(s, encoding))

const arquivo = (conteudo: string, filename = 'extrato.ofx', encoding?: BufferEncoding) => ({
  content: bytes(conteudo, encoding),
  filename,
})

/** OFX 1.x como Itau e Bradesco exportam: SGML, tag sem fechar. */
const OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260901
<DTEND>20260930
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260910120000[-3:BRT]
<TRNAMT>-480.00
<FITID>2026091000001
<MEMO>PAGTO ELETRON COPEL
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260912000000[-3:BRT]
<TRNAMT>97.50
<FITID>2026091200002
<NAME>PAGMAXX REPASSE
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

describe('OFX — RF-076', () => {
  it('le o extrato com tag sem fechamento', () => {
    const r = lerArquivo(arquivo(OFX))

    expect(r.outcome).toBe('parsed')
    if (r.outcome !== 'parsed') return
    expect(r.format).toBe('ofx')
    expect(r.transactions).toHaveLength(2)
  })

  it('debito e credito saem do SINAL do valor, nao do TRNTYPE', () => {
    const r = lerArquivo(arquivo(OFX))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]).toMatchObject({ direction: 'debit', amountCents: 48_000 })
    expect(r.transactions[1]).toMatchObject({ direction: 'credit', amountCents: 9_750 })
  })

  /*
   * TRNTYPE varia demais: alem de DEBIT/CREDIT aparecem XFER, PAYMENT, FEE, e
   * alguns bancos mandam OTHER para tudo. O sinal do valor e o que todos
   * preenchem certo, porque o saldo do proprio extrato depende dele.
   */
  it('ignora TRNTYPE que contradiz o sinal', () => {
    const contraditorio = OFX.replace('<TRNTYPE>DEBIT', '<TRNTYPE>OTHER')
    const r = lerArquivo(arquivo(contraditorio))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.direction).toBe('debit')
  })

  /*
   * `20260910000000[-3:BRT]` convertido para instante e formatado em UTC
   * viraria 09/09. Data de lancamento e DIA, e conciliacao compara dias.
   */
  it('nao desloca o dia por causa do fuso no DTPOSTED', () => {
    const meiaNoite = OFX.replace('20260910120000[-3:BRT]', '20260910000000[-3:BRT]')
    const r = lerArquivo(arquivo(meiaNoite))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.postedOn).toBe('2026-09-10')
  })

  it('usa MEMO como descricao e NAME como contraparte', () => {
    const r = lerArquivo(arquivo(OFX))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('PAGTO ELETRON COPEL')
    expect(r.transactions[1]).toMatchObject({
      description: 'PAGMAXX REPASSE',
      counterparty: 'PAGMAXX REPASSE',
    })
  })

  it('guarda o FITID como identificador externo', () => {
    const r = lerArquivo(arquivo(OFX))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.externalId).toBe('2026091000001')
  })

  it('informa a conta para o lojista conferir', () => {
    const r = lerArquivo(arquivo(OFX))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.account).toBe('341/12345-6')
  })

  /*
   * Extrato de banco brasileiro costuma vir em latin1. Lido como UTF-8 nao
   * falha: devolve o acento virado em caractere de substituicao, e esse texto
   * vai para a tela da conciliacao.
   */
  it('respeita o CHARSET do cabecalho e nao estraga acento', () => {
    const comAcento = OFX.replace('PAGTO ELETRON COPEL', 'PAGAMENTO SANEPAR ÁGUA')
    const r = lerArquivo(arquivo(comAcento, 'extrato.ofx', 'latin1'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('PAGAMENTO SANEPAR ÁGUA')
  })

  it('le OFX 2.x, que e XML de verdade', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260910</DTPOSTED>
<TRNAMT>-15.90</TRNAMT><FITID>abc123</FITID><MEMO>TARIFA</MEMO></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

    const r = lerArquivo(arquivo(xml))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]).toMatchObject({ amountCents: 1_590, direction: 'debit' })
  })

  it('le valor com separador de milhar brasileiro', () => {
    const grande = OFX.replace('<TRNAMT>-480.00', '<TRNAMT>-1.234,56')
    const r = lerArquivo(arquivo(grande))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.amountCents).toBe(123_456)
  })
})

describe('OFX recusado — RF-077', () => {
  it.each([
    ['sem FITID', OFX.replace('<FITID>2026091000001\n', '')],
    ['sem TRNAMT', OFX.replace('<TRNAMT>-480.00\n', '')],
    ['sem DTPOSTED', OFX.replace('<DTPOSTED>20260910120000[-3:BRT]\n', '')],
    ['data impossivel', OFX.replace('20260910120000', '20261340120000')],
    ['valor ilegivel', OFX.replace('<TRNAMT>-480.00', '<TRNAMT>quatrocentos')],
  ])('recusa o arquivo inteiro quando uma transacao esta %s', (_motivo, conteudo) => {
    const r = lerArquivo(arquivo(conteudo))

    expect(r.outcome).toBe('rejected')
    if (r.outcome !== 'rejected') return
    expect(r.code).toBe('TRANSACAO_INVALIDA')
  })

  /*
   * O ponto da RF-077. Importar as outras e deixar uma de fora daria um
   * extrato pela metade dentro do sistema: a conciliacao nao fecharia por um
   * motivo que ninguem consegue ver.
   */
  it('a recusa aponta a linha do problema', () => {
    const r = lerArquivo(arquivo(OFX.replace('<FITID>2026091200002\n', '')))
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    expect(r.line).toBeGreaterThan(1)
    expect(r.message).toContain('Nada foi importado')
  })

  it('distingue periodo sem movimento de arquivo truncado', () => {
    const vazio = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST><DTSTART>20260901<DTEND>20260930</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

    expect(lerArquivo(arquivo(vazio))).toMatchObject({ code: 'SEM_TRANSACOES' })
    expect(lerArquivo(arquivo('OFXHEADER:100\n<OFX>truncado'))).toMatchObject({
      code: 'ESTRUTURA_INVALIDA',
    })
  })
})

const CSV = `Data;Historico;Valor;Documento
10/09/2026;PAGTO ELETRON COPEL;-480,00;99881
12/09/2026;"REPASSE PAGMAXX, PARCELA 1";97,50;99882
30/09/2026;SALDO DO DIA;;`

describe('CSV — RF-076', () => {
  it('le CSV com ponto e virgula, que e o do Excel em portugues', () => {
    const r = lerArquivo(arquivo(CSV, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.format).toBe('csv')
    expect(r.transactions).toHaveLength(2)
  })

  it('le valor no formato brasileiro', () => {
    const r = lerArquivo(arquivo(CSV, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]).toMatchObject({ direction: 'debit', amountCents: 48_000 })
  })

  /*
   * Descricao de extrato tem virgula com frequencia. Um split cru
   * transformaria a linha de quatro campos em cinco e jogaria o valor para a
   * coluna errada — o pior tipo de erro, porque importa com valor trocado.
   */
  it('respeita aspas na descricao com virgula', () => {
    const r = lerArquivo(arquivo(CSV, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[1]).toMatchObject({
      description: 'REPASSE PAGMAXX, PARCELA 1',
      amountCents: 9_750,
    })
  })

  /* Extrato em CSV termina com "SALDO DO DIA" sem valor. Recusar por causa
     dela obrigaria a editar o arquivo a mao — e ninguem edita, desiste. */
  it('passa por cima de linha de saldo sem valor', () => {
    const r = lerArquivo(arquivo(CSV, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions.map((t) => t.postedOn)).toEqual(['2026-09-10', '2026-09-12'])
  })

  it('usa o documento do banco como identificador quando existe', () => {
    const r = lerArquivo(arquivo(CSV, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.externalId).toBe('doc:99881')
  })

  it.each([
    [',', 'Data,Historico,Valor\n10/09/2026,COPEL,-480.00'],
    ['\t', 'Data\tHistorico\tValor\n10/09/2026\tCOPEL\t-480,00'],
  ])('detecta o separador "%s"', (_sep, conteudo) => {
    const r = lerArquivo(arquivo(conteudo, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.amountCents).toBe(48_000)
  })

  it('aceita data ISO tambem', () => {
    const iso = 'Data;Historico;Valor\n2026-09-10;COPEL;-480,00'
    const r = lerArquivo(arquivo(iso, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.postedOn).toBe('2026-09-10')
  })

  it('casa nome de coluna sem acento e com maiuscula', () => {
    const variado = 'DATA DO LANÇAMENTO;DESCRIÇÃO;VALOR R$\n10/09/2026;COPEL;-480,00'
    const r = lerArquivo(arquivo(variado, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('COPEL')
  })

  it('prefere a coluna de nome exato a uma que so contem o termo', () => {
    const comSaldo = 'Data;Historico;Valor Saldo;Valor\n10/09/2026;COPEL;1000,00;-480,00'
    const r = lerArquivo(arquivo(comSaldo, 'extrato.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.amountCents).toBe(48_000)
  })
})

describe('id sintetico do CSV', () => {
  const semDoc = 'Data;Historico;Valor\n10/09/2026;PADARIA;-8,00'

  /* Importar duas vezes e a forma normal de conferir se funcionou. Sem id
     estavel, a segunda importacao duplicaria tudo. */
  it('e o mesmo em duas leituras do mesmo arquivo', () => {
    const a = lerArquivo(arquivo(semDoc, 'e.csv'))
    const b = lerArquivo(arquivo(semDoc, 'e.csv'))
    if (a.outcome !== 'parsed' || b.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(a.transactions[0]!.externalId).toBe(b.transactions[0]!.externalId)
  })

  /*
   * O caso que o hash puro quebraria: dois cafes de R$ 8,00 na mesma padaria
   * no mesmo dia teriam o mesmo hash, e a segunda seria descartada como
   * duplicata. O extrato ficaria com uma transacao a menos, sem explicacao.
   */
  it('distingue duas transacoes identicas no mesmo dia', () => {
    const duas = 'Data;Historico;Valor\n10/09/2026;PADARIA;-8,00\n10/09/2026;PADARIA;-8,00'
    const r = lerArquivo(arquivo(duas, 'e.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions).toHaveLength(2)
    expect(r.transactions[0]!.externalId).not.toBe(r.transactions[1]!.externalId)
  })

  it('muda quando o valor muda', () => {
    const outro = semDoc.replace('-8,00', '-9,00')
    const a = lerArquivo(arquivo(semDoc, 'e.csv'))
    const b = lerArquivo(arquivo(outro, 'e.csv'))
    if (a.outcome !== 'parsed' || b.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(a.transactions[0]!.externalId).not.toBe(b.transactions[0]!.externalId)
  })

  /* Quem depurar uma duplicata precisa saber que o id foi inventado por nos e
     nao veio do banco. */
  it('e marcado como sintetizado', () => {
    const r = lerArquivo(arquivo(semDoc, 'e.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.externalId).toMatch(/^csv:/)
  })
})

describe('CSV recusado — RF-077', () => {
  it.each([
    ['sem cabecalho reconhecivel', 'foo;bar;baz\n1;2;3'],
    ['sem coluna de valor', 'Data;Historico\n10/09/2026;COPEL'],
  ])('recusa %s', (_motivo, conteudo) => {
    expect(lerArquivo(arquivo(conteudo, 'e.csv')).outcome).toBe('rejected')
  })

  it('recusa data com ano de dois digitos em vez de adivinhar o seculo', () => {
    const curto = 'Data;Historico;Valor\n10/09/26;COPEL;-480,00'
    const r = lerArquivo(arquivo(curto, 'e.csv'))
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    expect(r.code).toBe('TRANSACAO_INVALIDA')
    expect(r.message).toContain('quatro digitos')
  })

  it('recusa valor ilegivel apontando a linha', () => {
    const ruim = 'Data;Historico;Valor\n10/09/2026;COPEL;quatrocentos'
    const r = lerArquivo(arquivo(ruim, 'e.csv'))
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    expect(r.line).toBe(2)
  })

  it('recusa CSV com cabecalho e nenhuma transacao', () => {
    const r = lerArquivo(arquivo('Data;Historico;Valor\n\n', 'e.csv'))

    expect(r).toMatchObject({ code: 'SEM_TRANSACOES' })
  })
})

describe('formato detectado pelo conteudo, nunca pela extensao', () => {
  /*
   * Extrato baixado do banco chega como `extrato.txt`, `Extrato(1).ofx`,
   * `download.csv` com OFX dentro. A extensao e o que menos se pode confiar.
   */
  it('le OFX num arquivo chamado .csv', () => {
    expect(lerArquivo(arquivo(OFX, 'download.csv')).outcome).toBe('parsed')
  })

  it('le CSV num arquivo chamado .ofx', () => {
    expect(lerArquivo(arquivo(CSV, 'extrato.ofx')).outcome).toBe('parsed')
  })

  /*
   * O erro mais comum de verdade: o lojista baixa em PDF, que e o formato que
   * o banco oferece primeiro. Sem este caso ele receberia "nao reconhecemos as
   * colunas", que nao diz o que fazer.
   */
  it('reconhece PDF e diz onde achar o OFX', () => {
    const r = lerArquivo(arquivo('%PDF-1.7\n%%EOF', 'extrato.pdf'))
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    expect(r.code).toBe('FORMATO_DESCONHECIDO')
    expect(r.message).toContain('PDF')
    expect(r.message).toContain('OFX')
  })

  it('recusa arquivo vazio dizendo o nome', () => {
    const r = lerArquivo({ content: new Uint8Array(), filename: 'extrato.ofx' })
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    expect(r.message).toContain('extrato.ofx')
  })

  /*
   * A primeira versao do decodificador assumia latin1 sempre que o arquivo nao
   * declarasse charset. OFX declara no cabecalho; CSV NAO declara nada. Todo
   * CSV em UTF-8 chegava corrompido, e o proprio nome da coluna acentuada
   * deixava de casar: a importacao dizia que o arquivo nao tinha coluna de
   * descricao. O teste que pegou isso falhava por um motivo que nao aparecia
   * lendo o codigo.
   */
  it('le CSV em UTF-8 com acento na COLUNA', () => {
    const csv = `DATA DO LANÇAMENTO;DESCRIÇÃO;VALOR
10/09/2026;COPEL;-480,00`
    const r = lerArquivo(arquivo(csv, 'e.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('COPEL')
  })

  it('le CSV em UTF-8 com acento no CONTEUDO', () => {
    const csv = `Data;Historico;Valor
10/09/2026;PAGAMENTO SANEPAR ÁGUA;-480,00`
    const r = lerArquivo(arquivo(csv, 'e.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('PAGAMENTO SANEPAR ÁGUA')
  })

  it('le CSV em latin1, que e o que banco antigo exporta', () => {
    const csv = `Data;Historico;Valor
10/09/2026;PAGAMENTO SANEPAR ÁGUA;-480,00`
    const r = lerArquivo(arquivo(csv, 'e.csv', 'latin1'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.description).toBe('PAGAMENTO SANEPAR ÁGUA')
  })

  /*
   * BOM que fica vira parte do primeiro nome de coluna, e `\ufeffdata` nao
   * casa com `data`. Excel escreve UTF-8 com BOM por padrao, entao este e o
   * CSV mais comum que vai chegar aqui.
   */
  it('remove o BOM do UTF-8 do Excel', () => {
    const csv = `\ufeffData;Historico;Valor
10/09/2026;COPEL;-480,00`
    const r = lerArquivo(arquivo(csv, 'e.csv'))
    if (r.outcome !== 'parsed') throw new Error('esperava parsed')

    expect(r.transactions[0]!.amountCents).toBe(48_000)
  })

  it('recusa arquivo que nao e nem um nem outro', () => {
    expect(lerArquivo(arquivo('só um texto qualquer', 'nota.txt')).outcome).toBe('rejected')
  })
})

describe('nao trava com arquivo hostil — js/polynomial-redos', () => {
  /*
   * A primeira versao achava os blocos com
   * `matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)`. Corpo preguicoso com
   * fechamento obrigatorio faz o motor, para CADA abertura, varrer o resto do
   * arquivo procurando o fechamento — O(n²).
   *
   * O CodeQL reprovou o PR por isso (severidade alta), e estava certo: o
   * arquivo abaixo, com 40 mil aberturas e nenhum fechamento, levava minutos
   * na versao antiga. Nao e ataque exotico — um download truncado grande
   * produz exatamente esta forma, e a importacao aceita arquivo de quem esta
   * autenticado.
   *
   * O limite de tempo e generoso de proposito: o que se afirma aqui e a
   * ORDEM de grandeza, nao o desempenho. Linear termina em milissegundos;
   * quadratico nao termina.
   */
  it('recusa em tempo linear um OFX com muitas aberturas e nenhum fechamento', () => {
    const hostil = `OFXHEADER:100\n<OFX>${'<STMTTRN>a'.repeat(40_000)}`

    const comecou = performance.now()
    const r = lerArquivo(arquivo(hostil))
    const levou = performance.now() - comecou

    expect(r).toMatchObject({ code: 'ESTRUTURA_INVALIDA' })
    expect(levou).toBeLessThan(2_000)
  })

  /* O mesmo pela outra ponta: aberturas e fechamentos alternados de verdade. */
  it('le em tempo linear um OFX com muitos blocos completos', () => {
    const bloco = '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910<TRNAMT>-1.00<FITID>x<MEMO>m</STMTTRN>'
    const grande = `OFXHEADER:100\n<OFX><BANKTRANLIST>${bloco.repeat(5_000)}</BANKTRANLIST></OFX>`

    const comecou = performance.now()
    const r = lerArquivo(arquivo(grande))
    const levou = performance.now() - comecou

    if (r.outcome !== 'parsed') throw new Error('esperava parsed')
    expect(r.transactions).toHaveLength(5_000)
    expect(levou).toBeLessThan(2_000)
  })

  /*
   * Dois blocos com o MESMO texto: a versao anterior descobria a linha com
   * `conteudo.indexOf(bloco)`, que acha a primeira ocorrencia — os dois
   * apontariam para a linha do primeiro, e a recusa mandaria o lojista olhar
   * a linha errada.
   */
  it('aponta a linha do bloco certo quando dois sao identicos', () => {
    const ruim = '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910<TRNAMT>-1.00</STMTTRN>'
    const bom = '<STMTTRN><DTPOSTED>20260910<TRNAMT>-1.00<FITID>ok<MEMO>m</STMTTRN>'
    const conteudo = `OFXHEADER:100\n<OFX><BANKTRANLIST>\n${bom}\n${ruim}\n${ruim}\n</BANKTRANLIST></OFX>`

    const r = lerArquivo(arquivo(conteudo))
    if (r.outcome !== 'rejected') throw new Error('esperava rejected')

    /* O primeiro ruim esta na quarta linha: cabecalho, <OFX>, bom, ruim. */
    expect(r.line).toBe(4)
  })
})
