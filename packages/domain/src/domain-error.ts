/**
 * Erro de negocio tipado. Quem chama (core) distingue o codigo, nao a string.
 * Ver docs/engenharia/code-style.md#tratamento-de-erro
 */
export type DomainErrorCode =
  | 'EMPTY_ITEMS'
  | 'EMPTY_PAYMENTS'
  | 'PAYMENT_TOTAL_MISMATCH'
  | 'INVALID_INSTALLMENTS'
  | 'INVALID_QUANTITY'
  | 'CARD_FEE_NOT_FOUND'
  | 'NOT_CREDIT_PAYMENT'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}
