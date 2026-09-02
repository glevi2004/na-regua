import type { InventoryMovementOutput } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'
import type {
  InventoryProductSnapshot,
  InventoryReader,
  InventoryTransaction,
  InventoryUnitOfWork,
  NewInventoryMovement,
} from '../ports/inventory-writers.js'

/**
 * Estoque em memoria, com ROLLBACK de verdade e isolamento de verdade.
 *
 * Duas propriedades que um falso preguicoso perderia, e as duas sao o objeto do
 * teste:
 *
 * - **Rollback real.** Se `insertMovement` falhar depois de `setStock`, o saldo
 *   tem de voltar. Um falso que so acumula em arrays passaria no teste de
 *   atomicidade sem ter atomicidade — e o teste diria que a propriedade existe.
 * - **Filtro por empresa de verdade.** `findById` compara `companyId`. Um falso
 *   que ignora o tenant faz o teste de isolamento passar sozinho, medindo o
 *   vazio.
 */

type ProdutoGuardado = InventoryProductSnapshot & { readonly companyId: CompanyId }

export class InMemoryInventory implements InventoryUnitOfWork {
  readonly movimentos: (InventoryMovementOutput & { readonly companyId: CompanyId })[] = []
  private readonly produtos = new Map<string, ProdutoGuardado>()
  private sequencia = 0
  /** Liga para simular falha depois de gravar o saldo, antes do movimento. */
  falharAoGravarMovimento = false

  adicionarProduto(companyId: CompanyId, produto: InventoryProductSnapshot): void {
    this.produtos.set(produto.id, { ...produto, companyId })
  }

  /** Saldo atual, para o teste conferir sem passar pelo caso de uso. */
  saldoDe(productId: string): number | null {
    return this.produtos.get(productId)?.stockQuantity ?? null
  }

  /** Leitura fora de transacao — atende `InventoryQueries`. */
  get products(): InventoryReader {
    return {
      findById: async (companyId, productId) => {
        const p = this.produtos.get(productId)
        /* De outra empresa e o mesmo que inexistente. */
        return p && p.companyId === companyId ? semTenant(p) : undefined
      },
    }
  }

  async transaction<T>(
    companyId: CompanyId,
    fn: (tx: InventoryTransaction) => Promise<T>,
  ): Promise<T> {
    /* Fotografia antes de abrir: e o que o rollback restaura. */
    const produtosAntes = new Map(this.produtos)
    const movimentosAntes = [...this.movimentos]
    const sequenciaAntes = this.sequencia

    try {
      return await fn(this.escopo(companyId))
    } catch (erro) {
      this.produtos.clear()
      for (const [k, v] of produtosAntes) this.produtos.set(k, v)
      this.movimentos.length = 0
      this.movimentos.push(...movimentosAntes)
      this.sequencia = sequenciaAntes
      throw erro
    }
  }

  private escopo(companyId: CompanyId): InventoryTransaction {
    return {
      products: this.products,

      setStock: async (productId, quantity) => {
        const p = this.produtos.get(productId)
        if (!p || p.companyId !== companyId) return
        this.produtos.set(productId, { ...p, stockQuantity: quantity })
      },

      insertMovement: async (m: NewInventoryMovement) => {
        if (this.falharAoGravarMovimento) {
          throw new Error('fila de auditoria indisponivel')
        }
        this.sequencia += 1
        const gravado: InventoryMovementOutput & { companyId: CompanyId } = {
          id: `mov-${this.sequencia}`,
          companyId: m.companyId,
          productId: m.productId,
          kind: m.kind,
          quantityDelta: m.quantityDelta,
          balanceAfter: m.balanceAfter,
          reason: m.reason,
          saleId: m.saleId,
          createdBy: m.createdBy,
          createdAt: m.createdAt.toISOString(),
        }
        this.movimentos.push(gravado)
        return gravado
      },
    }
  }
}

function semTenant(p: ProdutoGuardado): InventoryProductSnapshot {
  const { companyId: _companyId, ...resto } = p
  return resto
}
