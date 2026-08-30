import { loadWorkerEnv } from '@na-regua/env'
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { DEFAULT_JOB_OPTIONS, QUEUES, type QueueName } from './queues.js'

/**
 * Validado no topo do processo, antes de qualquer conexao — NR-006. Antes
 * disso, REDIS_URL ausente caia de volta para 'redis://localhost:6379' sem
 * avisar: inofensivo em dev, perigoso se a mesma falta acontecer fora dele.
 */
const env = loadWorkerEnv()
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

const log = (msg: string, extra: Record<string, unknown> = {}): void => {
  // RNF-058: log estruturado desde o inicio.
  console.log(JSON.stringify({ level: 'info', service: 'worker', msg, ...extra }))
}

const queues = new Map<QueueName, Queue>()
const workers: Worker[] = []

for (const name of Object.values(QUEUES)) {
  queues.set(name, new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }))

  workers.push(
    new Worker(
      name,
      async (job) => {
        // Consumidores reais entram com os casos de uso de core.
        // Ver docs/processo/task-ledger.md (NR-041 em diante).
        log('job recebido (sem consumidor implementado)', { queue: name, jobId: job.id })
        return { skipped: true }
      },
      { connection, concurrency: 5 },
    ),
  )
}

connection.on('ready', () => log('conectado ao Redis', { url: env.REDIS_URL }))
connection.on('error', (error: Error) =>
  console.error(JSON.stringify({ level: 'error', service: 'worker', msg: error.message })),
)

log('worker iniciado', { queues: Object.values(QUEUES) })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      log(`${signal} recebido, encerrando`)
      await Promise.allSettled(workers.map((w) => w.close()))
      await Promise.allSettled([...queues.values()].map((q) => q.close()))
      await connection.quit()
      process.exit(0)
    })()
  })
}
