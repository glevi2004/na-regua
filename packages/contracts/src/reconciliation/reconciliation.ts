import { z } from 'zod'
import { entryKindSchema } from '../accounting/account.js'
import { dateSchema, idSchema, moneyCentsSchema } from '../common/primitives.js'

/** Conciliacao bancaria — RF-078 a RF-080. */

/**
 * Para onde o dinheiro foi.
 *
 * Direcao explicita, e nao valor com sinal, por dois motivos. O extrato de OFX
 * traz o sinal de formas diferentes entre bancos, e converter na importacao
 * apagaria a informacao de qual convencao veio. E, aqui dentro, `direction`
 * torna a regra legivel: debito casa com conta a pagar, credito com recebivel.
 * `amountCents < 0` obrigaria a lembrar dessa traducao em cada comparacao.
 */
export const bankTransactionDirectionSchema = z.enum(['debit', 'credit'])

export type BankTransactionDirection = z.infer<typeof bankTransactionDirectionSchema>

export const bankTransactionOutputSchema = z.object({
  id: idSchema,
  /**
   * Identificador do banco (FITID no OFX).
   *
   * E o que impede a mesma transacao de entrar duas vezes quando o lojista
   * sobe o extrato de novo — RF-074, RF-076.
   */
  externalId: z.string(),
  direction: bankTransactionDirectionSchema,
  /** Sempre positivo. Quem diz o sinal e `direction`. */
  amountCents: moneyCentsSchema,
  /** Data em que o banco lancou. */
  postedOn: dateSchema,
  description: z.string(),
  /** Quem pagou ou recebeu, quando o banco informa. */
  counterparty: z.string().nullable(),
  /** Nulos enquanto a transacao esta na fila. */
  reconciledEntryKind: entryKindSchema.nullable(),
  reconciledEntryId: idSchema.nullable(),
})

export type BankTransactionOutput = z.infer<typeof bankTransactionOutputSchema>

/** Pedir as sugestoes de uma transacao — RF-078. */
export const suggestMatchesInputSchema = z.object({ transactionId: idSchema }).strict()

export type SuggestMatchesInput = z.infer<typeof suggestMatchesInputSchema>

/** Casar transacao com lancamento existente — RF-079. */
export const reconcileInputSchema = z
  .object({
    transactionId: idSchema,
    entryKind: entryKindSchema,
    entryId: idSchema,
  })
  .strict()

export type ReconcileInput = z.infer<typeof reconcileInputSchema>

/**
 * Criar o lancamento a partir da transacao — RF-079.
 *
 * Valor e data saem da transacao e NAO entram aqui: sao o extrato, e deixar o
 * lojista digitar de novo abriria a chance de criar um lancamento que nao
 * corresponde a linha que ele esta conciliando. O que ele informa e o que o
 * banco nao sabe — o nome de quem esta do outro lado e para que serviu.
 */
export const createEntryFromTransactionInputSchema = z
  .object({
    transactionId: idSchema,
    counterparty: z.string().trim().min(2, 'Informe o fornecedor ou a origem.').max(140),
    description: z.string().trim().min(2, 'Descreva o lancamento.').max(200),
    /** Classificacao ja na criacao, opcional — RF-083. */
    accountId: idSchema.optional(),
  })
  .strict()

export type CreateEntryFromTransactionInput = z.infer<typeof createEntryFromTransactionInputSchema>

/** Desfazer — RF-080. */
export const undoReconciliationInputSchema = z
  .object({
    transactionId: idSchema,
    reason: z.string().trim().min(3, 'Diga por que esta desfazendo.').max(200),
  })
  .strict()

export type UndoReconciliationInput = z.infer<typeof undoReconciliationInputSchema>

/**
 * A fila da tela — NR-076.
 *
 * Dois recortes e nao um filtro livre: a tela de conciliacao tem exatamente
 * duas perguntas, "o que falta conferir" e "o que ja conferi" (esta segunda so
 * existe para poder desfazer, RF-080). Filtro livre convidaria cada tela a
 * inventar o proprio recorte, e a fila e a mesma para todo mundo.
 */
export const bankTransactionScopeSchema = z.enum(['pending', 'reconciled'])

export type BankTransactionScope = z.infer<typeof bankTransactionScopeSchema>

export const listBankTransactionsInputSchema = z
  .object({ scope: bankTransactionScopeSchema.default('pending') })
  .strict()

export type ListBankTransactionsInput = z.infer<typeof listBankTransactionsInputSchema>

/**
 * O lancamento com que a transacao foi conciliada, resumido.
 *
 * Existe para o desfazer ser uma decisao e nao um salto no escuro: "desfazer a
 * conciliacao de R$ 340,00" nao diz nada, e "desfazer — Energia, Enel, vence
 * 10/03" diz se e essa mesmo. Sao os tres campos que identificam o lancamento
 * para quem lancou, e nada alem.
 */
export const reconciledEntrySummarySchema = z.object({
  kind: entryKindSchema,
  id: idSchema,
  counterparty: z.string(),
  description: z.string(),
  dueDate: dateSchema,
})

export type ReconciledEntrySummary = z.infer<typeof reconciledEntrySummarySchema>

export const bankTransactionListItemSchema = bankTransactionOutputSchema.extend({
  /** Nulo na fila; preenchido no recorte das conciliadas. */
  reconciledWith: reconciledEntrySummarySchema.nullable(),
})

export type BankTransactionListItem = z.infer<typeof bankTransactionListItemSchema>
