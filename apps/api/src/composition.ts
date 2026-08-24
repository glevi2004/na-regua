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
import { Redis } from 'ioredis'

export type RedisHealth = {
  ok: boolean
  latencyMs: number
  error?: string
}

let redis: Redis | undefined

export function getRedis(url = process.env.REDIS_URL ?? 'redis://localhost:6379'): Redis {
  redis ??= new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true, retryStrategy: () => null })
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
  return checkConnection()
}

export async function shutdown(): Promise<void> {
  await Promise.allSettled([closeConnection(), redis?.quit()])
  redis = undefined
}
