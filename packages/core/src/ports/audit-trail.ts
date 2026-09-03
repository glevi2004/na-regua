import type { AuditAction, AuditEntryOutput, AuditValues } from '@na-regua/contracts'
import type { Channel, CompanyId, UserId } from '../context.js'

/**
 * Porta da trilha de auditoria — NR-025, RF-123.
 *
 * **Somente insercao.** Nao ha `update` nem `delete` nesta porta, e a ausencia
 * e a especificacao: trilha que aceita correcao deixa de ser prova. O banco
 * impoe o mesmo por gatilho (RF-124, `0007_auditoria.sql`), porque uma regra
 * que so existe no tipo e uma regra que o proximo `psql` ignora.
 */

export type NewAuditEntry = {
  readonly companyId: CompanyId
  /** Nome da entidade no glossario: `Customer`, `Sale`, `Product`. */
  readonly entity: string
  readonly entityId: string
  readonly action: AuditAction
  readonly actorId: UserId
  readonly channel: Channel
  readonly occurredAt: Date
  readonly before: AuditValues | null
  readonly after: AuditValues | null
}

export type AuditTrail = {
  record(entrada: NewAuditEntry): Promise<AuditEntryOutput>
}

/**
 * Trilha que participa da transacao do caso de uso.
 *
 * Separada da porta acima porque as duas situacoes sao diferentes de verdade:
 *
 * - Ajustar estoque e registrar o ajuste precisam entrar **juntos**. Saldo
 *   mudado sem trilha e a trilha mentindo.
 * - Registrar que alguem consultou um relatorio nao precisa de transacao
 *   nenhuma.
 *
 * Quem implementa decide se sao o mesmo objeto; quem chama declara qual das
 * duas precisa, e a assinatura passa a dizer isso em vez de deixar implicito.
 */
export type TransactionalAuditTrail = AuditTrail
