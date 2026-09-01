// @ts-check
import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

/**
 * Configuracao compartilhada do monorepo.
 *
 * Formatacao NAO entra aqui — e do Prettier, e eslint-config-prettier desliga
 * qualquer regra de estilo que conflite. Discussao de formatacao em revisao de
 * codigo e tempo perdido.
 *
 * Fronteiras entre modulos tambem NAO entram aqui — sao do dependency-cruiser
 * (.dependency-cruiser.cjs), que enxerga o grafo do monorepo inteiro.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /**
     * Liga o type-checking do typescript-eslint — NR-010.
     *
     * `projectService` deixa o ESLint pedir tipos ao TypeScript em vez de
     * so olhar a arvore sintatica. Custa tempo de lint, e paga em regra que
     * sintaxe sozinha nao consegue expressar: saber se algo e uma Promise
     * exige o tipo, nao o texto.
     */
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `any` desliga o compilador exatamente onde ele mais serviria.
      '@typescript-eslint/no-explicit-any': 'error',
      // Promise nao aguardada e a origem mais comum de erro que some: a
      // funcao retorna, o erro acontece depois e ninguem captura.
      '@typescript-eslint/no-floating-promises': 'error',
      // async passado onde se espera void — o `await` some e o erro tambem.
      '@typescript-eslint/no-misused-promises': 'error',
      // `await` em algo que nao e Promise: ou sobra, ou falta um `async`.
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `catch {}` vazio e bug esperando.
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Teste pode ser mais solto: um `any` num fixture nao vaza para producao.
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
)
