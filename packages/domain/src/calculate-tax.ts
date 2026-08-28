import type { SaleItemInput } from './types/sale-item-input.js'
import type { TaxRules } from './types/tax-rules.js'
import { Money } from '@na-regua/money'

/**
 * Aliquota efetiva do item: override do item, depois do produto, depois do regime. D3
 */
export function resolveTaxRate(item: SaleItemInput, taxRules: TaxRules): number {
  if (item.taxRate !== undefined) {
    return item.taxRate
  }
  const productRates = taxRules.productRates
  if (productRates !== undefined && item.productId in productRates) {
    const productRate = productRates[item.productId]
    if (productRate !== undefined) {
      return productRate
    }
  }
  return taxRules.defaultRate
}

/** Imposto sobre o bruto de cada item — D2, RF-041. */
export function calculateTax(items: readonly SaleItemInput[], taxRules: TaxRules): Money {
  return Money.sum(
    items.map((item) => {
      const itemGross = item.unitPrice.multiply(item.quantity)
      return itemGross.percentage(resolveTaxRate(item, taxRules))
    }),
  )
}
