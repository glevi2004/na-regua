/**
 * Traducao executavel da matriz de imports de
 * docs/arquitetura/principios.md#matriz-de-imports-permitidos
 *
 * Regra que so existe em documento e regra que ja foi quebrada — so ninguem
 * percebeu ainda (RNF-065). Este arquivo e o que impede isso.
 *
 *   pnpm boundaries
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-sem-io',
      comment:
        'packages/domain e puro: sem I/O, sem framework, sem rede. Regra que toca ' +
        'banco nao e testavel em milissegundos, e por isso deixa de ser testada.',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: '^(packages/(db|core|contracts|agent|fiscal|whatsapp|banking|billing|payments|ui)|apps)|^node_modules/(postgres|ioredis|bullmq|fastify|drizzle)',
      },
    },
    {
      name: 'handler-nao-importa-db',
      comment:
        'Somente a raiz de composicao (composition.ts) pode importar @na-regua/db. ' +
        'Se um handler consulta o banco direto, a regra migra para a rota e o ' +
        'canal WhatsApp deixa de aplica-la.',
      severity: 'error',
      from: { path: '^apps/(api|worker)/src', pathNot: 'composition\\.ts$' },
      to: { path: '^packages/db' },
    },
    {
      name: 'app-nao-importa-domain',
      comment:
        'Calculo chamado direto pelo app e calculo que o agente nao faz igual. ' +
        'Passe por core.',
      severity: 'error',
      from: { path: '^apps' },
      to: { path: '^packages/domain' },
    },
    {
      name: 'adapter-nao-importa-core',
      comment:
        'A seta aponta para dentro. Adapter que conhece core nao e substituivel — ' +
        'ele implementa uma porta declarada por core, e so.',
      severity: 'error',
      from: { path: '^packages/(fiscal|whatsapp|banking|billing|payments)' },
      to: { path: '^packages/(core|db|domain)' },
    },
    {
      name: 'cliente-nao-importa-nucleo',
      comment: 'mobile e web falam com a API por HTTP; nao importam core nem db.',
      severity: 'error',
      from: { path: '^apps/(mobile|web)' },
      to: { path: '^packages/(core|db|domain)' },
    },
    {
      name: 'sem-ciclo',
      comment: 'Dependencia circular entre modulos.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sem-orfao',
      comment: 'Arquivo que ninguem importa e nao exporta nada.',
      severity: 'warn',
      from: {
        orphan: true,
        // index.ts de pacote e ponto de entrada publico, nao orfao.
        pathNot:
          '(\\.(d\\.ts|test\\.ts|config\\.(ts|js|mjs|cjs))|src/index\\.ts|migrate-cli\\.ts)$',
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist|\\.next|\\.expo|\\.turbo)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require'] },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
