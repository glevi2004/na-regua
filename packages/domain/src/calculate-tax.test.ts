import { describe, expect, it } from 'vitest'
import { calculateTax, resolveTaxRate } from './calculate-tax.js'
import type { SaleItemInput } from './types/sale-item-input.js'
import type { TaxRules } from './types/tax-rules.js'
import { Money } from '@na-regua/money'

const simples: TaxRules = { regime: 'simples_nacional', defaultRate: 6 }

function item(overrides: Partial<SaleItemInput> = {}): SaleItemInput {
  return {
    productId: 'sku-1',
    quantity: 1,
    unitPrice: Money.parse('100.00'),
    unitCost: Money.parse('40.00'),
    ...overrides,
  }
}

describe('resolveTaxRate — D3', () => {
  it('usa a aliquota do item quando informada', () => {
    expect(resolveTaxRate(item({ taxRate: 12 }), simples)).toBe(12)
  })

  it('usa a aliquota do produto quando o item nao traz override', () => {
    const rules: TaxRules = {
      regime: 'simples_nacional',
      defaultRate: 6,
      productRates: { 'sku-1': 4 },
    }
    expect(resolveTaxRate(item(), rules)).toBe(4)
  })

  it('cai na aliquota do regime quando nao ha override', () => {
    expect(resolveTaxRate(item(), simples)).toBe(6)
  })
})

describe('calculateTax — RF-041', () => {
  it('aplica a aliquota do simples nacional sobre o bruto do item — US-020', () => {
    const tax = calculateTax([item()], simples)
    expect(tax.toDecimalString()).toBe('6.00')
  })

  it('soma o imposto de varios itens', () => {
    const tax = calculateTax(
      [item(), item({ productId: 'sku-2', unitPrice: Money.parse('50.00') })],
      simples,
    )
    expect(tax.toDecimalString()).toBe('9.00')
  })

  it('imposto e sobre o bruto, nao sobre (bruto - custo) — D2', () => {
    const tax = calculateTax([item({ unitCost: Money.parse('90.00') })], simples)
    expect(tax.toDecimalString()).toBe('6.00')
  })
})
