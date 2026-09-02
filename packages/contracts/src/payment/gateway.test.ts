import { describe, expect, it } from 'vitest'
import {
  chargeStatusSchema,
  feeQuoteResultSchema,
  feeQuoteSchema,
  paymentEventSchema,
  paymentEventTypeSchema,
  paymentLinkRequestSchema,
  paymentLinkSchema,
  payerSchema,
  pixChargeRequestSchema,
  pixChargeSchema,
  refundRequestSchema,
  refundResultSchema,
  webhookReadResultSchema,
} from './gateway.js'

const AGORA = '2026-09-02T13:00:00.000Z'

const pedidoPix = {
  companyId: 'e1',
  externalReference: 'venda-1',
  amountCents: 12990,
  description: 'Venda 1',
  requestedAt: AGORA,
}

const pedidoLink = {
  companyId: 'e1',
  externalReference: 'recebivel-1',
  amountCents: 5000,
  description: 'Fiado de agosto',
  requestedAt: AGORA,
}

describe('estado de cobranca', () => {
  it.each(['pending', 'authorized', 'refunded', 'expired', 'cancelled', 'failed'])(
    'aceita %s',
    (estado) => {
      expect(chargeStatusSchema.safeParse(estado).success).toBe(true)
    },
  )

  it('nao aceita approved — esse estado nao existe no provedor', () => {
    /* `payment.approved` nunca e disparado; aceita-lo aqui seria convidar o
       codigo a esperar por ele. */
    const r = chargeStatusSchema.safeParse('approved')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Estado de cobranca invalido.')
  })
})

describe('pagador', () => {
  it('aceita ausencia total — cobranca de balcao nao identifica ninguem', () => {
    expect(payerSchema.safeParse({}).success).toBe(true)
  })

  it('normaliza CPF e CNPJ', () => {
    expect(payerSchema.parse({ document: '123.456.789-09' }).document).toBe('12345678909')
    expect(payerSchema.parse({ document: '12.345.678/0001-95' }).document).toBe('12345678000195')
  })

  it('recusa documento que nao e CPF nem CNPJ', () => {
    expect(payerSchema.safeParse({ document: '1234' }).success).toBe(false)
  })
})

describe('pedido de cobranca Pix', () => {
  it('aceita o caso minimo', () => {
    expect(pixChargeRequestSchema.safeParse(pedidoPix).success).toBe(true)
  })

  it('aceita expiracao e pagador identificados', () => {
    const r = pixChargeRequestSchema.safeParse({
      ...pedidoPix,
      expiresAt: '2026-09-02T14:00:00.000Z',
      payer: { name: 'Joao Silva' },
    })
    expect(r.success).toBe(true)
  })

  it('recusa valor zero — cobranca de nada nao existe', () => {
    const r = pixChargeRequestSchema.safeParse({ ...pedidoPix, amountCents: 0 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('O valor da cobranca precisa ser maior que zero.')
    }
  })

  it.each([
    [{ ...pedidoPix, amountCents: -100 }, 'valor negativo'],
    [{ ...pedidoPix, amountCents: 129.9 }, 'decimal em vez de centavos'],
    [{ ...pedidoPix, externalReference: '' }, 'sem referencia externa'],
    [{ ...pedidoPix, companyId: '' }, 'sem empresa'],
    [{ ...pedidoPix, description: '' }, 'sem descricao'],
    [{ ...pedidoPix, requestedAt: '2026-09-02T13:00:00' }, 'instante sem fuso'],
    [{ ...pedidoPix, campoInventado: 1 }, 'campo desconhecido'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(pixChargeRequestSchema.safeParse(entrada).success).toBe(false)
  })

  it('recusa descricao acima de 140 caracteres', () => {
    const r = pixChargeRequestSchema.safeParse({ ...pedidoPix, description: 'a'.repeat(141) })
    expect(r.success).toBe(false)
  })
})

describe('cobranca Pix', () => {
  const cobranca = {
    chargeId: 'pay_1',
    externalReference: 'venda-1',
    status: 'pending' as const,
    amountCents: 12990,
    qrCodePayload: '00020126...',
    expiresAt: null,
  }

  it('aceita cobranca pendente', () => {
    expect(pixChargeSchema.safeParse(cobranca).success).toBe(true)
  })

  it('exige copia-e-cola — cobranca Pix sem ele nao serve', () => {
    const r = pixChargeSchema.safeParse({ ...cobranca, qrCodePayload: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Cobranca Pix sem copia-e-cola nao serve.')
    }
  })

  it('exige expiresAt explicitamente nulo, nao ausente', () => {
    const { expiresAt: _fora, ...semExpiracao } = cobranca
    expect(pixChargeSchema.safeParse(semExpiracao).success).toBe(false)
  })
})

describe('link de pagamento', () => {
  it('aceita pedido com vencimento', () => {
    const r = paymentLinkRequestSchema.safeParse({ ...pedidoLink, dueDate: '2026-09-10' })
    expect(r.success).toBe(true)
  })

  it('recusa vencimento em formato de instante', () => {
    const r = paymentLinkRequestSchema.safeParse({ ...pedidoLink, dueDate: AGORA })
    expect(r.success).toBe(false)
  })

  it('aceita link com URL valida', () => {
    const r = paymentLinkSchema.safeParse({
      linkId: 'link_1',
      externalReference: 'recebivel-1',
      status: 'pending',
      amountCents: 5000,
      url: 'https://pay.example.com/abc',
      dueDate: '2026-09-10',
    })
    expect(r.success).toBe(true)
  })

  it('recusa link que nao e URL', () => {
    const r = paymentLinkSchema.safeParse({
      linkId: 'link_1',
      externalReference: 'recebivel-1',
      status: 'pending',
      amountCents: 5000,
      url: '/pay/abc',
      dueDate: null,
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Link de pagamento invalido.')
  })
})

describe('estorno', () => {
  const pedido = {
    companyId: 'e1',
    chargeId: 'pay_1',
    reason: 'Devolucao',
    requestedAt: AGORA,
  }

  it('aceita estorno total, sem valor', () => {
    expect(refundRequestSchema.safeParse(pedido).success).toBe(true)
  })

  it('aceita estorno parcial, com valor', () => {
    expect(refundRequestSchema.safeParse({ ...pedido, amountCents: 5000 }).success).toBe(true)
  })

  it('recusa estorno de valor zero', () => {
    expect(refundRequestSchema.safeParse({ ...pedido, amountCents: 0 }).success).toBe(false)
  })

  it('recusa estorno sem motivo', () => {
    expect(refundRequestSchema.safeParse({ ...pedido, reason: '' }).success).toBe(false)
  })

  it('aceita resultado estornado com saldo restante', () => {
    const r = refundResultSchema.safeParse({
      status: 'refunded',
      refundId: 'ref_1',
      chargeId: 'pay_1',
      amountCents: 5000,
      remainingCents: 7990,
      refundedAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it('aceita saldo restante zero — estorno total', () => {
    const r = refundResultSchema.safeParse({
      status: 'refunded',
      refundId: 'ref_1',
      chargeId: 'pay_1',
      amountCents: 12990,
      remainingCents: 0,
      refundedAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it('aceita resultado recusado', () => {
    const r = refundResultSchema.safeParse({
      status: 'rejected',
      rejection: { code: '422', message: 'Prazo expirado.' },
    })
    expect(r.success).toBe(true)
  })

  it('recusa recusa sem mensagem — a tela precisa dizer algo', () => {
    const r = refundResultSchema.safeParse({
      status: 'rejected',
      rejection: { code: '422', message: '' },
    })
    expect(r.success).toBe(false)
  })
})

describe('cotacao de tarifa', () => {
  it('aceita cotacao na unidade de CardFeeRate', () => {
    const r = feeQuoteSchema.safeParse({ brand: 'visa', installments: 3, feeRatePercent: 4.99 })
    expect(r.success).toBe(true)
  })

  it.each([
    [{ brand: 'visa', installments: 0, feeRatePercent: 3.49 }, 'zero parcelas'],
    [{ brand: 'visa', installments: 22, feeRatePercent: 3.49 }, 'acima de 21 parcelas'],
    [{ brand: 'visa', installments: 3, feeRatePercent: 101 }, 'tarifa acima de 100%'],
    [{ brand: 'visa', installments: 3, feeRatePercent: -1 }, 'tarifa negativa'],
    [{ brand: 'inventada', installments: 3, feeRatePercent: 3.49 }, 'bandeira inexistente'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(feeQuoteSchema.safeParse(entrada).success).toBe(false)
  })

  it('aceita resultado cotado', () => {
    const r = feeQuoteResultSchema.safeParse({
      status: 'quoted',
      quotes: [{ brand: 'visa', installments: 1, feeRatePercent: 3.49 }],
      settlementDays: 30,
      quotedAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it('recusa cotacao vazia — cotacao sem tarifa nao e cotacao', () => {
    const r = feeQuoteResultSchema.safeParse({ status: 'quoted', quotes: [], quotedAt: AGORA })
    expect(r.success).toBe(false)
  })

  it('aceita indisponivel, que e resposta esperada e nao falha', () => {
    const r = feeQuoteResultSchema.safeParse({
      status: 'unavailable',
      reason: 'Provedor nao respondeu.',
    })
    expect(r.success).toBe(true)
  })
})

describe('evento de pagamento', () => {
  it.each(['payment.authorized', 'payment.refunded', 'payment.failed', 'payout.paid'])(
    'aceita %s',
    (tipo) => {
      expect(paymentEventTypeSchema.safeParse(tipo).success).toBe(true)
    },
  )

  it('nao aceita payment.approved — o provedor nunca o dispara', () => {
    /* Aceitar seria criar espaco para o codigo esperar uma baixa que nao vem. */
    expect(paymentEventTypeSchema.safeParse('payment.approved').success).toBe(false)
  })

  it('nao aceita type nulo', () => {
    expect(paymentEventTypeSchema.safeParse(null).success).toBe(false)
  })

  it('aceita evento completo', () => {
    const r = paymentEventSchema.safeParse({
      eventId: 'evt-1',
      type: 'payment.authorized',
      chargeId: 'pay_1',
      externalReference: 'venda-1',
      amountCents: 12990,
      occurredAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it('aceita referencia externa nula — repasse nao aponta para venda', () => {
    const r = paymentEventSchema.safeParse({
      eventId: 'evt-1',
      type: 'payout.paid',
      chargeId: 'payout_1',
      externalReference: null,
      amountCents: 100000,
      occurredAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it('exige eventId — sem ele a reentrega vira baixa duplicada', () => {
    const r = paymentEventSchema.safeParse({
      eventId: '',
      type: 'payment.authorized',
      chargeId: 'pay_1',
      externalReference: 'venda-1',
      amountCents: 12990,
      occurredAt: AGORA,
    })
    expect(r.success).toBe(false)
  })
})

describe('leitura do webhook', () => {
  it('aceita os quatro estados, que decidem codigos HTTP diferentes', () => {
    const casos = [
      {
        status: 'accepted',
        event: {
          eventId: 'evt-1',
          type: 'payment.authorized',
          chargeId: 'pay_1',
          externalReference: 'venda-1',
          amountCents: 12990,
          occurredAt: AGORA,
        },
      },
      { status: 'ignored', reason: 'Evento sem type.' },
      { status: 'invalid_signature' },
      { status: 'malformed', reason: 'Corpo ilegivel.' },
    ]

    for (const caso of casos) {
      expect(webhookReadResultSchema.safeParse(caso).success).toBe(true)
    }
  })

  it('assinatura invalida nao carrega motivo: nao ha o que contar a quem forjou', () => {
    const r = webhookReadResultSchema.safeParse({
      status: 'invalid_signature',
      reason: 'HMAC nao confere',
    })
    expect(r.success).toBe(false)
  })

  it('recusa estado que nao existe na uniao', () => {
    expect(webhookReadResultSchema.safeParse({ status: 'erro' }).success).toBe(false)
  })
})
