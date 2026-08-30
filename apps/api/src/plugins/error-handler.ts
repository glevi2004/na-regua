import { AppError, type AppErrorCode, isAppError } from '@na-regua/core'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/**
 * Traducao de erro para HTTP.
 *
 * Uma regra manda em tudo aqui: **o cliente nunca ve o que ele nao deveria**
 * (RNF-054, seguranca.md). Erro esperado vira mensagem em pt-br dizendo o que
 * fazer; erro inesperado vira 500 com texto generico, e o detalhe real vai
 * para o log — onde a equipe ve e o atacante nao.
 */

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
}

/** Formato unico de erro. Cliente que trata um trata todos. */
export type ErrorBody = {
  error: {
    code: AppErrorCode | 'INTERNAL'
    message: string
    /** Só em VALIDATION_FAILED. Vazio nos demais. */
    fields: readonly { path: string; message: string }[]
  }
  /** Correlaciona com o log. E o que o suporte pede, em vez de "deu erro". */
  requestId: string
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id

    if (isAppError(error)) {
      const status = STATUS[error.code]
      /* Erro esperado nao e incidente: fica em warn para nao poluir o alerta. */
      request.log.warn({ code: error.code, status }, error.message)

      return reply.code(status).send({
        error: { code: error.code, message: error.message, fields: error.fields },
        requestId,
      } satisfies ErrorBody)
    }

    /*
     * Daqui para baixo o erro e inesperado — bug, banco fora, adapter quebrado.
     * O log leva o erro inteiro; a resposta nao leva nada dele. Vazar a
     * mensagem original aqui e como expor `relation "users" does not exist`
     * para quem esta sondando a API.
     */
    request.log.error({ err: error }, 'erro nao tratado')

    return reply.code(500).send({
      error: {
        code: 'INTERNAL',
        message: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
        fields: [],
      },
      requestId,
    } satisfies ErrorBody)
  })

  /* 404 tambem no formato unico — senao o cliente teria dois formatos. */
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const error = AppError.notFound('Este endereco nao existe.')

    return reply.code(404).send({
      error: { code: error.code, message: error.message, fields: [] },
      requestId: request.id,
    } satisfies ErrorBody)
  })
}
