import type { CreateSaleInput } from '@na-regua/contracts'
import type {
  CompanySettingsRepository,
  RegisterSaleDeps,
  RegisteredSale,
  SaleTransaction,
  UnitOfWork,
} from '@na-regua/core'
import { createDefaultSaleSettings } from '@na-regua/core'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerSaleRoutes } from './sales.js'

/**
 * Sobe um Fastify de verdade com `app.inject`: o que esta rota promete e um par
 * status + corpo, e isso so aparece passando pelo ciclo de requisicao.
 *
 * O repositorio e em memoria — a rota nao precisa de Postgres para provar que
 * traduz HTTP corretamente, e um teste que precisasse so rodaria na CI.
 */

const PRINCIPAL: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

/** Unidade de trabalho minima, com idempotencia de verdade. */
function unitOfWorkEmMemoria() {
  const porChave = new Map<string, RegisteredSale>()
  let sequencia = 0

  const uow: UnitOfWork = {
    transaction: async (_companyId, fn) => {
      const tx: SaleTransaction = {
        products: {
          findManyByIds: async (ids) =>
            ids.map((id) => ({
              id,
              description: `Produto ${id}`,
              unitOfMeasure: 'un',
              salePriceCents: 1_000,
              costPriceCents: 600,
              stockQuantity: 10,
              taxRate: null,
            })),
        },
        insertSale: async (sale) => {
          sequencia += 1
          const gravada: RegisteredSale = {
            id: `venda-${sequencia}`,
            number: sequencia,
            grossAmountCents: 1_000,
            costAmountCents: 600,
            taxAmountCents: 0,
            cardFeeAmountCents: 0,
            netAmountCents: 1_000,
            changeCents: 0,
            createdAt: sale.createdAt.toISOString(),
          }
          if (sale.idempotencyKey !== undefined) porChave.set(sale.idempotencyKey, gravada)
          return gravada
        },
        decreaseStock: async () => undefined,
        findByIdempotencyKey: async (chave) => porChave.get(chave),
      }
      return fn(tx)
    },
  }

  return uow
}

/* `principal` e `AuthenticatedPrincipal | null`, e nao opcional: passar
   `undefined` acionaria o valor padrao do parametro e o teste de 401 anexaria
   o principal do mesmo jeito. `null` nao tem esse comportamento. */
function buildApp(
  over: Partial<RegisterSaleDeps> = {},
  principal: AuthenticatedPrincipal | null = PRINCIPAL,
): FastifyInstance {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)

  /* No lugar da autenticacao, que e a NR-014. */
  app.addHook('onRequest', async (request) => {
    if (principal !== null) request.principal = principal
  })

  const deps: RegisterSaleDeps = {
    unitOfWork: unitOfWorkEmMemoria(),
    settings: createDefaultSaleSettings(),
    ...over,
  }

  registerSaleRoutes(app, deps)
  return app
}

const venda: CreateSaleInput = {
  items: [{ productId: 'prod-1', quantity: 1, unitPriceCents: 1_000 }],
  payments: [{ method: 'cash', amountCents: 1_000 }],
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

describe('POST /sales — RF-036', () => {
  it('registra a venda e responde 201', async () => {
    app = buildApp()

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: venda,
    })

    expect(r.statusCode).toBe(201)
    expect(r.json().sale.id).toBeTruthy()
  })

  it('devolve os avisos de estoque junto — RF-028', async () => {
    app = buildApp()

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: venda,
    })

    expect(r.json()).toHaveProperty('stockWarnings')
  })
})

/**
 * O coracao da tarefa. O PDV com internet ruim reenvia, e sem a chave o segundo
 * envio vira uma segunda venda, com segundo estoque baixado e segundo
 * recebivel.
 */
describe('idempotencia — RNF-043', () => {
  it('exige o cabecalho, com 400', async () => {
    app = buildApp()

    const r = await app.inject({ method: 'POST', url: '/sales', payload: venda })

    expect(r.statusCode).toBe(400)
    expect(r.json().error.message).toContain('idempotency-key')
  })

  it('o reenvio com a mesma chave devolve a MESMA venda', async () => {
    app = buildApp()
    const enviar = () =>
      app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': 'chave-1' },
        payload: venda,
      })

    const primeira = await enviar()
    const segunda = await enviar()

    expect(segunda.json().sale.id).toBe(primeira.json().sale.id)
  })

  /* 201 diz "criei agora", 200 diz "isto ja existia". Responder 201 sempre
     faria um integrador contar duas vendas onde houve uma. */
  it('o reenvio responde 200, nao 201', async () => {
    app = buildApp()
    const enviar = () =>
      app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': 'chave-1' },
        payload: venda,
      })

    expect((await enviar()).statusCode).toBe(201)
    const segunda = await enviar()
    expect(segunda.statusCode).toBe(200)
    expect(segunda.json().replayed).toBe(true)
  })

  it('chave diferente registra venda diferente', async () => {
    app = buildApp()
    const enviar = (chave: string) =>
      app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': chave },
        payload: venda,
      })

    const a = await enviar('chave-1')
    const b = await enviar('chave-2')

    expect(b.json().sale.id).not.toBe(a.json().sale.id)
  })
})

describe('validacao e autorizacao', () => {
  it('corpo invalido responde 400 com o campo', async () => {
    app = buildApp()

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: { items: [], payments: [] },
    })

    expect(r.statusCode).toBe(400)
  })

  it('campo desconhecido e recusado — o schema e strict', async () => {
    app = buildApp()

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: { ...venda, desconto: 999 },
    })

    expect(r.statusCode).toBe(400)
  })

  /* Enquanto a NR-014 nao existe, nada popula o principal e toda chamada cai
     aqui. 401 e melhor que um contexto inventado. */
  it('sem sessao responde 401, nao 500', async () => {
    app = buildApp({}, null)

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: venda,
    })

    expect(r.statusCode).toBe(401)
  })

  /* A verificacao de papel vive em `core`, e a rota so traduz: e o que faz o
     canal WhatsApp aplicar a mesma regra. */
  it('accountant recebe 403 — somente leitura', async () => {
    app = buildApp({}, { ...PRINCIPAL, role: 'accountant' })

    const r = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: { 'idempotency-key': 'chave-1' },
      payload: venda,
    })

    expect(r.statusCode).toBe(403)
  })
})

describe('configuracao padrao de venda', () => {
  const settings: CompanySettingsRepository = createDefaultSaleSettings()

  it('owner nao tem teto de desconto', async () => {
    const s = await settings.forSale('empresa-1', 'owner')
    expect(s.discountPolicy.maxDiscountRate).toBe(100)
  })

  it('staff tem teto de 10 pontos', async () => {
    const s = await settings.forSale('empresa-1', 'staff')
    expect(s.discountPolicy.maxDiscountRate).toBe(10)
  })

  /* Papel novo que ninguem mapeou nao pode nascer podendo dar desconto. */
  it('papel desconhecido cai em zero, nao no teto do owner', async () => {
    const s = await settings.forSale('empresa-1', 'papel-que-nao-existe')
    expect(s.discountPolicy.maxDiscountRate).toBe(0)
  })
})
