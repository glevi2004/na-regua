import { rankingInputSchema, revenueByMonthInputSchema } from '@na-regua/contracts'
import {
  buildRevenueByMonth,
  rankCustomers,
  rankProducts,
  type RankingDeps,
  type RevenueReportDeps,
} from '@na-regua/core'
import type { FastifyInstance } from 'fastify'
import { requireContext } from '../plugins/execution-context.js'
import { validate } from '../plugins/validate.js'

/**
 * Faturamento e rankings — NR-077, US-041.
 *
 * Separadas de `contabilidade.ts`, onde vive o DRE, porque respondem a outra
 * pergunta: o DRE soma LANCAMENTOS classificados por competencia, e estas somam
 * VENDAS. Junta-las no mesmo arquivo faria parecer que compartilham fonte, e um
 * dia alguem "unificaria" as duas somas e os numeros passariam a discordar.
 *
 * Periodo obrigatorio na query, sem padrao de "mes atual" — pela mesma razao
 * que no DRE: um padrao escondido faz a tela, o assistente e a exportacao
 * discordarem no dia 1 de cada mes.
 */

export type RelatoriosDeps = RevenueReportDeps & RankingDeps

export function registerRelatoriosRoutes(app: FastifyInstance, deps: RelatoriosDeps): void {
  app.get('/relatorios/faturamento', async (request, reply) => {
    const ctx = requireContext(request)

    const input = validate(revenueByMonthInputSchema, request.query ?? {})
    const faturamento = await buildRevenueByMonth(deps, ctx, input)

    return reply.code(200).send(faturamento)
  })

  app.get('/relatorios/ranking/clientes', async (request, reply) => {
    const ctx = requireContext(request)

    const input = validate(rankingInputSchema, request.query ?? {})
    const ranking = await rankCustomers(deps, ctx, input)

    return reply.code(200).send(ranking)
  })

  app.get('/relatorios/ranking/produtos', async (request, reply) => {
    const ctx = requireContext(request)

    const input = validate(rankingInputSchema, request.query ?? {})
    const ranking = await rankProducts(deps, ctx, input)

    return reply.code(200).send(ranking)
  })
}
