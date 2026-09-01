import { defineConfig } from 'vitest/config'

/**
 * Piso de cobertura — README do pacote, ligado pelo NR-010.
 *
 * Fica no `test` do pacote, e nao num passo separado da CI, para que quem
 * roda `pnpm test` na maquina veja a mesma reprovacao que veria no PR.
 * Portao que so existe no servidor e portao descoberto tarde.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      /* Barril e arquivo so de tipo nao tem logica: contariam 0% sem que
         exista o que testar, e puxariam o numero para baixo sem significado. */
      exclude: ['src/index.ts', '**/*.test.ts', '**/types/**'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
