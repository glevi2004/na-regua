import type { CustomerRank, ProductRank } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'

/**
 * Porta dos relatorios de venda — NR-077, US-041.
 *
 * As agregacoes ficam no repositorio, e nao em `core`. Nao e otimizacao
 * prematura: somar o faturamento de um ano em memoria exigiria trazer todas as
 * vendas do ano para contar sete numeros, e o ranking exigiria trazer todos os
 * itens para ficar com dez linhas. O que `core` faz com o resultado — completar
 * os meses vazios, calcular ticket medio — e que e regra, e por isso e que
 * mora la.
 *
 * ## Devolucao ainda nao entra na conta
 *
 * Todo metodo daqui exclui venda CANCELADA e nada mais. `sale_items` tem
 * `returned_quantity`, mas a RF-044 (devolucao) ainda nao existe e nenhum
 * caminho do sistema escreve nessa coluna. Quando ela existir, sera preciso
 * decidir como a devolucao se lanca — se abate do mes da venda ou do mes da
 * devolucao — e os dois relatorios seguem a MESMA decisao. Abater aqui por
 * conta propria daria um ranking que nao fecha com o faturamento, e um lojista
 * diante de dois numeros diferentes conclui, com razao, que nenhum dos dois
 * presta.
 */

/** Um mes que teve venda. Mes sem venda nao volta — quem completa e `core`. */
export type MesFaturado = {
  /** AAAA-MM. */
  readonly month: string
  readonly grossCents: number
  readonly discountsCents: number
  readonly netCents: number
  readonly salesCount: number
}

/**
 * Um ranking e o que sobrou fora dele.
 *
 * Numa chamada so, e nao duas: a sobra e o complemento exato do que a lista
 * mostra, e as duas metades saem da mesma varredura. Pedi-la em separado
 * varreria as mesmas vendas de novo para responder o que a primeira leitura ja
 * sabia — e, entre uma leitura e outra, uma venda nova faria a soma parar de
 * fechar com a lista.
 */
export type Ranking<T> = {
  readonly posicoes: readonly T[]
  /** Faturamento do periodo que nao pode ser atribuido a ninguem da lista. */
  readonly sobraCents: number
}

export type ReportRepository = {
  /** Faturamento por mes, apenas dos meses com venda — US-041. */
  revenueByMonth(companyId: CompanyId, from: string, to: string): Promise<readonly MesFaturado[]>

  /** Clientes que mais compraram; a sobra e a venda de balcao (RF-033). */
  topCustomers(
    companyId: CompanyId,
    from: string,
    to: string,
    limit: number,
  ): Promise<Ranking<CustomerRank>>

  /** Produtos mais vendidos; a sobra e o item sem produto no cadastro. */
  topProducts(
    companyId: CompanyId,
    from: string,
    to: string,
    limit: number,
  ): Promise<Ranking<ProductRank>>
}
