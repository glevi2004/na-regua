import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A logica dos tres desfechos de `checkIsolation`.
 *
 * Vale um teste porque e facil de inverter, e inverter tem consequencia
 * assimetrica: tratar `bypassed` como `unknown` faz a api subir servindo dados
 * de todas as lojas — que foi o estado real de um ambiente ate a CI notar.
 * Tratar `unknown` como `bypassed` so causa indisponibilidade.
 */

const db = vi.hoisted(() => ({
  assertRlsEnforced: vi.fn(),
  getClient: vi.fn(() => ({}) as never),
  checkConnection: vi.fn(),
  closeConnection: vi.fn(),
}))

vi.mock('@na-regua/db', () => db)

vi.mock('ioredis', () => ({
  Redis: class {
    status = 'ready'
    async connect(): Promise<void> {}
    async ping(): Promise<string> {
      return 'PONG'
    }
    async quit(): Promise<void> {}
  },
}))

/** O minimo que `loadApiEnv` exige, senao o modulo nem carrega. */
const AMBIENTE = {
  NODE_ENV: 'test',
  API_URL: 'http://localhost:3333',
  DATABASE_URL: 'postgresql://app:app@localhost:5432/naregua',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'apenas-para-teste',
}

async function carregar() {
  vi.resetModules()
  for (const [chave, valor] of Object.entries(AMBIENTE)) vi.stubEnv(chave, valor)
  return import('./composition.js')
}

describe('checkIsolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devolve enforced quando o papel nao escapa da politica', async () => {
    db.assertRlsEnforced.mockResolvedValue({
      role: 'naregua_app',
      isSuperuser: false,
      bypassesRls: false,
      enforced: true,
    })
    const { checkIsolation } = await carregar()

    expect(await checkIsolation()).toEqual({ status: 'enforced', role: 'naregua_app' })
  })

  it('devolve bypassed quando o papel ignora a politica', async () => {
    /* A mensagem e a do `assertRlsEnforced` de verdade: e por ela que os dois
       casos de falha se distinguem. */
    db.assertRlsEnforced.mockRejectedValue(
      new Error(
        'A conexao da aplicacao usa o papel "naregua", que e superusuario — e por isso ' +
          'IGNORA as politicas de RLS. O isolamento entre empresas nao estaria em vigor.',
      ),
    )
    const { checkIsolation } = await carregar()

    const r = await checkIsolation()
    /* Este e o desfecho que derruba o processo. Confundi-lo com `unknown`
       faria a api subir servindo dados de todas as lojas. */
    expect(r.status).toBe('bypassed')
  })

  it('devolve unknown quando o banco esta fora do ar', async () => {
    db.assertRlsEnforced.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'))
    const { checkIsolation } = await carregar()

    const r = await checkIsolation()
    /*
     * Indisponibilidade nao e falha de seguranca. Recusar subir aqui deixaria
     * nem o `/health/live` de pe, e o `/health` ja responde 503.
     */
    expect(r.status).toBe('unknown')
    if (r.status !== 'unknown') return
    expect(r.reason).toContain('ECONNREFUSED')
  })

  it('nao confunde erro de banco com configuracao errada', async () => {
    db.assertRlsEnforced.mockRejectedValue(new Error('timeout expired'))
    const { checkIsolation } = await carregar()

    expect((await checkIsolation()).status).not.toBe('bypassed')
  })
})
