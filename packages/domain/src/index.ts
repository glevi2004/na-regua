/**
 * Regras de negocio puras: precificacao, imposto, tarifa de cartao, parcelamento.
 *
 * Sem I/O, sem framework, sem relogio, sem aleatoriedade — tudo entra por
 * parametro. Ver docs/arquitetura/principios.md#2-domain-e-puro
 */
export { calculateInstallmentPlan } from './calculate-installment-plan.js'
export { calculateSaleTotals } from './calculate-sale-totals.js'
export { DomainError } from './domain-error.js'
export type { DomainErrorCode } from './domain-error.js'
export { DEFAULT_SETTLEMENT_DAYS, MAX_CREDIT_INSTALLMENTS } from './types/card-fee-table.js'
export type { CardBrand, CardFeeRate, CardFeeTable } from './types/card-fee-table.js'
export type { Installment, InstallmentPlan } from './types/installment-plan.js'
export type { PaymentInput, PaymentMethod } from './types/payment-input.js'
export type { SaleItemInput } from './types/sale-item-input.js'
export type { SaleTotals } from './types/sale-totals.js'
export type { TaxRegime, TaxRules } from './types/tax-rules.js'
