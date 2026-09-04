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
        'canal WhatsApp deixa de aplica-la. ' +
        'A segunda excecao e a pasta do E2E (apps/api/src/e2e), e ela nao afrouxa ' +
        'a primeira: o que a regra protege e o caminho de PRODUCAO, e teste que le ' +
        'o banco nao faz canal nenhum pular regra. O E2E precisa dos dois lados por ' +
        'definicao — entra por HTTP e confere o que ficou gravado. Estreita de ' +
        'proposito: e a pasta, e nao "todo arquivo .test.ts", senao qualquer teste ' +
        'de rota poderia consultar o banco e a fronteira viraria sugestao.',
      severity: 'error',
      from: {
        path: '^apps/(api|worker)/src',
        pathNot: '(composition\\.ts$|^apps/api/src/e2e/)',
      },
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
      comment:
        'Arquivo que ninguem importa e nao exporta nada. Limitado a packages/: os ' +
        'apps usam o alias @/ declarado no tsconfig de cada um, e o cruiser roda ' +
        'com um tsconfig so (tsconfig.base.json, que nao tem paths). Sem resolver ' +
        'o alias ele nao enxerga quem importa e acusa arquivo vivo — content/site.ts, ' +
        'com 34 importadores, aparecia como orfao. Manter a regra ligada nos apps ' +
        'enterrava o sinal real em ruido: dos 17 avisos, 3 eram codigo morto de ' +
        'verdade. Procurar codigo morto em apps pede outra ferramenta.',
      severity: 'warn',
      from: {
        orphan: true,
        path: '^packages/',
        // index.ts de pacote e ponto de entrada publico, nao orfao.
        pathNot: '(\\.(d\\.ts|test\\.ts|config\\.(ts|js|mjs|cjs))|src/index\\.ts)$',
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
