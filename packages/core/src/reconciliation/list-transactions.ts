import type { BankTransactionListItem, ListBankTransactionsInput } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import type { ReconciliationQueries } from '../ports/reconciliation-repository.js'

export type ListBankTransactionsDeps = ReconciliationQueries

/**
 * A fila de conciliacao — NR-076, base das RF-078 a RF-080.
 *
 * Leitura: nao passa por `assertCanWrite`. `accountant` e somente leitura e e
 * exatamente quem abre esta tela — conciliar de olho e metade do trabalho dele.
 *
 * Nao devolve sugestao junto. A tentacao e obvia: a tela mostra a fila e, para
 * cada linha, o que casa com ela, entao por que nao vir tudo de uma vez? Porque
 * sugerir custa uma consulta de candidatos POR transacao, e um extrato mensal
 * tem centenas de linhas das quais o lojista abre umas poucas. A sugestao e um
 * pedido separado (RF-078), feito quando ele escolhe a linha.
 */
export async function listBankTransactions(
  deps: ListBankTransactionsDeps,
  ctx: ExecutionContext,
  input: ListBankTransactionsInput,
): Promise<{
  readonly transactions: readonly BankTransactionListItem[]
  /**
   * Quantas faltam conferir, sempre — mesmo no recorte das conciliadas.
   *
   * O numero e o que leva o lojista de volta ao trabalho. Sem ele, quem abre a
   * aba "conciliadas" ve uma lista cheia e sai com a impressao de que acabou.
   */
  readonly pendingCount: number
}> {
  const transactions = await deps.listTransactions(ctx.companyId, input.scope)

  const pendentes =
    input.scope === 'pending' ? transactions : await deps.listTransactions(ctx.companyId, 'pending')

  return { transactions, pendingCount: pendentes.length }
}
