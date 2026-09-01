import Fastify, { type FastifyInstance } from 'fastify'
import type { IncomingMessage } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  REQUEST_ID_HEADER,
  buildLoggerOptions,
  generateRequestId,
  registerLogging,
} from './logging.js'

/** Requisicao minima: `generateRequestId` so olha os cabecalhos. */
function req(headers: Record<string, unknown>): IncomingMessage {
  return { headers } as unknown as IncomingMessage
}

describe('generateRequestId', () => {
  it('reaproveita o id de quem chamou, para a operacao ser seguivel', () => {
    expect(generateRequestId(req({ [REQUEST_ID_HEADER]: 'req-do-gateway-42' }))).toBe(
      'req-do-gateway-42',
    )
  })

  it('gera um id quando nao veio nenhum', () => {
    const id = generateRequestId(req({}))

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  /*
   * Aceitar o cabecalho cru deixaria qualquer cliente escrever no nosso log.
   * Quebra de linha e o caso grave: forja uma entrada inteira.
   */
  it.each([
    ['linha\nfalsa', 'quebra de linha'],
    ['tem espaco', 'espaco'],
    ['{"json":true}', 'caractere de estrutura'],
    ['x'.repeat(65), 'longo demais'],
    ['', 'vazio'],
    ['   ', 'so espaco'],
  ])('descarta %j (%s) e gera um proprio', (valor, _motivo) => {
    const id = generateRequestId(req({ [REQUEST_ID_HEADER]: valor }))

    expect(id).not.toBe(valor)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('descarta cabecalho repetido, que chega como array', () => {
    const id = generateRequestId(req({ [REQUEST_ID_HEADER]: ['a', 'b'] }))

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('buildLoggerOptions', () => {
  it('esconde credencial de cabecalho', () => {
    const { redact } = buildLoggerOptions('info')

    expect(redact.paths).toContain('req.headers.authorization')
    expect(redact.paths).toContain('req.headers.cookie')
    expect(redact.censor).toBe('[oculto]')
  })

  it.each(['*.cpf', '*.email', '*.telefone', '*.password', '*.token'])(
    'esconde %s — RNF-034',
    (caminho) => {
      expect(buildLoggerOptions('info').redact.paths).toContain(caminho)
    },
  )
})

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

describe('requestId na resposta', () => {
  it('devolve o cabecalho para o suporte correlacionar com o log', async () => {
    app = Fastify({ logger: false, genReqId: generateRequestId })
    registerLogging(app)
    app.get('/x', async () => ({ ok: true }))

    const res = await app.inject({ method: 'GET', url: '/x' })

    expect(res.headers[REQUEST_ID_HEADER]).toBeTruthy()
  })

  it('devolve o mesmo id que recebeu', async () => {
    app = Fastify({ logger: false, genReqId: generateRequestId })
    registerLogging(app)
    app.get('/x', async () => ({ ok: true }))

    const res = await app.inject({
      method: 'GET',
      url: '/x',
      headers: { [REQUEST_ID_HEADER]: 'req-externo-7' },
    })

    expect(res.headers[REQUEST_ID_HEADER]).toBe('req-externo-7')
  })
})
