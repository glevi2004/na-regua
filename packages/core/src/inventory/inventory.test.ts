import { describe, expect, it } from 'vitest'
import { isAppError } from '../app-error.js'
import type { ExecutionContext } from '../context.js'
import type { InventoryProductSnapshot } from '../ports/inventory-writers.js'
import { adjustStock } from './adjust-stock.js'
import { checkStock, estaAbaixoDoMinimo } from './check-stock.js'
import { InMemoryInventory } from './fakes.js'

const AGORA = new Date('2026-09-02T12:00:00.000Z')

function contexto(over: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    companyId: 'empresa-1',
    userId: 'usuario-1',
    role: 'owner',
    channel: 'app',
    requestId: 'req-1',
    now: AGORA,
    ...over,
  }
}

const ARROZ: InventoryProductSnapshot = {
  id: 'prod-arroz',
  description: 'Arroz 5kg',
  salePriceCents: 2890,
  stockQuantity: 20,
  location: 'Corredor 3, prateleira B',
  minStock: 5,
}

/** Granel: existe, vende, e ninguem conta. `stockQuantity` nulo — RF-022. */
const GRANEL: InventoryProductSnapshot = {
  id: 'prod-granel',
  description: 'Feijao a granel',
  salePriceCents: 990,
  stockQuantity: null,
  location: null,
  minStock: null,
}

function estoqueCom(...produtos: InventoryProductSnapshot[]) {
  const inv = new InMemoryInventory()
  for (const p of produtos) inv.adicionarProduto('empresa-1', p)
  return inv
}

// ---------------------------------------------------------------------------
// Consulta — RF-022
// ---------------------------------------------------------------------------

describe('consultar estoque — RF-022', () => {
  it('devolve saldo, preco e localizacao', async () => {
    const inv = estoqueCom(ARROZ)

    const visao = await checkStock(inv, contexto(), { productId: 'prod-arroz' })

    expect(visao.stockQuantity).toBe(20)
    expect(visao.salePriceCents).toBe(2890)
    expect(visao.location).toBe('Corredor 3, prateleira B')
  })

  /**
   * O coracao da RF-022. Responder zero para o granel faria o balconista dizer
   * ao cliente que acabou, com a caixa cheia atras dele.
   */
  it('produto sem controle de estoque devolve nulo, NAO zero', async () => {
    const inv = estoqueCom(GRANEL)

    const visao = await checkStock(inv, contexto(), { productId: 'prod-granel' })

    expect(visao.stockQuantity).toBeNull()
    expect(visao.stockQuantity).not.toBe(0)
  })

  it('saldo zero continua sendo zero, e nao "sem controle"', async () => {
    const inv = estoqueCom({ ...ARROZ, stockQuantity: 0 })

    const visao = await checkStock(inv, contexto(), { productId: 'prod-arroz' })

    expect(visao.stockQuantity).toBe(0)
  })

  it('produto de outra empresa responde NOT_FOUND, nao FORBIDDEN', async () => {
    const inv = estoqueCom(ARROZ)

    try {
      await checkStock(inv, contexto({ companyId: 'empresa-2' }), { productId: 'prod-arroz' })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('NOT_FOUND')
    }
  })

  it('produto inexistente responde NOT_FOUND', async () => {
    const inv = estoqueCom(ARROZ)

    try {
      await checkStock(inv, contexto(), { productId: 'prod-que-nao-existe' })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('NOT_FOUND')
    }
  })

  it('accountant CONSULTA — somente leitura nao e sem acesso', async () => {
    const inv = estoqueCom(ARROZ)

    const visao = await checkStock(inv, contexto({ role: 'accountant' }), {
      productId: 'prod-arroz',
    })

    expect(visao.stockQuantity).toBe(20)
  })
})

describe('abaixo do minimo — RF-025', () => {
  it('acusa quando o saldo esta abaixo do minimo', async () => {
    const inv = estoqueCom({ ...ARROZ, stockQuantity: 3, minStock: 5 })

    const visao = await checkStock(inv, contexto(), { productId: 'prod-arroz' })

    expect(visao.belowMinimum).toBe(true)
  })

  it('saldo igual ao minimo ainda nao esta abaixo', () => {
    expect(estaAbaixoDoMinimo(5, 5)).toBe(false)
  })

  /* Se acusasse, o granel entraria na lista de compras todo dia — e lista que
     sempre acusa deixa de ser lida. */
  it('produto sem controle de estoque nunca esta abaixo do minimo', () => {
    expect(estaAbaixoDoMinimo(null, 5)).toBe(false)
  })

  it('produto sem minimo definido nunca esta abaixo', () => {
    expect(estaAbaixoDoMinimo(0, null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ajuste — RF-023
// ---------------------------------------------------------------------------

describe('ajustar estoque — RF-023', () => {
  it('o saldo passa a ser o contado', async () => {
    const inv = estoqueCom(ARROZ)

    await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Contagem de inventario',
    })

    expect(inv.saldoDe('prod-arroz')).toBe(18)
  })

  it('grava o movimento com autoria, motivo e data', async () => {
    const inv = estoqueCom(ARROZ)

    const mov = await adjustStock({ uow: inv }, contexto({ userId: 'joana' }), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Quebra de duas unidades',
    })

    expect(mov.createdBy).toBe('joana')
    expect(mov.reason).toBe('Quebra de duas unidades')
    expect(mov.createdAt).toBe(AGORA.toISOString())
    expect(mov.kind).toBe('adjustment')
  })

  it('a diferenca e assinada: contar menos da delta negativo', async () => {
    const inv = estoqueCom(ARROZ)

    const mov = await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Quebra',
    })

    expect(mov.quantityDelta).toBe(-2)
    expect(mov.balanceAfter).toBe(18)
  })

  it('contar mais da delta positivo — sobra tambem e divergencia', async () => {
    const inv = estoqueCom(ARROZ)

    const mov = await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 25,
      reason: 'Entrada nao lancada',
    })

    expect(mov.quantityDelta).toBe(5)
  })

  it('ajuste nao nasce de venda, entao saleId fica nulo', async () => {
    const inv = estoqueCom(ARROZ)

    const mov = await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Contagem',
    })

    expect(mov.saleId).toBeNull()
  })

  it('deixa exatamente um movimento na trilha', async () => {
    const inv = estoqueCom(ARROZ)

    await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Contagem',
    })

    expect(inv.movimentos).toHaveLength(1)
  })

  /* Tratar nulo como zero gravaria saldo em algo que por decisao nao tem
     saldo, e o produto passaria a ser contado sem ninguem ter pedido. */
  it('recusa ajustar produto sem controle de estoque', async () => {
    const inv = estoqueCom(GRANEL)

    try {
      await adjustStock({ uow: inv }, contexto(), {
        productId: 'prod-granel',
        countedQuantity: 10,
        reason: 'Tentando controlar',
      })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('CONFLICT')
    }
  })

  it('recusa quando a contagem confere — nao ha o que ajustar', async () => {
    const inv = estoqueCom(ARROZ)

    try {
      await adjustStock({ uow: inv }, contexto(), {
        productId: 'prod-arroz',
        countedQuantity: 20,
        reason: 'Conferencia',
      })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('CONFLICT')
    }
  })

  it('conferencia que bate nao suja a trilha', async () => {
    const inv = estoqueCom(ARROZ)

    await adjustStock({ uow: inv }, contexto(), {
      productId: 'prod-arroz',
      countedQuantity: 20,
      reason: 'Conferencia',
    }).catch(() => undefined)

    expect(inv.movimentos).toEqual([])
  })

  it('produto de outra empresa responde NOT_FOUND', async () => {
    const inv = estoqueCom(ARROZ)

    try {
      await adjustStock({ uow: inv }, contexto({ companyId: 'empresa-2' }), {
        productId: 'prod-arroz',
        countedQuantity: 18,
        reason: 'Contagem',
      })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('NOT_FOUND')
    }
  })
})

/**
 * A verificacao de papel vive no caso de uso, e nao no handler HTTP — senao o
 * canal WhatsApp (NR-060) nao a aplicaria e o mesmo ajuste teria duas regras.
 */
describe('autorizacao por papel', () => {
  it.each(['owner', 'staff'] as const)('%s ajusta', async (role) => {
    const inv = estoqueCom(ARROZ)

    const mov = await adjustStock({ uow: inv }, contexto({ role }), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Contagem',
    })

    expect(mov.id).toBeTruthy()
  })

  it('accountant NAO ajusta', async () => {
    const inv = estoqueCom(ARROZ)

    try {
      await adjustStock({ uow: inv }, contexto({ role: 'accountant' }), {
        productId: 'prod-arroz',
        countedQuantity: 18,
        reason: 'Contagem',
      })
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(isAppError(erro) && erro.code).toBe('FORBIDDEN')
    }
  })

  it('accountant nao mexe no saldo nem por engano', async () => {
    const inv = estoqueCom(ARROZ)

    await adjustStock({ uow: inv }, contexto({ role: 'accountant' }), {
      productId: 'prod-arroz',
      countedQuantity: 18,
      reason: 'Contagem',
    }).catch(() => undefined)

    expect(inv.saldoDe('prod-arroz')).toBe(20)
  })
})

/**
 * Saldo mudado sem movimento e a trilha mentindo. As duas coisas entram juntas
 * ou nao entram — e o falso faz rollback de verdade para que este teste meça
 * atomicidade, e nao a boa vontade dele.
 */
describe('atomicidade', () => {
  it('falha ao gravar o movimento desfaz a mudanca de saldo', async () => {
    const inv = estoqueCom(ARROZ)
    inv.falharAoGravarMovimento = true

    await expect(
      adjustStock({ uow: inv }, contexto(), {
        productId: 'prod-arroz',
        countedQuantity: 18,
        reason: 'Contagem',
      }),
    ).rejects.toThrow()

    expect(inv.saldoDe('prod-arroz')).toBe(20)
    expect(inv.movimentos).toEqual([])
  })
})
