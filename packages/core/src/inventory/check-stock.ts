import type { CheckStockInput, StockViewOutput } from '@na-regua/contracts'
import { AppError } from '../app-error.js'
import type { ExecutionContext } from '../context.js'
import type { InventoryQueries } from '../ports/inventory-writers.js'

export type CheckStockDeps = InventoryQueries

/**
 * Saldo, preco e localizacao de um produto — RF-022.
 *
 * Leitura: nao passa por `assertCanWrite`. `accountant` e somente leitura,
 * entao consulta estoque como qualquer um.
 *
 * Produto de outra empresa responde NOT_FOUND, nunca FORBIDDEN: um 403
 * confirmaria que o id existe em algum lugar, e a existencia ja e informacao.
 */
export async function checkStock(
  deps: CheckStockDeps,
  ctx: ExecutionContext,
  input: CheckStockInput,
): Promise<StockViewOutput> {
  const produto = await deps.products.findById(ctx.companyId, input.productId)

  if (produto === undefined) {
    throw AppError.notFound('Produto nao encontrado.')
  }

  return {
    productId: produto.id,
    description: produto.description,
    salePriceCents: produto.salePriceCents,
    stockQuantity: produto.stockQuantity,
    location: produto.location,
    minStock: produto.minStock,
    belowMinimum: estaAbaixoDoMinimo(produto.stockQuantity, produto.minStock),
  }
}

/**
 * Abaixo do minimo — RF-025.
 *
 * Exportada porque a lista de reposicao (RF-025) vai precisar da MESMA
 * definicao, e duas definicoes de "abaixo do minimo" e a garantia de que a
 * lista e a ficha do produto vao discordar em algum caso de borda.
 *
 * Produto sem controle de estoque nunca esta abaixo do minimo: nao ha saldo
 * para comparar. Responder `true` faria o granel aparecer na lista de compras
 * todo dia, e uma lista que sempre acusa deixa de ser lida.
 */
export function estaAbaixoDoMinimo(saldo: number | null, minimo: number | null): boolean {
  if (saldo === null || minimo === null) return false
  return saldo < minimo
}
