import type postgres from 'postgres'

/**
 * Define o tenant na transação (`set_config` local). Sem isso o RLS recusa a consulta.
 */
export async function withTenant<T>(
  sql: postgres.Sql,
  companyId: string,
  run: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.company_id', ${companyId}, true)`
    return run(tx)
  })
  return result as T
}
