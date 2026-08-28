import type { Money } from '@na-regua/money'

export type Installment = {
  /** 1-based. */
  readonly number: number
  readonly grossAmount: Money
  readonly cardFeeAmount: Money
  /** Valor liquido apos tarifa — e o recebivel. D7, US-030 */
  readonly netAmount: Money
  /** UTC. Vencimento / data prevista de repasse. D6 */
  readonly dueDate: Date
}

export type InstallmentPlan = {
  readonly installments: readonly Installment[]
  readonly grossAmount: Money
  readonly cardFeeAmount: Money
  readonly netAmount: Money
}
