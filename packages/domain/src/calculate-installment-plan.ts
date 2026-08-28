import { calculateCardFeeAmount } from './calculate-card-fee.js'
import { DomainError } from './domain-error.js'
import {
  DEFAULT_SETTLEMENT_DAYS,
  MAX_CREDIT_INSTALLMENTS,
  type CardFeeTable,
} from './types/card-fee-table.js'
import type { Installment, InstallmentPlan } from './types/installment-plan.js'
import type { PaymentInput } from './types/payment-input.js'
import { Money } from '@na-regua/money'

function addUtcDays(at: Date, days: number): Date {
  const result = new Date(at.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function resolveInstallmentCount(payment: PaymentInput): number {
  const installments = payment.installments ?? 1
  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > MAX_CREDIT_INSTALLMENTS
  ) {
    throw new DomainError(
      'INVALID_INSTALLMENTS',
      `Numero de parcelas deve ser um inteiro de 1 a ${MAX_CREDIT_INSTALLMENTS}`,
    )
  }
  if (payment.method === 'debit' && installments !== 1) {
    throw new DomainError('INVALID_INSTALLMENTS', 'Debito aceita apenas 1x')
  }
  return installments
}

/**
 * Gera uma parcela/recebivel por quota de um pagamento `credit` — RF-038.
 * Soma das parcelas e exatamente o valor do pagamento (RNF-045 / Money.allocate).
 */
export function calculateInstallmentPlan(
  payment: PaymentInput,
  cardFees: CardFeeTable,
  at: Date,
): InstallmentPlan {
  if (payment.method !== 'credit') {
    throw new DomainError(
      'NOT_CREDIT_PAYMENT',
      'Plano de parcelas so se aplica a pagamento em credito',
    )
  }

  const count = resolveInstallmentCount(payment)
  const parts = payment.amount.allocate(count)
  const settlementDays = cardFees.settlementDays ?? DEFAULT_SETTLEMENT_DAYS

  const installments: Installment[] = parts.map((grossAmount, index) => {
    const number = index + 1
    const cardFeeAmount = calculateCardFeeAmount(grossAmount, cardFees, payment.brand, count)
    return {
      number,
      grossAmount,
      cardFeeAmount,
      netAmount: grossAmount.subtract(cardFeeAmount),
      dueDate: addUtcDays(at, settlementDays * number),
    }
  })

  return {
    installments,
    grossAmount: payment.amount,
    cardFeeAmount: Money.sum(installments.map((item) => item.cardFeeAmount)),
    netAmount: Money.sum(installments.map((item) => item.netAmount)),
  }
}
