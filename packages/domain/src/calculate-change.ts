import { Money } from '@na-regua/money'
import { DomainError } from './domain-error.js'
import type { PaymentInput } from './types/payment-input.js'

/**
 * Troco do pagamento em dinheiro — RF-035.
 *
 * So `cash` gera troco. Pix, cartao e carteira transferem o valor exato: nao
 * existe "pagar a mais" em Pix e devolver a diferenca em especie, e tratar
 * assim esconderia um erro de digitacao virando saida de caixa.
 *
 * Por isso a sobra e medida sobre o que foi pago EM DINHEIRO, e nao sobre a
 * soma de tudo. Numa venda de R$ 100 paga com R$ 60 em Pix e R$ 50 em
 * dinheiro, o troco e R$ 10 — a parte em dinheiro cobre os R$ 40 restantes e
 * sobra o resto.
 */
export function calculateChange(total: Money, payments: readonly PaymentInput[]): Money {
  if (total.isNegative()) {
    throw new DomainError('INVALID_CHANGE', 'O total da venda nao pode ser negativo')
  }

  const cashAmount = Money.sum(
    payments.filter((payment) => payment.method === 'cash').map((payment) => payment.amount),
  )

  if (cashAmount.isZero()) {
    return Money.zero()
  }

  const otherAmount = Money.sum(
    payments.filter((payment) => payment.method !== 'cash').map((payment) => payment.amount),
  )

  /* O que o dinheiro precisa cobrir depois das outras formas. */
  const remaining = total.subtract(otherAmount)

  if (remaining.isNegative()) {
    throw new DomainError(
      'PAYMENT_TOTAL_MISMATCH',
      `As formas sem troco (${otherAmount.format()}) ja passam do total (${total.format()})`,
    )
  }

  const change = cashAmount.subtract(remaining)

  if (change.isNegative()) {
    throw new DomainError(
      'PAYMENT_TOTAL_MISMATCH',
      `Faltam ${change.format().replace('-', '')} para fechar a venda`,
    )
  }

  return change
}
