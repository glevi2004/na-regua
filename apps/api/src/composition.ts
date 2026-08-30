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
import { checkConnection, closeConnection, type DatabaseHealth } from '@na-regua/db'
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

export async function shutdown(): Promise<void> {
  await Promise.allSettled([closeConnection(), redis?.quit()])
  redis = undefined
}
