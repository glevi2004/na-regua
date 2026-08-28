import type { Money } from '@na-regua/money'

export type SaleItemInput = {
  readonly productId: string
  /** Quantidade inteira >= 1. Fracao e de `UnitOfMeasure` no cadastro, nao aqui. */
  readonly quantity: number
  readonly unitPrice: Money
  readonly unitCost: Money
  /** Se ausente, vale a aliquota do produto em TaxRules ou a do regime. D3 */
  readonly taxRate?: number
}
