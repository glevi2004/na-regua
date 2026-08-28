export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'unknown'

export type CardFeeRate = {
  readonly brand: CardBrand
  readonly installments: number
  /** Em pontos por cem: 3.49 = 3,49%. */
  readonly feeRatePercent: number
}

/**
 * Tabela configurada por empresa. Nao vem da API no fechamento da venda —
 * RNF-003, RNF-041, NR-004. Quem alimenta (lojista ou PagMaxx) e outro modulo.
 */
export type CardFeeTable = {
  readonly rates: readonly CardFeeRate[]
  /** Dias ate o primeiro repasse; parcela N vence em N * settlementDays. D6 */
  readonly settlementDays?: number
}

export const DEFAULT_SETTLEMENT_DAYS = 30
export const MAX_CREDIT_INSTALLMENTS = 21
