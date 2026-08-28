import { DomainError } from './domain-error.js'
import type { CardBrand, CardFeeRate, CardFeeTable } from './types/card-fee-table.js'
import type { PaymentInput } from './types/payment-input.js'
import { Money } from '@na-regua/money'

function findRate(
  rates: readonly CardFeeRate[],
  brand: CardBrand,
  installments: number,
): CardFeeRate | undefined {
  return rates.find((rate) => rate.brand === brand && rate.installments === installments)
}

/**
 * Resolve a tarifa. Bandeira ausente/desconhecida cai na taxa conservadora
 * (entrada `unknown` ou a pior taxa daquele numero de parcelas) — D5.
 */
export function lookupCardFeeRate(
  table: CardFeeTable,
  brand: CardBrand | undefined,
  installments: number,
): CardFeeRate {
  const requested = brand ?? 'unknown'
  const exact = findRate(table.rates, requested, installments)
  if (exact !== undefined) {
    return exact
  }

  if (requested !== 'unknown') {
    const unknown = findRate(table.rates, 'unknown', installments)
    if (unknown !== undefined) {
      return unknown
    }
  }

  const sameInstallments = table.rates.filter((rate) => rate.installments === installments)
  const worst = sameInstallments.reduce<CardFeeRate | undefined>((current, rate) => {
    if (current === undefined || rate.feeRatePercent > current.feeRatePercent) {
      return rate
    }
    return current
  }, undefined)

  if (worst === undefined) {
    throw new DomainError(
      'CARD_FEE_NOT_FOUND',
      `Nao ha tarifa configurada para ${requested} em ${installments}x`,
    )
  }
  return worst
}

export function isCardPayment(method: PaymentInput['method']): boolean {
  return method === 'debit' || method === 'credit'
}

/** Tarifa sobre o valor informado (1x debito, ou uma parcela). D8, D9 */
export function calculateCardFeeAmount(
  amount: Money,
  table: CardFeeTable,
  brand: CardBrand | undefined,
  installments: number,
): Money {
  const rate = lookupCardFeeRate(table, brand, installments)
  return amount.percentage(rate.feeRatePercent)
}
