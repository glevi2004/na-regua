import type { ParsedBankTransaction, StatementParseResult } from '@na-regua/contracts'
import type { CompanyId, UserId } from '../context.js'

/**
 * Portas da importacao de extrato — NR-047, RF-076, RF-077.
 */

export type StatementFile = {
  readonly content: Uint8Array
  readonly filename: string
}

/**
 * Le o arquivo. Implementada por `banking`.
 *
 * **Sincrona, e devolve resultado em vez de lancar.** As duas coisas sao a
 * mesma decisao da RF-077: o arquivo e lido POR COMPLETO antes de qualquer
 * escrita, entao nao existe caminho em que metade das transacoes ja entrou
 * quando o problema aparece. Com excecao no meio da leitura, essa garantia
 * dependeria de quem chama lembrar de abrir transacao.
 */
export type StatementParser = {
  parse(arquivo: StatementFile): StatementParseResult
}

export type NewBankTransaction = ParsedBankTransaction & {
  readonly companyId: CompanyId
  readonly importedBy: UserId
  readonly importedAt: Date
}

export type BankTransactionWriter = {
  /**
   * Grava ignorando o que ja existe, e devolve quantas entraram.
   *
   * A deduplicacao e do BANCO, por indice unico em `(company_id,
   * external_id)`, e nao um `SELECT` antes do `INSERT`. Duas importacoes
   * simultaneas do mesmo arquivo — o lojista clicando duas vezes — passariam
   * as duas pelo `SELECT` e gravariam tudo em dobro. Quem decide e a escrita.
   *
   * Devolve a CONTAGEM e nao as linhas: quem chamou precisa dizer ao lojista
   * quantas entraram, nao o que entrou.
   */
  insertIgnoringDuplicates(transacoes: readonly NewBankTransaction[]): Promise<number>
}
