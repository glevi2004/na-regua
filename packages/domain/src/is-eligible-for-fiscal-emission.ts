import type { TaxRegime } from './types/tax-rules.js'

export type FiscalEligibilityInput = {
  readonly taxRegime: TaxRegime
  readonly optedReformaHibrida: boolean
}

/**
 * NFC-e e NFS-e Nacional: so MEI ou Simples que nao optou pelo Hibrido
 * (IBS/CBS no regime regular, LC 214/2025). RF-146, DEC-017.
 *
 * Inelegivel ainda usa o ERP; a recusa e na Focus e na fila de nota.
 */
export function isEligibleForFiscalEmission(input: FiscalEligibilityInput): boolean {
  if (input.optedReformaHibrida) {
    return false
  }
  return input.taxRegime === 'mei' || input.taxRegime === 'simples_nacional'
}
