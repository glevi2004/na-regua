/**
 * RAIZ DE COMPOSICAO.
 *
 * Este e o UNICO arquivo de apps/api autorizado a importar `@na-regua/db` e os
 * adapters. Ele monta o grafo de dependencias e injeta tudo em core.
 * Ver docs/arquitetura/principios.md#matriz-de-imports-permitidos
 *
 * Se um import de `db` ou de adapter aparecer fora daqui, a verificacao de
 * fronteiras na CI barra o PR — e com razao.
 */
import {
  assertRlsEnforced,
  checkConnection,
  closeConnection,
  getClient,
  type DatabaseHealth,
} from '@na-regua/db'
import { loadApiEnv } from '@na-regua/env'
import { Redis } from 'ioredis'

/**
 * Validado aqui, na raiz de composicao, antes de qualquer I/O — NR-006. Se
 * faltar variavel obrigatoria o processo lanca e nao sobe; ver
 * packages/env/README.md.
 */
export const env = loadApiEnv()

export type RedisHealth = {
  ok: boolean
  latencyMs: number
  error?: string
}

let redis: Redis | undefined

export function getRedis(url = env.REDIS_URL): Redis {
  redis ??= new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy: () => null,
  })
  return redis
}

export async function checkRedis(): Promise<RedisHealth> {
  const startedAt = performance.now()
  try {
    const client = getRedis()
    if (client.status !== 'ready') await client.connect()
    await client.ping()
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt) }
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function checkDatabase(): Promise<DatabaseHealth> {
  return checkConnection(env.DATABASE_URL)
}

export type IsolationCheck =
  | { readonly status: 'enforced'; readonly role: string }
  /** Nao deu para verificar: banco fora do ar na subida. */
  | { readonly status: 'unknown'; readonly reason: string }
  | { readonly status: 'bypassed'; readonly reason: string }

/**
 * Verifica, na subida, que a conexao da aplicacao esta sujeita a RLS.
 *
 * A CI encontrou isto do jeito caro: em um ambiente real o isolamento entre
 * empresas nao estava em vigor, porque a aplicacao conectava com um papel
 * superusuario — e superusuario ignora politica de RLS inteiramente, `FORCE
 * ROW LEVEL SECURITY` incluido. Nada dava erro; toda consulta simplesmente
 * devolvia as linhas de todas as lojas.
 *
 * A distincao entre os tres desfechos e o ponto:
 *
 * - **`bypassed`** e configuracao errada e vaza dado entre lojas. Derruba o
 *   processo. Melhor nao subir que subir sem isolamento.
 * - **`unknown`** e banco fora do ar na subida, que e indisponibilidade e nao
 *   falha de seguranca. A api sobe: `/health` ja responde 503, o orquestrador
 *   ja sabe, e recusar subir aqui deixaria nem o `/health/live` de pe.
 * - **`enforced`** e o caso normal.
 */
export async function checkIsolation(): Promise<IsolationCheck> {
  try {
    const status = await assertRlsEnforced(getClient(env.DATABASE_URL))
    return { status: 'enforced', role: status.role }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    /* A mensagem do `assertRlsEnforced` e a unica que significa "configurado
       errado". Qualquer outra falha e do caminho ate o banco. */
    return reason.includes('IGNORA as politicas de RLS')
      ? { status: 'bypassed', reason }
      : { status: 'unknown', reason }
  }
}

export async function shutdown(): Promise<void> {
  await Promise.allSettled([closeConnection(), redis?.quit()])
  redis = undefined
}
