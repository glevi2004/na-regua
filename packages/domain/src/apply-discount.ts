import { Money } from '@na-regua/money'
import { DomainError } from './domain-error.js'
import type { Discount, DiscountPolicy, DiscountResult } from './types/discount.js'

/**
 * Percentual efetivo sobre a base, em pontos por cem, truncado em 4 casas.
 *
 * Mesma escala e mesmo truncamento de `marginRatePercent` em
 * calculate-sale-totals: duas medidas de percentual no mesmo sistema com
 * arredondamentos diferentes geram divergencia de centavo entre telas.
 */
function effectiveRatePercent(discountAmount: Money, base: Money): number {
  if (base.isZero()) {
    return 0
  }
  const scaled = (discountAmount.cents * 1_000_000n) / base.cents
  return Number(scaled) / 10_000
}

function resolveDiscountAmount(base: Money, discount: Discount): Money {
  if (discount.kind === 'amount') {
    return discount.amount
  }

  if (!Number.isFinite(discount.rate) || discount.rate < 0 || discount.rate > 100) {
    throw new DomainError(
      'INVALID_DISCOUNT',
      `Percentual de desconto invalido: ${discount.rate}. Use um valor entre 0 e 100`,
    )
  }

  return base.percentage(discount.rate)
}

/**
 * Aplica desconto e recusa o que passa do permitido — RF-030, RF-031.
 *
 * Serve tanto para o item quanto para a venda: a diferenca esta na base que se
 * passa, nao na regra. Quem compoe as duas coisas e `core` (NR-022) — aqui
 * entra dado e sai dado, como manda a fronteira do pacote.
 *
 * As duas recusas existem por motivos diferentes:
 *
 * - desconto maior que a base viraria total negativo, ou seja, a loja pagando
 *   para vender;
 * - desconto acima do teto do papel e alcada: o `staff` com limite de 10% que
 *   tenta 15% precisa ser bloqueado com o motivo, nao silenciosamente cortado
 *   no teto (US-016).
 */
export function applyDiscount(
  base: Money,
  discount: Discount,
  policy: DiscountPolicy,
): DiscountResult {
  if (base.isNegative()) {
    throw new DomainError('INVALID_DISCOUNT', 'A base do desconto nao pode ser negativa')
  }

  const discountAmount = resolveDiscountAmount(base, discount)

  if (discountAmount.isNegative()) {
    throw new DomainError('INVALID_DISCOUNT', 'O desconto nao pode ser negativo')
  }

  if (discountAmount.compare(base) === 1) {
    throw new DomainError(
      'DISCOUNT_EXCEEDS_TOTAL',
      `Desconto de ${discountAmount.format()} e maior que o total de ${base.format()}`,
    )
  }

  const effectiveRate = effectiveRatePercent(discountAmount, base)

  if (!Number.isFinite(policy.maxDiscountRate) || policy.maxDiscountRate < 0) {
    throw new DomainError(
      'INVALID_DISCOUNT',
      `Limite de desconto invalido: ${policy.maxDiscountRate}`,
    )
  }

  if (effectiveRate > policy.maxDiscountRate) {
    throw new DomainError(
      'DISCOUNT_ABOVE_ROLE_LIMIT',
      `Desconto de ${effectiveRate}% acima do limite de ${policy.maxDiscountRate}% do seu perfil`,
    )
  }

  return {
    discountAmount,
    total: base.subtract(discountAmount),
    effectiveRate,
  }
}
