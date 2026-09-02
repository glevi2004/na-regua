import {
  LOCAL_REJECTION_CODES,
  invoiceCancellationSchema,
  invoiceIssueResultSchema,
  type CancelInvoiceRequest,
  type InvoiceCancellation,
  type InvoiceIssueResult,
  type IssueInvoiceRequest,
} from '@na-regua/contracts'
import { describe, expect, it } from 'vitest'

/**
 * Suite de contrato da porta `InvoiceIssuer`.
 *
 * O README deste pacote promete que "falso e real satisfazem a **mesma**
 * suite". Este arquivo e essa promessa: ele nao conhece o falso, so a porta.
 * Quando o adapter real entrar (NR-042), ele chama
 * `verificarContratoDoEmissor` com a propria implementacao e ou passa, ou nao
 * e substituivel — que e a unica coisa que um adapter tem de ser.
 *
 * O que NAO esta aqui, de proposito: injecao de falha especifica de provedor
 * (SEFAZ fora do ar, rejeicao forcada). Essas dependem de sandbox e rodam fora
 * do PR; no falso elas viram teste proprio, em `fake-issuer.test.ts`.
 */

export type EmissorSobTeste = {
  issue(request: IssueInvoiceRequest): Promise<InvoiceIssueResult>
  cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellation>
}

const EMPRESA = 'empresa-1'
const OUTRA_EMPRESA = 'empresa-2'

/** Item valido. Sobrescreva um campo para exercitar a validacao de RF-046. */
export function itemValido(
  sobrescreve: Record<string, unknown> = {},
): IssueInvoiceRequest['items'][number] {
  return {
    productId: 'prod-1',
    description: 'Cafe torrado 500g',
    quantity: 2,
    unitPriceCents: 1990,
    unitOfMeasure: 'un',
    ncm: '09011110',
    cfop: '5102',
    taxSituationCode: '102',
    ...sobrescreve,
  } as IssueInvoiceRequest['items'][number]
}

export function pedidoValido(sobrescreve: Partial<IssueInvoiceRequest> = {}): IssueInvoiceRequest {
  return {
    companyId: EMPRESA,
    saleId: 'venda-1',
    series: 1,
    items: [itemValido()],
    payments: [{ method: 'pix', amountCents: 3980 }],
    requestedAt: '2026-09-02T13:00:00.000Z',
    ...sobrescreve,
  }
}

export function verificarContratoDoEmissor(nome: string, criar: () => EmissorSobTeste): void {
  describe(`contrato InvoiceIssuer — ${nome}`, () => {
    it('autoriza a nota e devolve um resultado que satisfaz o contrato', async () => {
      const emissor = criar()

      const resultado = await emissor.issue(pedidoValido())

      /* O schema e o arbitro: se o adapter devolve algo que `core` nao sabe
         ler, ele nao implementa a porta, por mais que compile. */
      expect(() => invoiceIssueResultSchema.parse(resultado)).not.toThrow()
      expect(resultado.status).toBe('authorized')
      if (resultado.status !== 'authorized') return
      expect(resultado.accessKey).toMatch(/^\d{44}$/)
      expect(resultado.number).toBe(1)
      expect(resultado.series).toBe(1)
      /* XML e o que a guarda de 5 anos guarda — RNF-037. */
      expect(resultado.xml.length).toBeGreaterThan(0)
    })

    it('emitir a mesma venda duas vezes nao gera duas notas', async () => {
      const emissor = criar()
      const pedido = pedidoValido()

      const primeira = await emissor.issue(pedido)
      const segunda = await emissor.issue(pedido)

      /* Fila reprocessa. Nota duplicada e problema fiscal — RNF-043. */
      expect(segunda).toEqual(primeira)
    })

    it('numera em sequencia, sem lacuna nem repeticao, sob concorrencia', async () => {
      const emissor = criar()

      const resultados = await Promise.all(
        Array.from({ length: 25 }, (_, i) =>
          emissor.issue(pedidoValido({ saleId: `venda-${i + 1}` })),
        ),
      )

      const numeros = resultados
        .map((r) => (r.status === 'rejected' ? 0 : r.number))
        .sort((a, b) => a - b)

      /* Lacuna na numeracao e o que o fisco pergunta — RNF-039. */
      expect(numeros).toEqual(Array.from({ length: 25 }, (_, i) => i + 1))
    })

    it('numera por serie, sem misturar as sequencias', async () => {
      const emissor = criar()

      const serie1 = await emissor.issue(pedidoValido({ saleId: 'v-1', series: 1 }))
      const serie2 = await emissor.issue(pedidoValido({ saleId: 'v-2', series: 2 }))

      expect(serie1.status === 'authorized' && serie1.number).toBe(1)
      expect(serie2.status === 'authorized' && serie2.number).toBe(1)
    })

    it('rejeita dado fiscal invalido sem transmitir, e sem lancar', async () => {
      const emissor = criar()

      /* NCM com 5 digitos: o tipo nao protege, o pedido veio de uma fila. */
      const resultado = await emissor.issue(pedidoValido({ items: [itemValido({ ncm: '12345' })] }))

      /* RF-046 valida antes de transmitir; RF-047 preserva a venda. Se isso
         lancasse, o `catch` mais proximo poderia desfazer a venda. */
      expect(resultado.status).toBe('rejected')
      if (resultado.status !== 'rejected') return
      expect(resultado.rejection.code).toBe(LOCAL_REJECTION_CODES.validation)
      expect(resultado.rejection.message).toContain('NCM')
    })

    it('rejeita pedido sem item, sem transmitir', async () => {
      const emissor = criar()

      const resultado = await emissor.issue(pedidoValido({ items: [] }))

      expect(resultado.status).toBe('rejected')
      if (resultado.status !== 'rejected') return
      expect(resultado.rejection.code).toBe(LOCAL_REJECTION_CODES.validation)
    })

    it('cancela com justificativa e devolve protocolo', async () => {
      const emissor = criar()
      const emitida = await emissor.issue(pedidoValido())
      if (emitida.status === 'rejected') throw new Error('pedido valido foi rejeitado')

      const cancelamento = await emissor.cancel({
        companyId: EMPRESA,
        accessKey: emitida.accessKey,
        reason: 'Cliente desistiu da compra no balcao',
        requestedAt: '2026-09-02T13:30:00.000Z',
      })

      expect(() => invoiceCancellationSchema.parse(cancelamento)).not.toThrow()
      expect(cancelamento.status).toBe('cancelled')
      if (cancelamento.status !== 'cancelled') return
      /* O protocolo e a prova de que o evento ocorreu — RF-050. */
      expect(cancelamento.protocol.length).toBeGreaterThan(0)
    })

    it('recusa justificativa curta demais para a SEFAZ', async () => {
      const emissor = criar()
      const emitida = await emissor.issue(pedidoValido())
      if (emitida.status === 'rejected') throw new Error('pedido valido foi rejeitado')

      const cancelamento = await emissor.cancel({
        companyId: EMPRESA,
        accessKey: emitida.accessKey,
        reason: 'erro',
        requestedAt: '2026-09-02T13:30:00.000Z',
      })

      /* Recusar aqui poupa uma transmissao e da mensagem em portugues. */
      expect(cancelamento.status).toBe('rejected')
      if (cancelamento.status !== 'rejected') return
      expect(cancelamento.rejection.code).toBe(LOCAL_REJECTION_CODES.validation)
    })

    it('nota de outra empresa responde como inexistente, nunca como proibida', async () => {
      const emissor = criar()
      const emitida = await emissor.issue(pedidoValido())
      if (emitida.status === 'rejected') throw new Error('pedido valido foi rejeitado')

      const cancelamento = await emissor.cancel({
        companyId: OUTRA_EMPRESA,
        accessKey: emitida.accessKey,
        reason: 'Tentativa de cancelar nota de outra loja',
        requestedAt: '2026-09-02T13:30:00.000Z',
      })

      /* "Proibido" confirmaria que a chave existe — RF-122. */
      expect(cancelamento.status).toBe('rejected')
      if (cancelamento.status !== 'rejected') return
      expect(cancelamento.rejection.code).toBe(LOCAL_REJECTION_CODES.notFound)
    })

    it('cancelar chave desconhecida responde como inexistente', async () => {
      const emissor = criar()

      const cancelamento = await emissor.cancel({
        companyId: EMPRESA,
        accessKey: '0'.repeat(44),
        reason: 'Chave que nunca foi emitida por ninguem',
        requestedAt: '2026-09-02T13:30:00.000Z',
      })

      expect(cancelamento.status).toBe('rejected')
      if (cancelamento.status !== 'rejected') return
      expect(cancelamento.rejection.code).toBe(LOCAL_REJECTION_CODES.notFound)
    })
  })
}
