import { z } from 'zod'
import { baseEnvSchema } from './base.js'
import { parseEnv } from './parse.js'

/**
 * Variaveis que `apps/worker` precisa para subir.
 *
 * DATABASE_URL fica fora por enquanto: o worker ainda nao tem raiz de
 * composicao nem toca o banco (ver apps/worker/README.md) — os consumidores
 * reais entram a partir do NR-041. Exigir a variavel antes disso barraria o
 * boot por algo que o processo nao usa.
 */
export const workerEnvSchema = baseEnvSchema.extend({
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL e obrigatoria. Copie .env.example para .env ou rode `pnpm setup`.')
    .regex(/^rediss?:\/\//, 'REDIS_URL precisa comecar com redis:// ou rediss://.'),
})

export type WorkerEnv = z.infer<typeof workerEnvSchema>

/** Valida `process.env` para `apps/worker`. Chame uma vez, no topo do processo. */
export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return parseEnv(workerEnvSchema, source, '@na-regua/worker')
}
