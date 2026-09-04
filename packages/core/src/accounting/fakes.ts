import type { AccountOutput, EntryKind } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'
import type {
  ChartOfAccountsRepository,
  LancamentoClassificado,
  NewAccount,
} from '../ports/chart-of-accounts.js'
import { type ContaPadrao, PLANO_DE_CONTAS_PADRAO } from './default-chart.js'

/**
 * Plano de contas em memoria, com filtro por empresa de verdade.
 *
 * `historyFor` ORDENA por contagem aqui tambem, como o repositorio real faria:
 * um falso que devolvesse na ordem de insercao deixaria passar um caso de uso
 * que assume ordenacao sem pedir, e o teste da sugestao passaria por acidente.
 */

type ContaGuardada = AccountOutput & { readonly companyId: CompanyId }

type Classificacao = {
  readonly companyId: CompanyId
  readonly entryKind: EntryKind
  readonly entryId: string
  readonly accountId: string
  readonly counterparty: string
}

export class InMemoryChartOfAccounts implements ChartOfAccountsRepository {
  private contas: ContaGuardada[] = []
  private classificacoes: Classificacao[] = []
  private lancamentos: (LancamentoClassificado & { readonly companyId: CompanyId })[] = []
  private sequencia = 0

  /**
   * O metodo da PORTA, que o onboarding chama — RF-081.
   *
   * Idempotente por nome, como o `ON CONFLICT` do repositorio de verdade. Um
   * falso que aceitasse repetido deixaria passar uma semeadura chamada duas
   * vezes: o teste ficaria verde e o lojista veria o plano em dobro.
   */
  async insertDefaults(
    companyId: CompanyId,
    contas: readonly ContaPadrao[],
    _createdBy: string,
    _createdAt: Date,
  ): Promise<number> {
    let entraram = 0

    for (const c of contas) {
      const existe = this.contas.some(
        (x) => x.companyId === companyId && x.name.toLowerCase() === c.name.toLowerCase(),
      )
      if (existe) continue

      this.sequencia += 1
      this.contas.push({
        id: `acc-${this.sequencia}`,
        companyId,
        name: c.name,
        type: c.type,
        isDefault: true,
      })
      entraram += 1
    }

    return entraram
  }

  /** Atalho de teste: o mesmo plano, sem precisar do contexto do onboarding. */
  semearPadrao(companyId: CompanyId): void {
    for (const c of PLANO_DE_CONTAS_PADRAO) {
      this.sequencia += 1
      this.contas.push({
        id: `acc-${this.sequencia}`,
        companyId,
        name: c.name,
        type: c.type,
        isDefault: true,
      })
    }
  }

  contaPorNome(companyId: CompanyId, name: string): AccountOutput | undefined {
    return this.contas.find((c) => c.companyId === companyId && c.name === name)
  }

  adicionarLancamento(companyId: CompanyId, l: LancamentoClassificado): void {
    this.lancamentos.push({ ...l, companyId })
  }

  /** Registra historico de contraparte, base da sugestao. */
  registrarHistorico(
    companyId: CompanyId,
    entryKind: EntryKind,
    counterparty: string,
    accountId: string,
    vezes = 1,
  ): void {
    for (let i = 0; i < vezes; i += 1) {
      this.sequencia += 1
      this.classificacoes.push({
        companyId,
        entryKind,
        entryId: `ent-${this.sequencia}`,
        accountId,
        counterparty,
      })
    }
  }

  async list(companyId: CompanyId): Promise<readonly AccountOutput[]> {
    return this.contas.filter((c) => c.companyId === companyId)
  }

  async findById(companyId: CompanyId, accountId: string): Promise<AccountOutput | undefined> {
    return this.contas.find((c) => c.companyId === companyId && c.id === accountId)
  }

  async findByName(companyId: CompanyId, name: string): Promise<AccountOutput | undefined> {
    return this.contaPorNome(companyId, name)
  }

  async insert(conta: NewAccount): Promise<AccountOutput> {
    this.sequencia += 1
    const nova: ContaGuardada = {
      id: `acc-${this.sequencia}`,
      companyId: conta.companyId,
      name: conta.name,
      type: conta.type,
      isDefault: conta.isDefault,
    }
    this.contas.push(nova)
    return nova
  }

  async rename(companyId: CompanyId, accountId: string, name: string): Promise<AccountOutput> {
    this.contas = this.contas.map((c) =>
      c.companyId === companyId && c.id === accountId ? { ...c, name } : c,
    )
    return (await this.findById(companyId, accountId))!
  }

  async remove(companyId: CompanyId, accountId: string): Promise<void> {
    this.contas = this.contas.filter((c) => !(c.companyId === companyId && c.id === accountId))
  }

  async countEntries(companyId: CompanyId, accountId: string): Promise<number> {
    return this.classificacoes.filter((c) => c.companyId === companyId && c.accountId === accountId)
      .length
  }

  async classify(
    companyId: CompanyId,
    entryKind: EntryKind,
    entryId: string,
    accountId: string,
  ): Promise<void> {
    this.classificacoes.push({ companyId, entryKind, entryId, accountId, counterparty: '' })
  }

  async historyFor(
    companyId: CompanyId,
    entryKind: EntryKind,
    counterparty: string,
  ): Promise<readonly { accountId: string; accountName: string; times: number }[]> {
    const contagem = new Map<string, number>()
    for (const c of this.classificacoes) {
      if (c.companyId !== companyId || c.entryKind !== entryKind) continue
      if (c.counterparty !== counterparty) continue
      contagem.set(c.accountId, (contagem.get(c.accountId) ?? 0) + 1)
    }
    return (
      [...contagem.entries()]
        .map(([accountId, times]) => ({
          accountId,
          accountName: this.contas.find((c) => c.id === accountId)?.name ?? '',
          times,
        }))
        /* Da mais usada para a menos, como o repositorio real. */
        .sort((a, b) => b.times - a.times)
    )
  }

  async entriesBetween(
    companyId: CompanyId,
    from: string,
    to: string,
  ): Promise<readonly LancamentoClassificado[]> {
    return this.lancamentos.filter(
      (l) => l.companyId === companyId && l.occurredOn >= from && l.occurredOn <= to,
    )
  }
}
