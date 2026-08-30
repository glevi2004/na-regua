import { describe, expect, it } from 'vitest'
import { type AuthenticatedPrincipal, buildExecutionContext } from './execution-context.js'

const principal: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

describe('buildExecutionContext', () => {
  it('leva empresa, usuario e papel do principal, nunca da requisicao', () => {
    const ctx = buildExecutionContext(principal, { requestId: 'req-1' })
    expect(ctx.companyId).toBe('empresa-1')
    expect(ctx.userId).toBe('usuario-1')
    expect(ctx.role).toBe('owner')
  })

  it('assume canal app quando nao informado', () => {
    expect(buildExecutionContext(principal, { requestId: 'req-1' }).channel).toBe('app')
  })

  it('aceita outro canal — e o unico campo que distingue as origens', () => {
    const ctx = buildExecutionContext(principal, { requestId: 'req-1', channel: 'whatsapp' })
    expect(ctx.channel).toBe('whatsapp')
  })

  it('omite idempotencyKey quando nao veio, em vez de gravar undefined', () => {
    const ctx = buildExecutionContext(principal, { requestId: 'req-1' })
    expect('idempotencyKey' in ctx).toBe(false)
  })

  it('carrega idempotencyKey quando veio', () => {
    const ctx = buildExecutionContext(principal, { requestId: 'req-1', idempotencyKey: 'chave-1' })
    expect(ctx.idempotencyKey).toBe('chave-1')
  })

  it('usa o relogio injetado', () => {
    const now = new Date('2026-08-28T12:00:00.000Z')
    expect(buildExecutionContext(principal, { requestId: 'req-1', now }).now).toBe(now)
  })
})
