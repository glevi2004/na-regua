import type { Money } from '@na-regua/money'
import type { CardBrand } from './card-fee-table.js'

/** Formas aceitas no fechamento — RF-034. */
export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'wallet'

export type PaymentInput = {
  readonly method: PaymentMethod
  readonly amount: Money
  /** So faz sentido em `credit`. Ausente = 1x. Maximo 21 (PagMaxx). */
  readonly installments?: number
  /** Ausente no balcao — lookup usa taxa conservadora. D5 */
  readonly brand?: CardBrand
}
