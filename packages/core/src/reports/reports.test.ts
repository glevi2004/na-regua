import { describe, expect, it } from 'vitest'
import type { ExecutionContext } from '../context.js'
import type { MesFaturado, ReportRepository } from '../ports/report-repository.js'
import { rankCustomers, rankProducts } from './rankings.js'
import { buildRevenueByMonth } from './revenue-by-month.js'

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

const mes = (month: string, netCents: number, salesCount: number): MesFaturado => ({
  month,
  grossCents: netCents,
  discountsCents: 0,
  netCents,
  salesCount,
})

/**
 * O repositorio de mentira registra COM QUE ARGUMENTOS foi chamado.
 *
 * Sem isso, um caso de uso que ignorasse o `limit` e devolvesse a lista inteira
 * passaria: a lista de mentira ja vem curta. O teste tem de ver o pedido, e nao
 * so a resposta.
 */
function repositorio(over: Partial<ReportRepository> = {}) {
  const chamadas: unknown[][] = []

  const reports: ReportRepository = {
    revenueByMonth: async (...args) => {
      chamadas.push(args)
      return []
    },
    topCustomers: async (...args) => {
      chamadas.push(args)
      return { posicoes: [], sobraCents: 0 }
    },
    topProducts: async (...args) => {
      chamadas.push(args)
      return { posicoes: [], sobraCents: 0 }
    },
    ...over,
  }

  return { reports, chamadas }
}

describe('faturamento mes a mes — US-041', () => {
  it('completa com zeros o mes sem venda, em vez de omiti-lo', async () => {
    const { reports } = repositorio({
      revenueByMonth: async () => [mes('2026-01', 30_000, 3), mes('2026-03', 10_000, 1)],
    })

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2026-01-01',
      to: '2026-03-31',
    })

    expect(r.months.map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(r.months[1]).toEqual({
      month: '2026-02',
      grossCents: 0,
      discountsCents: 0,
      netCents: 0,
      salesCount: 0,
      averageTicketCents: null,
    })
  })

  it('nao inventa ticket medio de mes sem venda', async () => {
    const { reports } = repositorio()

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2026-05-01',
      to: '2026-05-31',
    })

    /* Zero seria uma mentira diferente: "vendeu, e o ticket foi zero". */
    expect(r.months).toHaveLength(1)
    expect(r.months[0]?.averageTicketCents).toBeNull()
    expect(r.totalNetCents).toBe(0)
  })

  it('atravessa a virada do ano sem pular nem repetir mes', async () => {
    const { reports } = repositorio()

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2025-11-15',
      to: '2026-02-01',
    })

    expect(r.months.map((m) => m.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('devolve um unico mes quando o periodo cabe dentro dele', async () => {
    const { reports } = repositorio()

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2026-07-03',
      to: '2026-07-09',
    })

    expect(r.months.map((m) => m.month)).toEqual(['2026-07'])
  })

  it('arredonda o ticket medio ao centavo', async () => {
    const { reports } = repositorio({
      revenueByMonth: async () => [mes('2026-04', 10_000, 3)],
    })

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2026-04-01',
      to: '2026-04-30',
    })

    expect(r.months[0]?.averageTicketCents).toBe(3333)
  })

  it('soma o total do periodo a partir dos meses', async () => {
    const { reports } = repositorio({
      revenueByMonth: async () => [mes('2026-01', 30_000, 3), mes('2026-02', 12_500, 1)],
    })

    const r = await buildRevenueByMonth({ reports }, contexto(), {
      from: '2026-01-01',
      to: '2026-02-28',
    })

    expect(r.totalNetCents).toBe(42_500)
  })
})

describe('rankings — US-041', () => {
  it('pede ao repositorio o periodo e o limite que recebeu', async () => {
    const { reports, chamadas } = repositorio()

    await rankCustomers({ reports }, contexto(), { from: '2026-01-01', to: '2026-01-31', limit: 5 })

    expect(chamadas[0]).toEqual(['empresa-1', '2026-01-01', '2026-01-31', 5])
  })

  it('separa a venda de balcao do ranking de clientes — RF-033', async () => {
    const { reports } = repositorio({
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
        sobraCents: 80_000,
      }),
    })

    const r = await rankCustomers({ reports }, contexto(), {
      from: '2026-01-01',
      to: '2026-01-31',
      limit: 10,
    })

    /* A sobra fica FORA da lista e visivel: sem ela, o lojista somaria 200,00 e
       compararia com um faturamento de 1.000,00 sem entender a diferenca. */
    expect(r.customers).toHaveLength(1)
    expect(r.unidentifiedCents).toBe(80_000)
  })

  it('separa o item sem produto no cadastro do ranking de produtos', async () => {
    const { reports } = repositorio({
      topProducts: async () => ({
        posicoes: [{ productId: 'prod-1', productName: 'Cafe', quantity: 12, netCents: 6_000 }],
        sobraCents: 1_500,
      }),
    })

    const r = await rankProducts({ reports }, contexto(), {
      from: '2026-01-01',
      to: '2026-01-31',
      limit: 10,
    })

    expect(r.products[0]?.quantity).toBe(12)
    expect(r.unlinkedCents).toBe(1_500)
  })

  it('devolve lista vazia, e nao erro, em periodo sem venda', async () => {
    const { reports } = repositorio()

    const r = await rankProducts({ reports }, contexto(), {
      from: '2026-01-01',
      to: '2026-01-31',
      limit: 10,
    })

    expect(r.products).toEqual([])
    expect(r.unlinkedCents).toBe(0)
  })
})
