import { loginInputSchema, selectCompanyInputSchema } from '@na-regua/contracts'
import { AppError, type AuthDeps, type LoginMeta, login, selectCompany } from '@na-regua/core'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { validate } from '../plugins/validate.js'

/**
 * Rotas de sessao — NR-014, RF-119, RF-120.
 *
 * As unicas rotas do sistema que NAO exigem principal: sao elas que o produzem.
 */

/**
 * O que a borda sabe e o caso de uso nao descobre sozinho.
 *
 * `origin` existe para desacelerar por origem alem de por identificador
 * (RF-120): sem ele, quem varre mil e-mails diferentes nunca bate no limite,
 * porque cada tentativa tem um identificador novo.
 *
 * Vem de `request.ip`, que o Fastify resolve. Atras de proxy isso exige
 * `trustProxy` configurado — enquanto nao estiver, o valor e o IP do proxy e a
 * desaceleracao por origem vira global. Fica registrado como limitacao real:
 * ela nao ABRE buraco, apenas desacelera demais.
 */
function meta(request: FastifyRequest, channel: 'app' | 'whatsapp' = 'app'): LoginMeta {
  return {
    requestId: request.id,
    origin: request.ip,
    channel,
    now: new Date(),
  }
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthDeps): void {
  /**
   * Entrar — RF-119, RF-120.
   *
   * Devolve 200 mesmo quando a sessao ainda nao tem empresa: quem opera mais de
   * uma loja entra e **depois** escolhe (US-059). Nao e estado de erro, e o
   * corpo diz qual e a situacao em `activeCompanyId` e `memberships`.
   */
  app.post('/auth/login', async (request, reply) => {
    const input = validate(loginInputSchema, request.body)

    const sessao = await login(deps, input, meta(request))

    /* Sem `Set-Cookie`: o cliente e aplicativo e SPA, guarda o token e o manda
       no `Authorization`. Cookie exigiria CSRF, e CSRF exigiria uma decisao
       sobre dominio que a DEC-009 (hospedagem) ainda nao tomou. */
    return reply.code(200).send(sessao)
  })

  /**
   * Escolher a loja a operar — RF-119.
   *
   * Precisa de sessao, mas **nao** de principal: o principal so existe depois
   * que ha empresa, e e exatamente isso que esta rota produz. Por isso le
   * `request.sessionClaims` direto.
   */
  app.post('/auth/select-company', async (request, reply) => {
    const claims = request.sessionClaims
    if (claims === undefined) {
      throw AppError.unauthorized('Entre na sua conta para continuar.')
    }

    const input = validate(selectCompanyInputSchema, request.body)

    const sessao = await selectCompany(deps, claims, input, meta(request))

    return reply.code(200).send(sessao)
  })

  /**
   * Quem sou eu — a tela de shell (NR-013) pergunta isso ao abrir.
   *
   * Devolve o que a sessao ja carrega, sem ida ao banco: quem precisa de dado
   * fresco chama a rota do recurso. Uma consulta aqui seria uma consulta em
   * toda abertura de tela.
   */
  app.get('/auth/me', async (request, reply) => {
    const claims = request.sessionClaims
    if (claims === undefined) {
      throw AppError.unauthorized('Entre na sua conta para continuar.')
    }

    return reply.code(200).send({
      userId: claims.userId,
      activeCompanyId: claims.companyId,
      role: claims.companyId === null ? null : claims.role,
    })
  })
}
