/**
 * Schema Drizzle, migrations, politicas RLS e repositorios.
 *
 * A estrategia de isolamento esta decidida: RLS por linha, `company_id` em toda
 * tabela de negocio mais politica no PostgreSQL — ADR-0001, origem DEC-002.
 * Ver docs/arquitetura/dados.md#multi-tenant para as consequencias que valem
 * para todo o codigo (FORCE ROW LEVEL SECURITY, consulta sem `app.company_id`
 * falha, migrations com papel separado).
 *
 * Por enquanto este pacote so expoe a conexao e a verificacao de saude usadas
 * pela raiz de composicao de apps/api e apps/worker. O schema nasce na NR-007.
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
