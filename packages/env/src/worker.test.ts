import { describe, expect, it } from 'vitest'
import { loadWorkerEnv } from './worker.js'

const base = {
  NODE_ENV: 'development',
  REDIS_URL: 'redis://localhost:6379',
}

describe('loadWorkerEnv', () => {
  it('aceita o conjunto minimo e aplica os padroes', () => {
    const env = loadWorkerEnv(base)
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.TZ).toBe('America/Sao_Paulo')
  })

  it('nao exige DATABASE_URL — o worker ainda nao toca o banco', () => {
    expect(() => loadWorkerEnv(base)).not.toThrow()
  })

  it.each([
    [{ NODE_ENV: 'development' }, 'sem REDIS_URL'],
    [{ ...base, REDIS_URL: '' }, 'REDIS_URL vazia'],
    [{ ...base, REDIS_URL: 'postgresql://localhost/db' }, 'REDIS_URL com protocolo errado'],
    [{ ...base, NODE_ENV: 'staging' }, 'NODE_ENV com valor que nao existe'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(() => loadWorkerEnv(entrada)).toThrow()
  })
})
