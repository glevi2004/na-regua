import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  //
  // Os padroes precisam do `**/` na frente: sem ele o eslint nao poda o
  // diretorio durante a varredura e acaba lintando a saida de build — eram
  // 211 erros e 3989 avisos vindos de `.next/`, todos falsos.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
