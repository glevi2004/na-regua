import { describe, expect, it } from 'vitest'
import { auditActionSchema, auditEntryOutputSchema } from './entry.js'

const base = {
  id: 'aud-1',
  entity: 'Product',
  entityId: 'prod-1',
  action: 'updated',
  actorId: 'joana',
  channel: 'app',
  occurredAt: '2026-09-02T12:00:00.000Z',
  before: { stockQuantity: 20 },
  after: { stockQuantity: 18 },
}

describe('entrada de auditoria — RF-123', () => {
  it('aceita a entrada completa', () => {
    expect(auditEntryOutputSchema.parse(base).actorId).toBe('joana')
  })

  /* `created` nao tem estado anterior — o CHECK do banco impoe o mesmo. */
  it('aceita antes nulo, para criacao', () => {
    expect(
      auditEntryOutputSchema.parse({ ...base, action: 'created', before: null }).before,
    ).toBeNull()
  })

  it.each(['created', 'updated', 'deleted', 'cancelled'])('aceita a acao %s', (a) => {
    expect(auditActionSchema.parse(a)).toBe(a)
  })

  it('recusa acao que nao existe', () => {
    expect(auditActionSchema.safeParse('mexeu').success).toBe(false)
  })

  /**
   * O valor e `unknown` de proposito: a trilha atravessa todas as entidades e
   * nao pode conhecer o tipo de cada campo. O que ela NAO pode e perder a
   * distincao entre nulo, zero e ausente.
   */
  it('guarda nulo e zero como valores distintos', () => {
    const r = auditEntryOutputSchema.parse({
      ...base,
      before: { stockQuantity: null },
      after: { stockQuantity: 0 },
    })

    expect(r.before).toEqual({ stockQuantity: null })
    expect(r.after).toEqual({ stockQuantity: 0 })
  })

  it('aceita valores de tipos diferentes no mesmo mapa', () => {
    const r = auditEntryOutputSchema.parse({
      ...base,
      after: { name: 'Marta', walletLimitCents: 5000, isActive: false },
    })

    expect(r.after).toEqual({ name: 'Marta', walletLimitCents: 5000, isActive: false })
  })

  it('exige autor — trilha sem autor nao resolve divergencia nenhuma', () => {
    const { actorId: _fora, ...semAutor } = base
    expect(auditEntryOutputSchema.safeParse(semAutor).success).toBe(false)
  })
})
