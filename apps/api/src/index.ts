import Fastify from 'fastify'
import { checkDatabase, checkRedis, env, shutdown } from './composition.js'

// RNF-058: log estruturado (JSON). requestId/companyId/userId entram com NR-030.
const app = Fastify({
  logger: { level: env.LOG_LEVEL },
})

/**
 * Saude da aplicacao e das dependencias.
 * Responde 200 so quando TODAS estao saudaveis — health check que sempre
 * responde 200 nao serve para nada.
 */
app.get('/health', async (_request, reply) => {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()])
  const ok = database.ok && redis.ok

  return reply.code(ok ? 200 : 503).send({
    status: ok ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database, redis },
  })
})

/** Liveness: o processo esta de pe? Nao toca em dependencia externa. */
app.get('/health/live', async () => ({ status: 'ok' }))

async function main(): Promise<void> {
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' })
    app.log.info(`api ouvindo em http://localhost:${env.API_PORT} — saude em /health`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      app.log.info(`${signal} recebido, encerrando`)
      await app.close()
      await shutdown()
      process.exit(0)
    })()
  })
}

void main()
