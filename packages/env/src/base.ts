import { z } from 'zod'

/**
 * Variaveis comuns a qualquer processo Node do sistema — ambientes.md#matriz.
 *
 * As chaves ficam SCREAMING_SNAKE_CASE, iguais ao nome real da variavel: o
 * objeto validado espelha o .env de proposito, para que `env.DATABASE_URL` seja
 * buscavel pelo mesmo nome nos dois lugares.
 */

export const nodeEnvSchema = z.enum(['development', 'production', 'test'], {
  errorMap: () => ({
    message: 'NODE_ENV precisa ser development, production ou test.',
  }),
})

export const logLevelSchema = z
  .enum(['debug', 'info', 'warn', 'error'], {
    errorMap: () => ({ message: 'LOG_LEVEL precisa ser debug, info, warn ou error.' }),
  })
  .default('info')

export const tzSchema = z.string().min(1, 'TZ nao pode ser vazia.').default('America/Sao_Paulo')

export const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  LOG_LEVEL: logLevelSchema,
  TZ: tzSchema,
})

export type BaseEnv = z.infer<typeof baseEnvSchema>

/**
 * Nome do provedor de um adapter — pagamentos, fiscal, WhatsApp, banking,
 * agente, autenticacao.
 *
 * Todas as seis decisoes de provedor (DEC-003 a DEC-008) seguem abertas —
 * ver docs/decisoes/README.md. Por isso o schema nao enumera nomes de
 * provedor: inventar um valor antes da decisao fechar seria pior que aceitar
 * qualquer string nao vazia. `fake` e o unico valor que o codigo hoje trata —
 * ambientes.md#modo-fake — e continua sendo o default local.
 */
export const providerSchema = z
  .string()
  .min(1, 'Nome do provedor nao pode ser vazio.')
  .default('fake')
