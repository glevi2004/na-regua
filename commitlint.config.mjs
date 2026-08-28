/**
 * Conventional Commits — docs/engenharia/git-workflow.md#commits
 *
 * A lista de escopos e FECHADA e derivada dos modulos do monorepo. E isso que
 * da valor real ao padrao aqui: permite ler o historico de um pacote so.
 * `feat(pagamentos):` e rejeitado — o escopo tem que ser um modulo real.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        // apps
        'api',
        'worker',
        'mobile',
        'web',
        // nucleo
        'core',
        'domain',
        'contracts',
        'db',
        'money',
        // adaptadores
        'agent',
        'fiscal',
        'whatsapp',
        'banking',
        'billing',
        'payments',
        // interface
        'ui',
        // transversais
        'infra',
        'docs',
        'repo',
      ],
    ],
    'scope-empty': [2, 'never'],
    // Proibe o assunto INTEIRO em caixa alta, title case ou sentence case —
    // mas permite nome proprio e sigla no meio (CI/CD, GitHub, WhatsApp,
    // PagMaxx, Pix, NFC-e). A forma 'always lower-case' rejeitaria todos eles,
    // o que num projeto em pt-br cheio de nome de fornecedor e inviavel.
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
}
