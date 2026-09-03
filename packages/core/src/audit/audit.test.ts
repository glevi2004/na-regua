import { describe, expect, it } from 'vitest'
import { camposAlterados } from './changed-fields.js'
import { InMemoryAuditTrail } from './fakes.js'

describe('campos alterados — RF-123', () => {
  it('devolve so o que mudou, nao o registro inteiro', () => {
    const r = camposAlterados(
      { name: 'Marta', phone: '41999990000', email: 'm@x.com' },
      { name: 'Marta Souza', phone: '41999990000', email: 'm@x.com' },
    )

    expect(Object.keys(r!.before)).toEqual(['name'])
    expect(r!.before.name).toBe('Marta')
    expect(r!.after.name).toBe('Marta Souza')
  })

  /* Trilha longa demais deixa de ser lida, que e o mesmo que nao existir. */
  it('devolve nulo quando nada mudou', () => {
    expect(camposAlterados({ name: 'Marta' }, { name: 'Marta' })).toBeNull()
  })

  it('campo que sumiu tambem e mudanca', () => {
    const r = camposAlterados({ notes: 'fiado ate dia 10' }, {})

    expect(r!.before.notes).toBe('fiado ate dia 10')
    expect(r!.after.notes).toBeNull()
  })

  it('campo que apareceu tambem e mudanca', () => {
    const r = camposAlterados({}, { notes: 'novo' })

    expect(r!.before.notes).toBeNull()
    expect(r!.after.notes).toBe('novo')
  })

  /* `JSON.stringify` APAGA chave com valor undefined. Sem a normalizacao, "o
     campo passou a nao existir" viraria "o campo nunca esteve aqui". */
  it('undefined vira nulo, para sobreviver a serializacao', () => {
    const r = camposAlterados({ phone: '41999990000' }, { phone: undefined })

    expect(r!.after.phone).toBeNull()
    expect(JSON.parse(JSON.stringify(r!.after))).toHaveProperty('phone')
  })

  it('data vira texto ISO, e data igual nao conta como mudanca', () => {
    const mesmo = camposAlterados(
      { dueAt: new Date('2026-09-02T12:00:00Z') },
      { dueAt: new Date('2026-09-02T12:00:00Z') },
    )
    expect(mesmo).toBeNull()

    const mudou = camposAlterados(
      { dueAt: new Date('2026-09-02T12:00:00Z') },
      { dueAt: new Date('2026-09-03T12:00:00Z') },
    )
    expect(mudou!.after.dueAt).toBe('2026-09-03T12:00:00.000Z')
  })

  it('zero e falso sao valores, nao ausencia', () => {
    const r = camposAlterados({ walletBalanceCents: 500 }, { walletBalanceCents: 0 })

    expect(r!.after.walletBalanceCents).toBe(0)
  })

  it('distingue nulo de zero', () => {
    const r = camposAlterados({ stockQuantity: null }, { stockQuantity: 0 })

    expect(r!.before.stockQuantity).toBeNull()
    expect(r!.after.stockQuantity).toBe(0)
  })
})

describe('trilha em memoria', () => {
  const entrada = {
    companyId: 'empresa-1',
    entity: 'Product',
    entityId: 'prod-1',
    action: 'updated' as const,
    actorId: 'joana',
    channel: 'app' as const,
    occurredAt: new Date('2026-09-02T12:00:00Z'),
    before: { stockQuantity: 20 },
    after: { stockQuantity: 18 },
  }

  it('guarda autor, canal e data — o trio da US-061', async () => {
    const trilha = new InMemoryAuditTrail()

    const gravada = await trilha.record(entrada)

    expect(gravada.actorId).toBe('joana')
    expect(gravada.channel).toBe('app')
    expect(gravada.occurredAt).toBe('2026-09-02T12:00:00.000Z')
  })

  /* O canal distingue app de WhatsApp, e e por isso que ele vive no
     ExecutionContext e nao no handler HTTP. */
  it('registra o WhatsApp como canal, do mesmo jeito', async () => {
    const trilha = new InMemoryAuditTrail()

    const gravada = await trilha.record({ ...entrada, channel: 'whatsapp' })

    expect(gravada.channel).toBe('whatsapp')
  })

  it('uma empresa nao enxerga a trilha da outra', async () => {
    const trilha = new InMemoryAuditTrail()
    await trilha.record(entrada)
    await trilha.record({ ...entrada, companyId: 'empresa-2' })

    expect(trilha.daEmpresa('empresa-1')).toHaveLength(1)
    expect(trilha.total).toBe(2)
  })

  /**
   * A porta nao tem `update` nem `delete`, e a ausencia e a especificacao:
   * trilha que aceita correcao deixa de ser prova. O banco impoe o mesmo por
   * gatilho — ver `0007_auditoria.sql` e `audit.test.ts` em `db`.
   */
  it('a porta nao oferece jeito de alterar nem de apagar', () => {
    const trilha = new InMemoryAuditTrail()

    expect(Object.keys(trilha)).not.toContain('update')
    expect('update' in trilha).toBe(false)
    expect('delete' in trilha).toBe(false)
  })
})
