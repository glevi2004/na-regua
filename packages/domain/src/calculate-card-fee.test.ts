import { describe, expect, it } from 'vitest'
import { calculateCardFeeAmount, lookupCardFeeRate } from './calculate-card-fee.js'
import { DomainError } from './domain-error.js'
import type { CardFeeTable } from './types/card-fee-table.js'
import { Money } from '@na-regua/money'

const table: CardFeeTable = {
  rates: [
    { brand: 'visa', installments: 1, feeRatePercent: 2 },
    { brand: 'visa', installments: 3, feeRatePercent: 3 },
    { brand: 'mastercard', installments: 3, feeRatePercent: 5 },
    { brand: 'unknown', installments: 1, feeRatePercent: 4 },
  ],
}

describe('lookupCardFeeRate — D5', () => {
  it('acerta a tarifa da bandeira e do numero de parcelas', () => {
    expect(lookupCardFeeRate(table, 'visa', 3).feeRatePercent).toBe(3)
  })

  it('bandeira ausente usa a entrada unknown', () => {
    expect(lookupCardFeeRate(table, undefined, 1).feeRatePercent).toBe(4)
  })

  it('bandeira desconhecida sem entrada unknown usa a pior taxa daquele parcelamento', () => {
    expect(lookupCardFeeRate(table, 'elo', 3).feeRatePercent).toBe(5)
  })

  it('entrada unknown ausente para aquele parcelamento tambem usa a pior taxa', () => {
    expect(lookupCardFeeRate(table, 'unknown', 3).feeRatePercent).toBe(5)
  })

  it('recusa quando nao ha tarifa para o numero de parcelas', () => {
    expect(() => lookupCardFeeRate(table, 'visa', 12)).toThrow(DomainError)
    try {
      lookupCardFeeRate(table, 'visa', 12)
    } catch (error) {
      expect(error).toMatchObject({ code: 'CARD_FEE_NOT_FOUND' })
    }
  })
})

describe('calculateCardFeeAmount', () => {
  it('aplica o percentual sobre o valor', () => {
    const fee = calculateCardFeeAmount(Money.parse('100.00'), table, 'visa', 1)
    expect(fee.toDecimalString()).toBe('2.00')
  })
})
