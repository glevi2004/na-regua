import type { CustomerRankingOutput, ProductRankingOutput, RankingInput } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import type { ReportRepository } from '../ports/report-repository.js'

export type RankingDeps = {
  readonly reports: ReportRepository
}

/**
 * Quem mais comprou e o que mais saiu — NR-077, US-041.
 *
 * Dois casos de uso e nao um com um parametro `tipo`: as duas listas nao tem a
 * mesma forma (cliente tem ultima compra, produto tem quantidade) e um retorno
 * generico obrigaria a tela a adivinhar qual metade veio preenchida.
 *
 * Leitura, sem `assertCanWrite`, pela mesma razao do DRE.
 *
 * A ordenacao e o corte pelo `limit` ficam no repositorio. Trazer o ano inteiro
 * para escolher dez linhas em memoria e o tipo de coisa que funciona no teste,
 * com tres vendas, e derruba a tela do lojista que vende cem por dia.
 */
export async function rankCustomers(
  deps: RankingDeps,
  ctx: ExecutionContext,
  input: RankingInput,
): Promise<CustomerRankingOutput> {
  const { posicoes, sobraCents } = await deps.reports.topCustomers(
    ctx.companyId,
    input.from,
    input.to,
    input.limit,
  )

  return {
    from: input.from,
    to: input.to,
    customers: [...posicoes],
    unidentifiedCents: sobraCents,
  }
}

export async function rankProducts(
  deps: RankingDeps,
  ctx: ExecutionContext,
  input: RankingInput,
): Promise<ProductRankingOutput> {
  const { posicoes, sobraCents } = await deps.reports.topProducts(
    ctx.companyId,
    input.from,
    input.to,
    input.limit,
  )

  return {
    from: input.from,
    to: input.to,
    products: [...posicoes],
    unlinkedCents: sobraCents,
  }
}
