import { pedir, type Resultado } from './http'

/**
 * Faturamento e rankings contra a api — NR-077, US-041.
 *
 * Tudo pelo BFF em `/api/...`: o token da sessao fica num cookie `httpOnly`.
 *
 * O DRE mora em `contabilidade-api`. Nao e duplicacao: o DRE soma LANCAMENTOS
 * classificados por competencia, e estes somam VENDAS. Sao perguntas
 * diferentes, e junta-las num modulo so faria parecer que compartilham fonte.
 */

export type MesFaturado = {
  /** AAAA-MM. */
  month: string
  grossCents: number
  discountsCents: number
  netCents: number
  salesCount: number
  /** Nulo quando nao houve venda — nao zero. */
  averageTicketCents: number | null
}

export type Faturamento = {
  from: string
  to: string
  months: MesFaturado[]
  totalNetCents: number
}

export type PosicaoDeCliente = {
  customerId: string
  customerName: string
  netCents: number
  salesCount: number
  lastSaleOn: string
}

export type RankingDeClientes = {
  from: string
  to: string
  customers: PosicaoDeCliente[]
  /** Venda de balcao sem cliente — RF-033. Fora da lista, dentro do total. */
  unidentifiedCents: number
}

export type PosicaoDeProduto = {
  productId: string
  productName: string
  quantity: number
  netCents: number
}

export type RankingDeProdutos = {
  from: string
  to: string
  products: PosicaoDeProduto[]
  /** Item vendido sem produto no cadastro. */
  unlinkedCents: number
}

export const carregarFaturamento = (from: string, to: string): Promise<Resultado<Faturamento>> =>
  pedir(`/api/relatorios/faturamento?from=${from}&to=${to}`)

export const carregarRankingDeClientes = (
  from: string,
  to: string,
): Promise<Resultado<RankingDeClientes>> =>
  pedir(`/api/relatorios/ranking/clientes?from=${from}&to=${to}`)

export const carregarRankingDeProdutos = (
  from: string,
  to: string,
): Promise<Resultado<RankingDeProdutos>> =>
  pedir(`/api/relatorios/ranking/produtos?from=${from}&to=${to}`)
