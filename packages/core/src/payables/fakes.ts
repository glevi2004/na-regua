import type { PayableOutput } from '@na-regua/contracts'
import type { CompanyId, UserId } from '../context.js'
import type {
  IdGenerator,
  NewPayable,
  PayableFilter,
  PayableQueries,
  PayableTransaction,
  PayableUnitOfWork,
} from '../ports/payable-repository.js'

/**
 * Contas a pagar em memoria, com rollback e filtro por empresa de verdade.
 *
 * Como nos outros falsos do pacote: um que apenas acumulasse em array passaria
 * no teste de atomicidade sem ter atomicidade, e um que ignorasse `companyId`
 * faria o teste de isolamento medir o vazio.
 */

type Guardada = PayableOutput & {
  readonly companyId: CompanyId
  readonly createdBy: UserId
}

export class InMemoryPayables implements PayableUnitOfWork, PayableQueries, IdGenerator {
  private readonly contas: Guardada[] = []
  private sequencia = 0
  private sequenciaId = 0
  /** Liga para simular falha depois de gravar as ocorrencias. */
  falharDepoisDeGravar = false

  /** Ids previsiveis: o teste precisa saber o que vai sair para afirmar algo. */
  next(): string {
    this.sequenciaId += 1
    return `rec-${this.sequenciaId}`
  }

  todas(companyId: CompanyId): readonly PayableOutput[] {
    return this.contas.filter((c) => c.companyId === companyId)
  }

  async list(companyId: CompanyId, filtro: PayableFilter): Promise<readonly PayableOutput[]> {
    return this.contas.filter(
      (c) =>
        c.companyId === companyId &&
        (filtro.status === undefined || filtro.status.includes(c.status)),
    )
  }

  async transaction<T>(
    companyId: CompanyId,
    fn: (tx: PayableTransaction) => Promise<T>,
  ): Promise<T> {
    const antes = [...this.contas]
    const sequenciaAntes = this.sequencia

    try {
      return await fn(this.escopo(companyId))
    } catch (erro) {
      this.contas.length = 0
      this.contas.push(...antes)
      this.sequencia = sequenciaAntes
      throw erro
    }
  }

  /* O escopo nao usa o `companyId` da transacao: cada metodo da porta ja o
     recebe, e e por ele que o filtro acontece. Manter os dois seria dar duas
     fontes para a mesma verdade — e a hora em que elas discordarem e um
     vazamento entre lojas. */
  private escopo(_companyId: CompanyId): PayableTransaction {
    return {
      insertMany: async (novas: readonly NewPayable[]) => {
        const gravadas = novas.map((n) => {
          this.sequencia += 1
          const g: Guardada = {
            id: `pay-${this.sequencia}`,
            companyId: n.companyId,
            supplier: n.supplier,
            description: n.description,
            amountCents: n.amountCents,
            settledAmountCents: 0,
            dueDate: n.dueDate,
            status: 'open',
            attachmentKey: n.attachmentKey,
            category: n.category,
            recurrenceId: n.recurrenceId,
            occurrenceNumber: n.occurrenceNumber,
            occurrenceCount: n.occurrenceCount,
            createdAt: n.createdAt.toISOString(),
            createdBy: n.createdBy,
          }
          this.contas.push(g)
          return g
        })

        if (this.falharDepoisDeGravar) {
          throw new Error('falha simulada depois de gravar as ocorrencias')
        }

        return gravadas
      },

      cancelFutureOccurrences: async (empresa, recurrenceId, aPartirDe) => {
        let canceladas = 0
        for (let i = 0; i < this.contas.length; i += 1) {
          const c = this.contas[i]!
          const alvo =
            c.companyId === empresa &&
            c.recurrenceId === recurrenceId &&
            c.status === 'open' &&
            /* Estritamente DEPOIS de hoje: a que vence hoje continua devida. */
            c.dueDate > aPartirDe
          if (!alvo) continue
          this.contas[i] = { ...c, status: 'cancelled' }
          canceladas += 1
        }
        return canceladas
      },

      findByRecurrence: async (empresa, recurrenceId) =>
        this.contas.filter((c) => c.companyId === empresa && c.recurrenceId === recurrenceId),
    }
  }
}
