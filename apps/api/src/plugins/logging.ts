import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { IncomingMessage } from 'node:http'

/**
 * Log estruturado com correlacao — NR-030.
 *
 * Tres requisitos moram aqui:
 *
 * - RNF-058: toda requisicao sai em JSON com `requestId`, `companyId` e
 *   `userId`.
 * - RNF-034: dado pessoal NUNCA aparece em log. Nao e "evite" — e varredura
 *   automatizada procurando CPF, telefone e e-mail no log.
 * - RNF-059: erro de integracao externa registra requisicao, resposta e
 *   duracao, com o que e sensivel mascarado.
 */

/** Cabecalho de correlacao entre servicos. */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Caminhos que o pino apaga antes de escrever.
 *
 * Lista de negacao tem furo por natureza — campo novo entra sem ninguem
 * lembrar de acrescentar aqui. Ela existe como segunda barreira: a primeira e
 * nao logar corpo de requisicao, que e o que o Fastify ja faz por padrao.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  // Se algum log passar um corpo adiante, estes somem antes de virar linha.
  '*.password',
  '*.senha',
  '*.token',
  '*.secret',
  '*.cpf',
  '*.cnpj',
  '*.document',
  '*.email',
  '*.phone',
  '*.telefone',
]

/**
 * Aceita o id que vem de fora, mas nao qualquer coisa.
 *
 * Propagar o `x-request-id` do chamador e o que permite seguir uma operacao
 * entre servicos. Aceitar o valor cru, porem, deixa qualquer cliente escrever
 * o que quiser no nosso log — inclusive quebra de linha, que forja uma
 * entrada inteira. Por isso o filtro de formato e de tamanho.
 */
function sanitizeIncomingId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 64) return undefined
  if (!/^[\w.:-]+$/.test(trimmed)) return undefined

  return trimmed
}

/** Reaproveita o id de quem chamou; se nao houver, gera um. */
export function generateRequestId(req: IncomingMessage): string {
  return sanitizeIncomingId(req.headers[REQUEST_ID_HEADER]) ?? randomUUID()
}

/** Opcoes de logger para o Fastify. O pino vem junto com ele. */
export function buildLoggerOptions(level: string): {
  level: string
  redact: { paths: string[]; censor: string }
} {
  return {
    level,
    redact: { paths: REDACTED_PATHS, censor: '[oculto]' },
  }
}

export function registerLogging(app: FastifyInstance): void {
  /*
   * Devolve o requestId ao cliente. E o que o suporte pede quando alguem diz
   * "deu erro" — sem isso, achar a linha no log depende de horario e sorte.
   */
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    void reply.header(REQUEST_ID_HEADER, request.id)
  })

  /*
   * Empresa e usuario entram no logger da requisicao assim que a autenticacao
   * resolve o principal. Roda em `preHandler` para vir depois dela (NR-014) e
   * antes do handler — assim todo log do caso de uso ja sai identificado.
   *
   * Enquanto a autenticacao nao existe, nada popula `principal` e o bind
   * simplesmente nao acontece: log sem companyId e melhor que log com um
   * companyId inventado.
   */
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const principal = request.principal
    if (!principal) return

    request.log = request.log.child({
      companyId: principal.companyId,
      userId: principal.userId,
    })
  })
}
