import { describe, expect, it } from 'vitest'
import { isEligibleForFiscalEmission } from './is-eligible-for-fiscal-emission.js'
import type { TaxRegime } from './types/tax-rules.js'

const regimes: readonly TaxRegime[] = ['mei', 'simples_nacional', 'lucro_presumido', 'lucro_real']

describe('isEligibleForFiscalEmission — RF-146', () => {
  it.each(regimes)('recusa %s que optou pelo Hibrido', (taxRegime) => {
    expect(isEligibleForFiscalEmission({ taxRegime, optedReformaHibrida: true })).toBe(false)
  })

  it.each(['mei', 'simples_nacional'] as const)('aceita %s sem Hibrido', (taxRegime) => {
    expect(isEligibleForFiscalEmission({ taxRegime, optedReformaHibrida: false })).toBe(true)
  })

  it.each(['lucro_presumido', 'lucro_real'] as const)(
    'recusa %s mesmo sem Hibrido',
    (taxRegime) => {
      expect(isEligibleForFiscalEmission({ taxRegime, optedReformaHibrida: false })).toBe(false)
    },
  )
})
