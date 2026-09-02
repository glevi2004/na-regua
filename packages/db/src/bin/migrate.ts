#!/usr/bin/env tsx
/**
 * Aplica as migrations.
 *
 *   pnpm db:migrate
 *
 * Le `DATABASE_MIGRATION_URL` — o papel com `BYPASSRLS`. Nao aceita
 * `DATABASE_URL` como alternativa de proposito: a conexao da aplicacao esta
 * sujeita a RLS, e migration que roda sujeita a RLS altera as linhas de uma
 * empresa e ignora as das outras, em silencio. Errar isso e pior que nao rodar.
 */
import { loadMigrationEnv } from '@na-regua/env'
import { migrate } from '../migrate.js'

const env = loadMigrationEnv()

try {
  const { aplicadas, jaEstavam } = await migrate(env.DATABASE_MIGRATION_URL)

  if (aplicadas.length === 0) {
    console.log(`Nada a aplicar. ${jaEstavam.length} migration(s) ja no banco.`)
  } else {
    console.log(`${aplicadas.length} migration(s) aplicada(s):`)
    for (const v of aplicadas) console.log(`  + ${v}`)
    if (jaEstavam.length > 0) console.log(`${jaEstavam.length} ja estavam aplicadas.`)
  }
} catch (erro) {
  console.error(
    `\nFalha ao aplicar migrations:\n  ${erro instanceof Error ? erro.message : erro}\n`,
  )
  process.exit(1)
}
