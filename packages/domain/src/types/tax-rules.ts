/** Alinhado ao glossario. No MVP a aliquota e configurada, nao calculada. D4 */
export type TaxRegime = 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real'

export type TaxRules = {
  readonly regime: TaxRegime
  /** Aliquota padrao do regime, em pontos por cem (6 = 6%). RF-041 */
  readonly defaultRate: number
  /** Aliquota por produto; prevalece sobre defaultRate, perde para item.taxRate. D3 */
  readonly productRates?: Readonly<Record<string, number>>
}
