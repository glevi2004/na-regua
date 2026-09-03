import type { AuditEntryOutput } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'
import type { AuditTrail, NewAuditEntry } from '../ports/audit-trail.js'

/**
 * Trilha em memoria — somente insercao, como a de verdade.
 *
 * O array e exposto como leitura para o teste conferir o que foi gravado, e nao
 * ha metodo nenhum para apagar ou corrigir. Um falso que permitisse alterar
 * deixaria passar um caso de uso que altera, e o teste diria que a propriedade
 * de somente-insercao existe quando so o banco a teria.
 */
export class InMemoryAuditTrail implements AuditTrail {
  private readonly entradas: (AuditEntryOutput & { readonly companyId: CompanyId })[] = []
  private sequencia = 0
  /** Liga para simular a trilha indisponivel no meio da transacao. */
  falharAoGravar = false

  async record(entrada: NewAuditEntry): Promise<AuditEntryOutput> {
    if (this.falharAoGravar) throw new Error('trilha de auditoria indisponivel')

    this.sequencia += 1
    const gravada = {
      id: `aud-${this.sequencia}`,
      companyId: entrada.companyId,
      entity: entrada.entity,
      entityId: entrada.entityId,
      action: entrada.action,
      actorId: entrada.actorId,
      channel: entrada.channel,
      occurredAt: entrada.occurredAt.toISOString(),
      before: entrada.before,
      after: entrada.after,
    }
    this.entradas.push(gravada)
    return gravada
  }

  /** O que a empresa do contexto enxerga. Filtra de verdade — RLS em memoria. */
  daEmpresa(companyId: CompanyId): readonly AuditEntryOutput[] {
    return this.entradas.filter((e) => e.companyId === companyId)
  }

  get total(): number {
    return this.entradas.length
  }
}
