import { describe, expect, it } from 'vitest'
import { calculateInstallmentPlan } from './calculate-installment-plan.js'
import { DomainError } from './domain-error.js'
import type { CardFeeTable } from './types/card-fee-table.js'
import type { PaymentInput } from './types/payment-input.js'
import { Money } from '@na-regua/money'

const at = new Date('2026-01-15T12:00:00.000Z')

const table: CardFeeTable = {
  rates: [
    { brand: 'visa', installments: 1, feeRatePercent: 3 },
    { brand: 'visa', installments: 3, feeRatePercent: 3 },
    { brand: 'unknown', installments: 1, feeRatePercent: 3 },
    { brand: 'unknown', installments: 3, feeRatePercent: 3 },
  ],
  settlementDays: 30,
}

function credit(amount: string, installments: number): PaymentInput {
  return {
    method: 'credit',
    amount: Money.parse(amount),
    installments,
    brand: 'visa',
  }
}

describe('calculateInstallmentPlan — RF-038 / US-019', () => {
  it('cria 3 parcelas com vencimento e tarifa de cada uma', () => {
    const plan = calculateInstallmentPlan(credit('300.00', 3), table, at)

    expect(plan.installments).toHaveLength(3)
    expect(plan.installments.map((item) => item.grossAmount.toDecimalString())).toEqual([
      '100.00',
      '100.00',
      '100.00',
    ])
    expect(plan.installments.map((item) => item.cardFeeAmount.toDecimalString())).toEqual([
      '3.00',
      '3.00',
      '3.00',
    ])
    expect(plan.installments.map((item) => item.netAmount.toDecimalString())).toEqual([
      '97.00',
      '97.00',
      '97.00',
    ])
    expect(plan.installments.map((item) => item.dueDate.toISOString())).toEqual([
      '2026-02-14T12:00:00.000Z',
      '2026-03-16T12:00:00.000Z',
      '2026-04-15T12:00:00.000Z',
    ])
  })

  it('distribui o resto na primeira parcela — R$ 100 em 3x', () => {
    const plan = calculateInstallmentPlan(credit('100.00', 3), table, at)
    expect(plan.installments.map((item) => item.grossAmount.toDecimalString())).toEqual([
      '33.34',
      '33.33',
      '33.33',
    ])
    expect(Money.sum(plan.installments.map((item) => item.grossAmount)).toDecimalString()).toBe(
      '100.00',
    )
  })

  it('soma das parcelas e sempre o total, para qualquer valor e numero de parcelas — RNF-045', () => {
    const wideTable: CardFeeTable = {
      rates: Array.from({ length: 12 }, (_, index) => ({
        brand: 'visa' as const,
        installments: index + 1,
        feeRatePercent: 3,
      })),
    }

    for (let cents = 0; cents <= 200; cents++) {
      for (let parts = 1; parts <= 12; parts++) {
        const payment: PaymentInput = {
          method: 'credit',
          amount: Money.fromCents(cents),
          installments: parts,
          brand: 'visa',
        }
        const plan = calculateInstallmentPlan(payment, wideTable, at)
        expect(Money.sum(plan.installments.map((item) => item.grossAmount)).cents).toBe(
          payment.amount.cents,
        )
        for (const installment of plan.installments) {
          expect(
            installment.netAmount.add(installment.cardFeeAmount).equals(installment.grossAmount),
          ).toBe(true)
        }
      }
    }
  })

  it('recusa pagamento que nao e credito', () => {
    const pix: PaymentInput = { method: 'pix', amount: Money.parse('10.00') }
    expect(() => calculateInstallmentPlan(pix, table, at)).toThrow(DomainError)
    try {
      calculateInstallmentPlan(pix, table, at)
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_CREDIT_PAYMENT' })
    }
  })

  it('usa 30 dias de repasse quando a tabela nao informa settlementDays — D6', () => {
    const plan = calculateInstallmentPlan(credit('100.00', 1), { rates: table.rates }, at)
    expect(plan.installments[0]?.dueDate.toISOString()).toBe('2026-02-14T12:00:00.000Z')
  })

  it('recusa numero de parcelas invalido', () => {
    expect(() => calculateInstallmentPlan(credit('100.00', 0), table, at)).toThrow(DomainError)
    expect(() => calculateInstallmentPlan(credit('100.00', 22), table, at)).toThrow(DomainError)
  })
})
