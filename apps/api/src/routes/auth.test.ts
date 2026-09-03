import type { AuthDeps } from '@na-regua/core'
import {
  FakeIdentityProvider,
  InMemoryAuditTrail,
  InMemoryLoginThrottle,
  InMemorySessionIssuer,
} from '@na-regua/core'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { requireContext } from '../plugins/execution-context.js'
import { lerToken, registerSession } from '../plugins/session.js'
import { registerAuthRoutes } from './auth.js'

/**
 * O ciclo inteiro pelo Fastify: entrar, escolher loja, e so entao operar.
 *
 * O que estas rotas prometem e um par status + corpo E o efeito de popular
 * `request.principal` — e o segundo so aparece com uma rota protegida de
 * verdade do outro lado. Por isso a suite monta uma.
 */

const CREDENCIAL = { identifier: 'marta@mercado.local', secret: 'senha-de-teste' }

function buildApp() {
  const users = new (class {
    /* Diretorio minimo: o suficiente para login e escolha de loja. */
    usuarios = new Map([['sub-marta', { id: 'user-marta', name: 'Marta', isActive: true }]])
    vinculos = [
      { companyId: 'empresa-1', companyName: 'Mercado da Marta', role: 'owner' as const },
      { companyId: 'empresa-2', companyName: 'Mercado do Centro', role: 'staff' as const },
    ]
    async findById(id: string) {
      return [...this.usuarios.values()].find((u) => u.id === id)
    }
    async findBySubject(sub: string) {
      return this.usuarios.get(sub)
    }
    async findByEmail() {
      return undefined
    }
    async findByPhone() {
      return undefined
    }
    async attachSubject() {}
    async listMemberships() {
      return this.vinculos
    }
    async findMembership(companyId: string) {
      return this.vinculos.find((v) => v.companyId === companyId)
    }
    async createUserWithAccess() {
      throw new Error('nao usado')
    }
    async grantAccess() {
      throw new Error('nao usado')
    }
  })()

  const provider = new FakeIdentityProvider()
  /* O falso so conhece o que foi registrado — e o que o torna util: credencial
     errada e errada de verdade, nao "qualquer coisa passa". */
  provider.registrar(CREDENCIAL.identifier, CREDENCIAL.secret, {
    subject: 'sub-marta',
    email: CREDENCIAL.identifier,
  })
  const deps = {
    provider,
    users,
    sessions: new InMemorySessionIssuer(),
    throttle: new InMemoryLoginThrottle(),
    audit: new InMemoryAuditTrail(),
  } as unknown as AuthDeps

  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  registerSession(app, deps.sessions)
  registerAuthRoutes(app, deps)

  /* Rota protegida de mentira, para provar o efeito do plugin de sessao. */
  app.get('/protegida', async (request) => {
    const ctx = requireContext(request)
    return { companyId: ctx.companyId, role: ctx.role }
  })

  return { app, deps, users }
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

const entrar = (a: FastifyInstance) =>
  a.inject({ method: 'POST', url: '/auth/login', payload: CREDENCIAL })

describe('leitura do cabecalho', () => {
  const req = (authorization?: string) =>
    ({ headers: authorization === undefined ? {} : { authorization } }) as never

  it('le o token depois de Bearer', () => {
    expect(lerToken(req('Bearer abc123'))).toBe('abc123')
  })

  it.each([undefined, '', 'abc123', 'Basic abc', 'Bearer ', 'Bearer    '])(
    'ignora %s',
    (header) => {
      expect(lerToken(req(header))).toBeUndefined()
    },
  )
})

describe('entrar — RF-119', () => {
  it('devolve token, vinculos e nome', async () => {
    const c = buildApp()
    app = c.app

    const r = await entrar(app)

    expect(r.statusCode).toBe(200)
    expect(r.json().token).toBeTruthy()
    expect(r.json().userName).toBe('Marta')
    expect(r.json().memberships).toHaveLength(2)
  })

  /**
   * Quem opera mais de uma loja entra e DEPOIS escolhe (US-059). Nao e estado
   * de erro — e por isso responde 200 e nao 4xx.
   */
  it('com duas lojas, entra sem empresa ativa', async () => {
    const c = buildApp()
    app = c.app

    const r = await entrar(app)

    expect(r.json().activeCompanyId).toBeNull()
  })

  it('credencial errada responde 401', async () => {
    const c = buildApp()
    app = c.app

    const r = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { identifier: 'ninguem@x.local', secret: 'errada' },
    })

    expect(r.statusCode).toBe(401)
  })

  it('corpo invalido responde 400', async () => {
    const c = buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { identifier: '' } })

    expect(r.statusCode).toBe(400)
  })
})

/**
 * O ponto do plugin de sessao. Sessao sem empresa NAO vira principal: ela nao
 * tem papel, e um principal sem papel entraria em `assertCanWrite` como
 * `undefined` — que e como verificacao de permissao vira `if` sempre falso.
 */
describe('sessao sem empresa nao opera', () => {
  it('rota protegida responde 401 mesmo com token valido', async () => {
    const c = buildApp()
    app = c.app
    const token = (await entrar(app)).json().token

    const r = await app.inject({
      method: 'GET',
      url: '/protegida',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(r.statusCode).toBe(401)
  })

  /* Mas ela existe: `/auth/me` responde, e e como a tela sabe que precisa
     perguntar qual loja. */
  it('mas /auth/me responde, dizendo que falta escolher', async () => {
    const c = buildApp()
    app = c.app
    const token = (await entrar(app)).json().token

    const r = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(r.statusCode).toBe(200)
    expect(r.json().activeCompanyId).toBeNull()
    expect(r.json().role).toBeNull()
  })
})

describe('escolher a loja — RF-119', () => {
  async function comLojaEscolhida(companyId = 'empresa-1') {
    const c = buildApp()
    app = c.app
    const primeiro = (await entrar(app)).json().token
    const r = await app.inject({
      method: 'POST',
      url: '/auth/select-company',
      headers: { authorization: `Bearer ${primeiro}` },
      payload: { companyId },
    })
    return { c, r }
  }

  it('emite sessao com empresa e papel', async () => {
    const { r } = await comLojaEscolhida()

    expect(r.statusCode).toBe(200)
    expect(r.json().activeCompanyId).toBe('empresa-1')
  })

  it('a partir dai a rota protegida funciona, com o papel certo', async () => {
    const { r } = await comLojaEscolhida('empresa-2')

    const protegida = await app.inject({
      method: 'GET',
      url: '/protegida',
      headers: { authorization: `Bearer ${r.json().token}` },
    })

    expect(protegida.statusCode).toBe(200)
    expect(protegida.json()).toEqual({ companyId: 'empresa-2', role: 'staff' })
  })

  /* 404 e nao 403: 403 confirmaria que a loja existe para quem chutou um id. */
  it('loja sem vinculo responde 404, nao 403', async () => {
    const { r } = await comLojaEscolhida('empresa-de-outro')

    expect(r.statusCode).toBe(404)
  })

  it('sem sessao responde 401', async () => {
    const c = buildApp()
    app = c.app

    const r = await app.inject({
      method: 'POST',
      url: '/auth/select-company',
      payload: { companyId: 'empresa-1' },
    })

    expect(r.statusCode).toBe(401)
  })
})

describe('token ruim nao derruba a requisicao', () => {
  it.each([
    ['token inventado', 'Bearer nao-e-token'],
    ['prefixo errado', 'Basic abc'],
  ])('%s: segue sem principal, e a rota protegida responde 401', async (_nome, authorization) => {
    const c = buildApp()
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/protegida', headers: { authorization } })

    expect(r.statusCode).toBe(401)
  })

  /* Lancar no hook transformaria um token velho num 500 em rota PUBLICA. */
  it('token invalido nao impede entrar de novo', async () => {
    const c = buildApp()
    app = c.app

    const r = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { authorization: 'Bearer token-velho' },
      payload: CREDENCIAL,
    })

    expect(r.statusCode).toBe(200)
  })
})
