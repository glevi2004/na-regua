import { applyMigration, ensureRoles, getBootstrapUrl } from './migrate.js'

const migrationUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
if (!migrationUrl) {
  throw new Error('DATABASE_MIGRATION_URL ou DATABASE_URL e obrigatoria para migrar.')
}

await ensureRoles(getBootstrapUrl(migrationUrl))
await applyMigration(migrationUrl)
