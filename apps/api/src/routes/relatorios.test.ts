import type { ReportRepository } from '@na-regua/core'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerRateLimit } from '../plugins/rate-limit.js'
import { type RelatoriosDeps, registerRelatoriosRoutes } from './relatorios.js'

/**
 * Rotas de faturamento e ranking — NR-077, US-041.
 *
 * As regras tem teste em `core` e as consultas em `db`. Aqui se prova o que so
 * a rota faz: o periodo obrigatorio, o limite que vem como TEXTO na query e
 * precisa virar numero, e o teto que impede alguem de pedir o ranking inteiro
 * pela barra de endereco.
 */

const PRINCIPAL: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

function repositorio(over: Partial<ReportRepository> = {}) {
  const pedidos: unknown[][] = []

  const reports: ReportRepository = {
    revenueByMonth: async (...args) => {
      pedidos.push(args)
      return []
    },
    topCustomers: async (...args) => {
      pedidos.push(args)
      return { posicoes: [], sobraCents: 0 }
    },
    topProducts: async (...args) => {
      pedidos.push(args)
      return { posicoes: [], sobraCents: 0 }
    },
    ...over,
  }

  return { reports, pedidos }
}

async function buildApp(over: Partial<ReportRepository> = {}) {
  const { reports, pedidos } = repositorio(over)
  const deps: RelatoriosDeps = { reports }

  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  await registerRateLimit(app)
  app.addHook('onRequest', async (request) => {
    request.principal = PRINCIPAL
  })
  registerRelatoriosRoutes(app, deps)

  return { app, pedidos }
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

describe('faturamento — GET /relatorios/faturamento', () => {
  it('devolve a serie do periodo pedido', async () => {
    const c = await buildApp({
      revenueByMonth: async () => [
        {
          month: '2026-01',
          grossCents: 10_000,
          discountsCents: 0,
          netCents: 10_000,
          salesCount: 2,
        },
      ],
    })
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/faturamento?from=2026-01-01&to=2026-02-28',
    })

    expect(r.statusCode).toBe(200)
    expect(r.json().months).toHaveLength(2)
    expect(r.json().totalNetCents).toBe(10_000)
  })

  it('recusa periodo invertido', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/faturamento?from=2026-03-01&to=2026-01-31',
    })

    expect(r.statusCode).toBe(400)
  })

  it('recusa periodo ausente em vez de inventar o mes atual', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/relatorios/faturamento' })

    expect(r.statusCode).toBe(400)
  })
})

describe('rankings — GET /relatorios/ranking/*', () => {
  it('converte o limite que veio como texto na query', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/ranking/clientes?from=2026-01-01&to=2026-01-31&limit=3',
    })

    expect(r.statusCode).toBe(200)
    /* Numero, e nao "3": um `LIMIT` com texto passaria no teste da rota e
       explodiria no banco. */
    expect(c.pedidos[0]?.[3]).toBe(3)
  })

  it('usa o limite padrao quando ninguem pede um', async () => {
    const c = await buildApp()
    app = c.app

    await app.inject({
      method: 'GET',
      url: '/relatorios/ranking/produtos?from=2026-01-01&to=2026-01-31',
    })

    expect(c.pedidos[0]?.[3]).toBe(10)
  })

  it('recusa limite acima do teto', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/ranking/clientes?from=2026-01-01&to=2026-01-31&limit=5000',
    })

    expect(r.statusCode).toBe(400)
  })

  it('entrega a sobra junto com a lista de clientes', async () => {
    const c = await buildApp({
      topCustomers: async () => ({
        posicoes: [
          {
            customerId: 'cli-1',
            customerName: 'Maria',
            netCents: 20_000,
            salesCount: 4,
            lastSaleOn: '2026-01-20',
          },
        ],
        sobraCents: 7_000,
      }),
    })
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/ranking/clientes?from=2026-01-01&to=2026-01-31',
    })

    expect(r.json().customers).toHaveLength(1)
    expect(r.json().unidentifiedCents).toBe(7_000)
  })

  it('entrega a sobra junto com a lista de produtos', async () => {
    const c = await buildApp({
      topProducts: async () => ({
        posicoes: [{ productId: 'p-1', productName: 'Cafe', quantity: 9, netCents: 9_000 }],
        sobraCents: 400,
      }),
    })
    app = c.app

    const r = await app.inject({
      method: 'GET',
      url: '/relatorios/ranking/produtos?from=2026-01-01&to=2026-01-31',
    })

    expect(r.json().products[0]).toMatchObject({ productName: 'Cafe', quantity: 9 })
    expect(r.json().unlinkedCents).toBe(400)
  })
})
