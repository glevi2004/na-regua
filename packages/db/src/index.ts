/**
 * Schema Drizzle, migrations, politicas RLS.
 *
 * O Postgres materializa o catalogo enxuto de docs/arquitetura/dados.md.
 * A aplicacao conecta como naregua_app (RLS). Migrations usam
 * DATABASE_MIGRATION_URL (BYPASSRLS).
 */
import postgres from 'postgres'

export type DatabaseHealth = {
  ok: boolean
  latencyMs: number
  version?: string
  error?: string
}

let client: postgres.Sql | undefined

/** Cliente compartilhado. Criado na raiz de composicao, nunca dentro de um caso de uso. */
export function getClient(connectionString = process.env.DATABASE_URL): postgres.Sql {
  if (!connectionString) {
    throw new Error('DATABASE_URL nao definida. Rode `pnpm setup` ou copie .env.example para .env')
  }
  client ??= postgres(connectionString, { max: 10, onnotice: () => {} })
  return client
}

export async function checkConnection(connectionString?: string): Promise<DatabaseHealth> {
  const startedAt = performance.now()
  try {
    const sql = getClient(connectionString)
    const rows = await sql<{ version: string }[]>`SELECT version() as version`
    const version = rows[0]?.version.split(' ').slice(0, 2).join(' ')
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - startedAt),
      ...(version === undefined ? {} : { version }),
    }
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function closeConnection(): Promise<void> {
  await client?.end({ timeout: 5 })
  client = undefined
}

export {
  applyMigration,
  ensureRoles,
  getAppDatabaseUrl,
  getBootstrapUrl,
  resolveTestDatabaseUrl,
} from './migrate.js'
export * from './schema.js'
export { withTenant } from './tenant.js'
