import { describe, expect, it } from 'vitest'
import { loadMigrationEnv } from './migration.js'

const base = {
  DATABASE_MIGRATION_URL: 'postgresql://naregua_migrator:naregua@localhost:5432/naregua',
}

describe('loadMigrationEnv', () => {
  it('aceita a URL do papel de migration', () => {
    expect(loadMigrationEnv(base).DATABASE_MIGRATION_URL).toBe(base.DATABASE_MIGRATION_URL)
  })

  it('aceita o esquema curto postgres://', () => {
    const url = 'postgres://naregua_migrator:naregua@localhost:5432/naregua'
    expect(loadMigrationEnv({ DATABASE_MIGRATION_URL: url }).DATABASE_MIGRATION_URL).toBe(url)
  })

  it('falha quando ausente, dizendo o que fazer', () => {
    expect.assertions(2)
    try {
      loadMigrationEnv({})
    } catch (error) {
      const msg = (error as Error).message
      expect(msg).toContain('DATABASE_MIGRATION_URL')
      /* Mensagem que diz o proximo passo, nao so o que faltou — RNF-054. */
      expect(msg).toContain('pnpm setup')
    }
  })

  it.each([
    ['', 'vazia'],
    ['mysql://naregua@localhost:3306/naregua', 'banco que nao e Postgres'],
    ['localhost:5432/naregua', 'sem esquema'],
    ['naregua_migrator:naregua@localhost:5432/naregua', 'sem esquema, com credencial'],
  ])('recusa %o (%s)', (url, _motivo) => {
    expect(() => loadMigrationEnv({ DATABASE_MIGRATION_URL: url })).toThrow(
      /DATABASE_MIGRATION_URL/,
    )
  })

  it('nao aceita DATABASE_URL no lugar dela', () => {
    /*
     * A separacao e o ponto: `DATABASE_URL` esta sujeita a RLS e
     * `DATABASE_MIGRATION_URL` aponta para o papel com BYPASSRLS. Aceitar uma
     * como substituta da outra faria a migration rodar filtrada por empresa —
     * alterando as linhas de uma loja e ignorando as das outras, em silencio.
     */
    expect(() =>
      loadMigrationEnv({ DATABASE_URL: 'postgresql://naregua@localhost:5432/naregua' }),
    ).toThrow(/DATABASE_MIGRATION_URL/)
  })
})
