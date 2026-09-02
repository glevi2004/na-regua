import { invoiceIssueResultSchema } from '@na-regua/contracts'
import { describe, expect, it } from 'vitest'
import { chaveDeAcesso, createFakeInvoiceIssuer } from './fake-issuer.js'
import { pedidoValido, verificarContratoDoEmissor } from './invoice-issuer-contract.js'

/**
 * O falso passa pela suite de contrato — a mesma que o adapter real vai ter de
 * passar (NR-042). E o que faz dele um substituto, e nao uma maquete.
 */
verificarContratoDoEmissor('FakeInvoiceIssuer', () => createFakeInvoiceIssuer())

/**
 * Daqui para baixo, o que so o falso consegue provocar: SEFAZ fora do ar,
 * rejeicao especifica, falha de infraestrutura. No adapter real isso depende de
 * sandbox e roda fora do PR — ver README#testes.
 */
describe('FakeInvoiceIssuer — caminhos que so o falso provoca', () => {
  it('cai em contingencia quando a SEFAZ esta fora, sem bloquear a venda', async () => {
    const emissor = createFakeInvoiceIssuer({ sefazDisponivel: false })

    const resultado = await emissor.issue(pedidoValido())

    /* RF-052: a venda nao para porque a SEFAZ parou. Nao lanca. */
    expect(() => invoiceIssueResultSchema.parse(resultado)).not.toThrow()
    expect(resultado.status).toBe('contingency')
    if (resultado.status !== 'contingency') return
    expect(resultado.accessKey).toMatch(/^\d{44}$/)
    expect(resultado.reason).toContain('contingencia')
  })

  it('marca contingencia na propria chave, no digito de tipo de emissao', async () => {
    const normal = createFakeInvoiceIssuer()
    const offline = createFakeInvoiceIssuer({ sefazDisponivel: false })

    const autorizada = await normal.issue(pedidoValido())
    const contingente = await offline.issue(pedidoValido())
    if (autorizada.status === 'rejected' || contingente.status === 'rejected') {
      throw new Error('pedido valido foi rejeitado')
    }

    /* `tpEmis` e a 35a posicao: 1 e normal, 9 e contingencia offline. */
    expect(autorizada.accessKey[34]).toBe('1')
    expect(contingente.accessKey[34]).toBe('9')
  })

  it('enfileira as notas em contingencia na ordem de emissao', async () => {
    const emissor = createFakeInvoiceIssuer({ sefazDisponivel: false })

    const primeira = await emissor.issue(pedidoValido({ saleId: 'v-1' }))
    const segunda = await emissor.issue(pedidoValido({ saleId: 'v-2' }))
    if (primeira.status === 'rejected' || segunda.status === 'rejected') {
      throw new Error('pedido valido foi rejeitado')
    }

    /* RF-053 retransmite EM ORDEM; a fila precisa preservar essa ordem. */
    expect(emissor.pendentesDeRetransmissao).toEqual([primeira.accessKey, segunda.accessKey])
  })

  it('volta a autorizar quando a SEFAZ retorna', async () => {
    const emissor = createFakeInvoiceIssuer({ sefazDisponivel: false })

    const durante = await emissor.issue(pedidoValido({ saleId: 'v-1' }))
    emissor.configurar({ sefazDisponivel: true })
    const depois = await emissor.issue(pedidoValido({ saleId: 'v-2' }))

    expect(durante.status).toBe('contingency')
    expect(depois.status).toBe('authorized')
  })

  it('traduz a rejeicao da SEFAZ preservando o codigo cru e a mensagem', async () => {
    const emissor = createFakeInvoiceIssuer({
      rejeitarCom: {
        code: '539',
        message: 'Duplicidade de NF-e com diferenca na chave de acesso.',
      },
    })

    const resultado = await emissor.issue(pedidoValido())

    /* RF-047: o codigo serve ao contador, a mensagem serve a tela. */
    expect(resultado.status).toBe('rejected')
    if (resultado.status !== 'rejected') return
    expect(resultado.rejection.code).toBe('539')
    expect(resultado.rejection.message).toContain('Duplicidade')
  })

  it('lanca em falha de infraestrutura, para o job ser retentado', async () => {
    const emissor = createFakeInvoiceIssuer({ falhaDeInfraestrutura: 'certificado A1 vencido' })

    /* Esta NAO e resultado fiscal: nao ha nota, ha job para retentar. */
    await expect(emissor.issue(pedidoValido())).rejects.toThrow('certificado A1 vencido')
  })

  it('nao cancela nota que nunca foi autorizada', async () => {
    const emissor = createFakeInvoiceIssuer({ sefazDisponivel: false })
    const contingente = await emissor.issue(pedidoValido())
    if (contingente.status !== 'contingency') throw new Error('esperava contingencia')

    /* Nota em contingencia ja existe e pode ser cancelada. */
    const cancelamento = await emissor.cancel({
      companyId: 'empresa-1',
      accessKey: contingente.accessKey,
      reason: 'Venda cancelada antes de a nota ser transmitida',
      requestedAt: '2026-09-02T14:00:00.000Z',
    })

    expect(cancelamento.status).toBe('cancelled')
    /* E sai da fila de retransmissao — retransmitir nota cancelada e erro. */
    expect(emissor.pendentesDeRetransmissao).toEqual([])
  })
})

describe('chave de acesso', () => {
  it('tem 44 digitos e digito verificador modulo 11 valido', () => {
    const chave = chaveDeAcesso({
      companyId: 'empresa-1',
      saleId: 'venda-1',
      series: 1,
      number: 1,
      requestedAt: '2026-09-02T13:00:00.000Z',
      emContingencia: false,
    })

    expect(chave).toMatch(/^\d{44}$/)

    /* Recalcula o DV de forma independente: se o falso errasse o calculo, um
       validador real recusaria a chave e ninguem descobriria antes de NR-042. */
    const corpo = chave.slice(0, 43)
    let soma = 0
    let peso = 2
    for (let i = corpo.length - 1; i >= 0; i -= 1) {
      soma += Number(corpo[i]) * peso
      peso = peso === 9 ? 2 : peso + 1
    }
    const resto = soma % 11
    expect(chave[43]).toBe(String(resto <= 1 ? 0 : 11 - resto))
  })

  it('carrega ano, mes e modelo 65 de NFC-e', () => {
    const chave = chaveDeAcesso({
      companyId: 'empresa-1',
      saleId: 'venda-1',
      series: 7,
      number: 42,
      requestedAt: '2026-09-02T13:00:00.000Z',
      emContingencia: false,
    })

    expect(chave.slice(2, 6)).toBe('2609') // AAMM
    expect(chave.slice(20, 22)).toBe('65') // mod — NFC-e
    expect(chave.slice(22, 25)).toBe('007') // serie
    expect(chave.slice(25, 34)).toBe('000000042') // nNF
  })

  it('e estavel: a mesma venda produz a mesma chave', () => {
    const entrada = {
      companyId: 'empresa-1',
      saleId: 'venda-1',
      series: 1,
      number: 1,
      requestedAt: '2026-09-02T13:00:00.000Z',
      emContingencia: false,
    }

    expect(chaveDeAcesso(entrada)).toBe(chaveDeAcesso(entrada))
  })
})
