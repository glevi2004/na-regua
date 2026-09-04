import { describe, expect, it } from 'vitest'
import { createSaleInputSchema, paymentInputSchema, saleItemInputSchema } from './sale.js'

const item = { productId: 'p1', quantity: 1, unitPriceCents: 1990 }
const dinheiro = { method: 'cash' as const, amountCents: 1990 }

/** Venda minima valida — base para variar um campo por vez. */
const venda = { items: [item], payments: [dinheiro] }

describe('item da venda', () => {
  it('aceita o caso minimo', () => {
    expect(saleItemInputSchema.safeParse(item).success).toBe(true)
  })

  it.each([
    [{ ...item, quantity: 0 }, 'quantidade zero'],
    [{ ...item, quantity: -1 }, 'quantidade negativa'],
    [{ ...item, quantity: 1.5 }, 'quantidade fracionada'],
    [{ ...item, unitPriceCents: 19.9 }, 'preco decimal em vez de centavos'],
    [{ ...item, unitPriceCents: -100 }, 'preco negativo'],
    [{ productId: 'p1', quantity: 1 }, 'sem preco'],
    [{ quantity: 1, unitPriceCents: 100 }, 'sem produto'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(saleItemInputSchema.safeParse(entrada).success).toBe(false)
  })
})

describe('pagamento', () => {
  it('aceita credito parcelado', () => {
    const r = paymentInputSchema.safeParse({
      method: 'credit',
      amountCents: 30000,
      installments: 3,
      brand: 'visa',
    })
    expect(r.success).toBe(true)
  })

  it('aceita boleto a vista', () => {
    const r = paymentInputSchema.safeParse({ method: 'boleto', amountCents: 1990 })
    expect(r.success).toBe(true)
  })

  it('recusa parcelamento fora do credito', () => {
    const r = paymentInputSchema.safeParse({ method: 'pix', amountCents: 100, installments: 3 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Parcelamento so vale para credito.')
  })

  it.each([
    [{ method: 'credit', amountCents: 100, installments: 0 }, 'zero parcelas'],
    [{ method: 'credit', amountCents: 100, installments: 22 }, 'acima do teto de 21'],
    [{ method: 'cheque', amountCents: 100 }, 'forma inexistente'],
    [{ method: 'cash', amountCents: 12.5 }, 'valor decimal'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(paymentInputSchema.safeParse(entrada).success).toBe(false)
  })
})

describe('venda', () => {
  it('aceita a venda minima', () => {
    expect(createSaleInputSchema.safeParse(venda).success).toBe(true)
  })

  it('recusa venda sem item', () => {
    const r = createSaleInputSchema.safeParse({ ...venda, items: [] })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('A venda precisa de ao menos um item.')
  })

  it('recusa venda sem forma de pagamento', () => {
    expect(createSaleInputSchema.safeParse({ ...venda, payments: [] }).success).toBe(false)
  })

  it('recusa fiado sem cliente identificado', () => {
    const r = createSaleInputSchema.safeParse({
      items: [item],
      payments: [{ method: 'wallet', amountCents: 1990 }],
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Venda no fiado exige cliente identificado.')
    }
  })

  it('aceita fiado quando ha cliente', () => {
    const r = createSaleInputSchema.safeParse({
      customerId: 'c1',
      items: [item],
      payments: [{ method: 'wallet', amountCents: 1990 }],
    })
    expect(r.success).toBe(true)
  })
})

/**
 * Principio 8: o tenant vem do contexto de execucao, nunca do cliente.
 *
 * Este e o teste que justifica o `.strict()` em toda entrada. Sem ele o Zod
 * descartaria o campo em silencio, e um `companyId` no corpo viraria porta
 * para dados de outra empresa sem ninguem perceber.
 */
describe('nenhum schema aceita companyId', () => {
  it('recusa companyId no corpo da venda', () => {
    const r = createSaleInputSchema.safeParse({ ...venda, companyId: 'outra-empresa' })
    expect(r.success).toBe(false)
  })

  it('recusa companyId no item', () => {
    const r = saleItemInputSchema.safeParse({ ...item, companyId: 'outra-empresa' })
    expect(r.success).toBe(false)
  })
})
