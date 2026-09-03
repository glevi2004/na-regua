import { createSaleInputSchema } from '@na-regua/contracts'
import { AppError, type RegisterSaleDeps, registerSale } from '@na-regua/core'
import type { FastifyInstance } from 'fastify'
import { IDEMPOTENCY_HEADER, requireContext } from '../plugins/execution-context.js'
import { validate } from '../plugins/validate.js'

/**
 * Rota de venda — NR-027, RF-036, RNF-043.
 *
 * A rota faz quatro coisas e nenhuma delas e regra: le o contexto, valida a
 * forma, chama o caso de uso e traduz o resultado em HTTP. Desconto, alcada,
 * calculo de liquido e idempotencia moram em `core` — se morassem aqui, o canal
 * WhatsApp (NR-060) fecharia venda por outro caminho, com outras regras.
 *
 * Recebe `deps` em vez de importar a composicao: e o que permite testar a rota
 * com repositorio em memoria, sem Postgres.
 */
export function registerSaleRoutes(app: FastifyInstance, deps: RegisterSaleDeps): void {
  app.post('/sales', async (request, reply) => {
    /* Sem sessao valida isto lanca UNAUTHORIZED. Enquanto a NR-014 nao existe,
       toda chamada cai aqui — 401 e melhor que um contexto inventado. */
    const ctx = requireContext(request)

    /*
     * A chave de idempotencia e OBRIGATORIA nesta rota — RNF-043.
     *
     * Ela e opcional no `ExecutionContext` porque a maioria das operacoes nao
     * precisa. Venda precisa: o PDV com internet ruim reenvia, e sem a chave o
     * segundo envio vira uma segunda venda, com segundo estoque baixado e
     * segundo recebivel. Exigir aqui e o que torna o reenvio seguro.
     *
     * 400 e nao 422: o cliente pode corrigir sozinho reenviando com o
     * cabecalho.
     */
    if (ctx.idempotencyKey === undefined) {
      throw AppError.validation(`Envie o cabecalho ${IDEMPOTENCY_HEADER} para registrar a venda.`)
    }

    const input = validate(createSaleInputSchema, request.body)

    const resultado = await registerSale(deps, ctx, input)

    /*
     * 200 no reenvio, 201 na venda nova.
     *
     * A distincao importa para quem integra: 201 diz "criei agora", 200 diz
     * "isto ja existia e e a mesma coisa". Responder 201 sempre faria um
     * integrador contar vendas pelo numero de 201 e contar duas onde houve uma.
     */
    return reply.code(resultado.replayed ? 200 : 201).send({
      sale: resultado.sale,
      /* Item vendido sem saldo e AVISO, nao erro (RF-028): a venda foi
         registrada e o operador precisa saber, mas nada foi recusado. */
      stockWarnings: resultado.stockWarnings,
      replayed: resultado.replayed,
    })
  })
}
