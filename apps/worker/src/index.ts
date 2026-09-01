import { loadWorkerEnv } from '@na-regua/env'
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { log, safeUrl } from './logging.js'
import { DEFAULT_JOB_OPTIONS, QUEUES, type QueueName } from './queues.js'

/**
 * Validado no topo do processo, antes de qualquer conexao — NR-006. Antes
 * disso, REDIS_URL ausente caia de volta para 'redis://localhost:6379' sem
 * avisar: inofensivo em dev, perigoso se a mesma falta acontecer fora dele.
 */
const env = loadWorkerEnv()
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

const queues = new Map<QueueName, Queue>()
const workers: Worker[] = []

for (const name of Object.values(QUEUES)) {
  queues.set(name, new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }))

  const worker = new Worker(
    name,
    async (job) => {
      // Consumidores reais entram com os casos de uso de core.
      // Ver docs/processo/task-ledger.md (NR-041 em diante).
      log('info', 'job recebido (sem consumidor implementado)', {
        queue: name,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      })
      return { skipped: true }
    },
    { connection, concurrency: 5 },
  )

  /*
   * Falha de job precisa aparecer identificada — RNF-062 exige que ela fique
   * visivel, e "algo falhou" sem fila nem tentativa nao e visibilidade.
   * `attemptsMade` distingue uma falha que se repete de falhas diferentes.
   */
  worker.on('failed', (job, erro) => {
    log('error', 'job falhou', {
      queue: name,
      jobId: job?.id,
      attempt: (job?.attemptsMade ?? 0) + 1,
      maxAttempts: DEFAULT_JOB_OPTIONS.attempts,
      /* Mensagem, nunca a stack: log agregado nao ganha nada com ela. */
      error: erro.message,
    })
  })

  workers.push(worker)
}

/* `safeUrl` e nao `env.REDIS_URL`: a URL carrega usuario e senha — RNF-022. */
connection.on('ready', () => log('info', 'conectado ao Redis', { redis: safeUrl(env.REDIS_URL) }))
connection.on('error', (erro: Error) => log('error', 'falha no Redis', { error: erro.message }))

log('info', 'worker iniciado', { queues: Object.values(QUEUES) })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      log('info', `${signal} recebido, encerrando`)
      await Promise.allSettled(workers.map((w) => w.close()))
      await Promise.allSettled([...queues.values()].map((q) => q.close()))
      await connection.quit()
      process.exit(0)
    })()
  })
}
