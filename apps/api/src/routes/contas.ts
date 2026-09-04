import { createPayableInputSchema, endRecurrenceInputSchema } from '@na-regua/contracts'
import {
  createPayable,
  type CreatePayableDeps,
  endRecurrence,
  type EndRecurrenceDeps,
  listPayables,
  type ListPayablesDeps,
} from '@na-regua/core'
import type { FastifyInstance } from 'fastify'
import { requireContext } from '../plugins/execution-context.js'
import { LIMITE_DE_ESCRITA } from '../plugins/rate-limit.js'
import { validate } from '../plugins/validate.js'

/**
 * Contas a pagar — NR-074, RF-055 a RF-062.
 *
 * Como as outras rotas: le o contexto, valida a forma, chama o caso de uso e
 * traduz. Recorrencia, faixa de vencimento e o total por grupo ficam em `core`
 * e em `domain`.
 */

export type ContasDeps = CreatePayableDeps &
  EndRecurrenceDeps & { readonly queries: ListPayablesDeps }

export function registerContasRoutes(app: FastifyInstance, deps: ContasDeps): void {
  /**
   * Lancar — RF-055, RF-057.
   *
   * Devolve a LISTA de ocorrencias, e nao uma so: uma conta recorrente vira N
   * linhas de verdade, e quem lancou precisa ver quantas entraram. `201` porque
   * criou, mesmo quando criou doze.
   */
  app.post(
    '/contas-a-pagar',
    { config: { rateLimit: LIMITE_DE_ESCRITA } },
    async (request, reply) => {
      const ctx = requireContext(request)
      const input = validate(createPayableInputSchema, request.body)

      const contas = await createPayable(deps, ctx, input)

      return reply.code(201).send({ payables: contas, count: contas.length })
    },
  )

  /**
   * A lista agrupada por vencimento — RF-061, RF-062.
   *
   * Sem parametro de filtro: o agrupamento e o recorte. Quem quiser "so as
   * vencidas" le o grupo `overdue` da resposta — e assim a tela nao precisa
   * pedir de novo para trocar de aba.
   *
   * `temVencidas` vem no corpo em vez de a tela procurar o grupo e contar: a
   * abertura do sistema pergunta uma coisa so (RF-062), e obriga-la a percorrer
   * a estrutura convida cada tela a responder de um jeito.
   */
  app.get('/contas-a-pagar', async (request, reply) => {
    const ctx = requireContext(request)

    const agrupadas = await listPayables(deps.queries, ctx)

    return reply.code(200).send(agrupadas)
  })

  /**
   * Encerrar a recorrencia — RF-058.
   *
   * `POST .../encerrar` e nao `DELETE`: o passado nao e apagado. As ocorrencias
   * ja vencidas continuam devidas, e a resposta diz quantas foram canceladas e
   * quantas ficaram — dizer so "pronto" faria o lojista achar que a serie
   * inteira sumiu.
   */
  app.post(
    '/contas-a-pagar/recorrencias/:id/encerrar',
    { config: { rateLimit: LIMITE_DE_ESCRITA } },
    async (request, reply) => {
      const ctx = requireContext(request)
      const { id } = request.params as { id: string }

      const input = validate(endRecurrenceInputSchema, { recurrenceId: id })

      const r = await endRecurrence(deps, ctx, input)

      return reply.code(200).send(r)
    },
  )
}
