import {
  LOCAL_REJECTION_CODES,
  cancelInvoiceRequestSchema,
  issueInvoiceRequestSchema,
  type CancelInvoiceRequest,
  type InvoiceCancellation,
  type InvoiceIssueResult,
  type IssueInvoiceRequest,
} from '@na-regua/contracts'

/**
 * Emissor falso — `FISCAL_PROVIDER=fake`.
 *
 * Existe por dois motivos, e o segundo e o que importa mais. O primeiro e
 * permitir que o sistema suba local sem certificado nem credencial. O segundo e
 * nao esperar a DEC-004: a porta, os caminhos de erro e a suite de contrato
 * podem ser escritos antes de o provedor ser escolhido, e e exatamente para
 * isso que o adapter existe.
 *
 * **Implementa a mesma porta que o real, inclusive os caminhos de erro.** Falso
 * que so devolve sucesso esconde justamente o que precisa ser testado — e
 * rejeicao e contingencia sao o caso comum na emissao fiscal, nao a excecao.
 *
 * Nao importa `core`: satisfaz `InvoiceIssuer` estruturalmente, com os tipos de
 * `contracts`. A regra `adapter-nao-importa-core` na CI garante que continue
 * assim.
 */

/** Nota guardada pelo falso, para idempotencia e cancelamento. */
type NotaEmitida = {
  readonly companyId: string
  readonly saleId: string
  readonly resultado: InvoiceIssueResult
}

export type FakeInvoiceIssuerOptions = {
  /**
   * Quando `false`, a emissao cai em contingencia — RF-052. A venda nao para
   * porque a SEFAZ parou.
   */
  readonly sefazDisponivel?: boolean
  /**
   * Forca uma rejeicao da SEFAZ, para exercitar RF-047 sem depender de dado
   * invalido de verdade.
   */
  readonly rejeitarCom?: { readonly code: string; readonly message: string }
  /**
   * Falha de infraestrutura: token invalido, certificado vencido, resposta
   * ilegivel. Esta **lanca**, porque nao e resultado fiscal — e job para
   * retentar.
   */
  readonly falhaDeInfraestrutura?: string
}

export class FakeInvoiceIssuer {
  /** Ultimo numero usado por empresa e serie — RNF-039. */
  private readonly ultimoNumero = new Map<string, number>()
  /** Nota por `empresa:venda`, o que torna a emissao idempotente. */
  private readonly porVenda = new Map<string, NotaEmitida>()
  /** Nota por chave de acesso, para o cancelamento encontrar. */
  private readonly porChave = new Map<string, NotaEmitida>()
  /** Chaves em contingencia, na ordem de emissao — base do RF-053. */
  private readonly contingencia: string[] = []

  private opcoes: FakeInvoiceIssuerOptions

  constructor(opcoes: FakeInvoiceIssuerOptions = {}) {
    this.opcoes = { sefazDisponivel: true, ...opcoes }
  }

  /** Muda o comportamento no meio do teste: SEFAZ que cai e volta. */
  configurar(opcoes: FakeInvoiceIssuerOptions): void {
    this.opcoes = { ...this.opcoes, ...opcoes }
  }

  /** Chaves em contingencia aguardando retransmissao, em ordem — RF-053. */
  get pendentesDeRetransmissao(): readonly string[] {
    return [...this.contingencia]
  }

  async issue(request: IssueInvoiceRequest): Promise<InvoiceIssueResult> {
    if (this.opcoes.falhaDeInfraestrutura) {
      throw new Error(this.opcoes.falhaDeInfraestrutura)
    }

    /*
     * Idempotencia por venda, ANTES de qualquer outra coisa — RNF-043. O
     * pedido chega de uma fila, e fila reprocessa. Nota duplicada nao e
     * inconveniencia, e problema fiscal que o lojista resolve com o contador.
     */
    const chaveDaVenda = `${request.companyId}:${request.saleId}`
    const jaEmitida = this.porVenda.get(chaveDaVenda)
    if (jaEmitida) return jaEmitida.resultado

    /*
     * Valida ANTES de transmitir — RF-046. O adapter e a ultima fronteira
     * antes da SEFAZ, e o pedido chegou de uma fila como JSON: o tipo do
     * TypeScript nao esta mais de pe aqui. Dado invalido volta como REJEICAO,
     * nao como excecao, porque a venda continua registrada — RF-047.
     */
    const validado = issueInvoiceRequestSchema.safeParse(request)
    if (!validado.success) {
      const primeiro = validado.error.issues[0]
      const onde = primeiro?.path.join('.') ?? 'pedido'
      return {
        status: 'rejected',
        rejection: {
          code: LOCAL_REJECTION_CODES.validation,
          message: `${primeiro?.message ?? 'Dados fiscais invalidos.'} (${onde})`,
        },
      }
    }

    if (this.opcoes.rejeitarCom) {
      return { status: 'rejected', rejection: { ...this.opcoes.rejeitarCom } }
    }

    /*
     * Numeracao alocada de forma sincrona, sem `await` entre ler e gravar —
     * RNF-039. Com um `await` no meio, duas emissoes concorrentes leriam o
     * mesmo ultimo numero e a serie ganharia uma nota duplicada ou uma lacuna.
     * Lacuna na numeracao e coisa que o fisco pergunta.
     */
    const emContingencia = this.opcoes.sefazDisponivel === false
    const numero = this.proximoNumero(request.companyId, request.series)
    const accessKey = chaveDeAcesso({
      companyId: request.companyId,
      saleId: request.saleId,
      series: request.series,
      number: numero,
      requestedAt: request.requestedAt,
      emContingencia,
    })

    const resultado: InvoiceIssueResult = emContingencia
      ? {
          status: 'contingency',
          accessKey,
          number: numero,
          series: request.series,
          xml: xmlDeNota(accessKey, validado.data),
          issuedAt: request.requestedAt,
          reason: 'SEFAZ indisponivel. A nota foi emitida em contingencia e sera transmitida.',
        }
      : {
          status: 'authorized',
          accessKey,
          number: numero,
          series: request.series,
          danfeUrl: `https://fake.fiscal.local/danfe/${accessKey}`,
          xml: xmlDeNota(accessKey, validado.data),
          issuedAt: request.requestedAt,
        }

    const nota: NotaEmitida = { companyId: request.companyId, saleId: request.saleId, resultado }
    this.porVenda.set(chaveDaVenda, nota)
    this.porChave.set(accessKey, nota)
    if (emContingencia) this.contingencia.push(accessKey)

    return resultado
  }

  async cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellation> {
    if (this.opcoes.falhaDeInfraestrutura) {
      throw new Error(this.opcoes.falhaDeInfraestrutura)
    }

    /*
     * Valida antes de transmitir, igual a emissao e pelo mesmo motivo: o
     * pedido vem de uma fila. A justificativa curta e o caso comum — a SEFAZ
     * exige 15 caracteres e "erro" e o que a pessoa digita.
     */
    const validado = cancelInvoiceRequestSchema.safeParse(request)
    if (!validado.success) {
      const primeiro = validado.error.issues[0]
      return {
        status: 'rejected',
        rejection: {
          code: LOCAL_REJECTION_CODES.validation,
          message: primeiro?.message ?? 'Pedido de cancelamento invalido.',
        },
      }
    }

    const nota = this.porChave.get(request.accessKey)

    /*
     * Nota de outra empresa e o mesmo que nota inexistente. Responder
     * "proibido" confirmaria que a chave existe, e chave de acesso e sequencial
     * o bastante para alguem tentar adivinhar a do vizinho.
     */
    if (!nota || nota.companyId !== request.companyId) {
      return {
        status: 'rejected',
        rejection: {
          code: LOCAL_REJECTION_CODES.notFound,
          message: 'Nota fiscal nao encontrada.',
        },
      }
    }

    if (nota.resultado.status === 'rejected') {
      return {
        status: 'rejected',
        rejection: {
          code: '501',
          message: 'Esta nota nao foi autorizada, entao nao ha o que cancelar.',
        },
      }
    }

    this.porChave.delete(request.accessKey)
    this.porVenda.delete(`${nota.companyId}:${nota.saleId}`)
    const posicao = this.contingencia.indexOf(request.accessKey)
    if (posicao !== -1) this.contingencia.splice(posicao, 1)

    return {
      status: 'cancelled',
      accessKey: request.accessKey,
      protocol: `FAKE${digitosDe(request.accessKey + request.reason, 15)}`,
      xml: `<?xml version="1.0" encoding="UTF-8"?><evento tpEvento="110111"><chNFe>${request.accessKey}</chNFe><xJust>${escaparXml(request.reason)}</xJust></evento>`,
      cancelledAt: request.requestedAt,
    }
  }

  private proximoNumero(companyId: string, series: number): number {
    const chave = `${companyId}:${series}`
    const proximo = (this.ultimoNumero.get(chave) ?? 0) + 1
    this.ultimoNumero.set(chave, proximo)
    return proximo
  }
}

/** Cria um emissor falso. A raiz de composicao escolhe por `FISCAL_PROVIDER`. */
export function createFakeInvoiceIssuer(opcoes?: FakeInvoiceIssuerOptions): FakeInvoiceIssuer {
  return new FakeInvoiceIssuer(opcoes)
}

/**
 * Chave de acesso de 44 digitos, no layout real da NFe.
 *
 * `cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)`
 *
 * Segue o layout de verdade, com digito verificador modulo 11 calculado, em vez
 * de 44 digitos quaisquer. Nao e capricho: chave que passa em validador e chave
 * que exercita o `accessKeySchema`, o campo do banco e a tela do lojista do
 * mesmo jeito que a real. Falso com formato de brinquedo esconde erro de
 * formato para descobrir em producao.
 *
 * O CNPJ e derivado do `companyId` porque o pedido de emissao nao carrega o
 * CNPJ da empresa — determinismo importa mais aqui que fidelidade do numero.
 */
export function chaveDeAcesso(entrada: {
  companyId: string
  saleId: string
  series: number
  number: number
  requestedAt: string
  emContingencia: boolean
}): string {
  const data = new Date(entrada.requestedAt)
  const aamm = `${String(data.getUTCFullYear() % 100).padStart(2, '0')}${String(data.getUTCMonth() + 1).padStart(2, '0')}`

  const corpo = [
    '41', // cUF — Parana, fixo no falso
    aamm,
    digitosDe(entrada.companyId, 14), // CNPJ derivado do tenant
    '65', // mod — 65 e NFC-e
    String(entrada.series).padStart(3, '0'),
    String(entrada.number).padStart(9, '0'),
    entrada.emContingencia ? '9' : '1', // tpEmis — 9 e contingencia offline
    digitosDe(entrada.saleId, 8), // cNF
  ].join('')

  return corpo + digitoVerificador(corpo)
}

/**
 * Digito verificador modulo 11, pesos 2 a 9 ciclando da direita para a
 * esquerda. Resto 0 ou 1 vira digito 0, como manda o manual.
 */
function digitoVerificador(corpo: string): string {
  let soma = 0
  let peso = 2
  for (let i = corpo.length - 1; i >= 0; i -= 1) {
    soma += Number(corpo[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return String(resto <= 1 ? 0 : 11 - resto)
}

/**
 * Deriva `quantidade` digitos de um texto qualquer, de forma deterministica.
 *
 * O mesmo `companyId` sempre produz o mesmo "CNPJ", o que mantem a chave
 * estavel entre execucoes — teste que depende de chave precisa disso.
 */
function digitosDe(texto: string, quantidade: number): string {
  let hash = 2166136261
  const saida: string[] = []
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  for (let i = 0; i < quantidade; i += 1) {
    hash = Math.imul(hash, 16777619) >>> 0
    saida.push(String(hash % 10))
  }
  return saida.join('')
}

/** XML minimo, com o que os testes e a guarda de 5 anos precisam — RNF-037. */
function xmlDeNota(accessKey: string, request: IssueInvoiceRequest): string {
  const itens = request.items
    .map(
      (item, indice) =>
        `<det nItem="${indice + 1}"><prod><cProd>${escaparXml(item.productId)}</cProd>` +
        `<xProd>${escaparXml(item.description)}</xProd><NCM>${item.ncm}</NCM>` +
        `<CFOP>${item.cfop}</CFOP><uCom>${item.unitOfMeasure}</uCom>` +
        `<qCom>${item.quantity}</qCom><vUnCom>${item.unitPriceCents}</vUnCom></prod></det>`,
    )
    .join('')

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<NFe><infNFe Id="NFe${accessKey}" versao="4.00">` +
    `<ide><serie>${request.series}</serie><dhEmi>${request.requestedAt}</dhEmi></ide>` +
    itens +
    `</infNFe></NFe>`
  )
}

/** O `xProd` vem de cadastro digitado por gente: `&` e `<` acontecem. */
function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
