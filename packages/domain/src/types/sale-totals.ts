import type { Money } from '@na-regua/money'

/** Totais da venda — RF-040. Dinheiro e Money; taxa de margem e percentual. */
export type SaleTotals = {
  readonly grossAmount: Money
  readonly costAmount: Money
  readonly taxAmount: Money
  readonly cardFeeAmount: Money
  /** Bruto − imposto − tarifa. O que de fato entra. */
  readonly netAmount: Money
  /** Liquido − custo. D1 */
  readonly marginAmount: Money
  /** Margem sobre o bruto, em pontos por cem. D1 */
  readonly marginRate: number
}
