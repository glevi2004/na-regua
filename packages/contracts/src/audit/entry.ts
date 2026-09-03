import { z } from 'zod'
import { idSchema } from '../common/primitives.js'

/** Trilha de auditoria — RF-123, RF-124. US-061. */

/**
 * O que aconteceu com o registro.
 *
 * `deleted` existe para o caso em que exclusao logica acontece (RNF-040 manda
 * cancelar, nao apagar, mas cliente e produto tem `deleted_at`). Exclusao
 * fisica nao aparece aqui porque nao acontece — se um dia acontecer, a trilha
 * nao seria o lugar de descobrir.
 */
export const auditActionSchema = z.enum(['created', 'updated', 'deleted', 'cancelled'])

export type AuditAction = z.infer<typeof auditActionSchema>

/**
 * Valores antes e depois.
 *
 * Guardados como mapa de campo para valor, e nao como o registro inteiro: a
 * pergunta que a trilha responde e "o que mudou", e um retrato completo obriga
 * quem le a comparar dois JSONs grandes para achar o campo que interessa.
 *
 * `unknown` no valor de proposito — a trilha atravessa todas as entidades e nao
 * pode conhecer o tipo de cada campo. Quem grava ja validou; quem le exibe.
 */
export const auditValuesSchema = z.record(z.string(), z.unknown())

export type AuditValues = z.infer<typeof auditValuesSchema>

export const auditEntryOutputSchema = z.object({
  id: idSchema,
  /** Nome da entidade no glossario: `Customer`, `Sale`, `Product`. */
  entity: z.string(),
  entityId: idSchema,
  action: auditActionSchema,
  /**
   * Quem, por onde e quando — o trio que US-061 pede para resolver divergencia
   * com funcionario. `channel` distingue app de WhatsApp, e e por isso que ele
   * vive no `ExecutionContext` em vez de no handler HTTP.
   */
  actorId: idSchema,
  channel: z.string(),
  occurredAt: z.string(),
  /** Vazio em `created`: nao havia estado anterior. */
  before: auditValuesSchema.nullable(),
  /** Vazio em `deleted` fisico, que nao deve acontecer. */
  after: auditValuesSchema.nullable(),
})

export type AuditEntryOutput = z.infer<typeof auditEntryOutputSchema>
