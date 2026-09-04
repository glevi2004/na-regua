import { randomUUID } from 'node:crypto'
import { getClient, migrate, withTenant } from '@na-regua/db'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerRateLimit } from '../plugins/rate-limit.js'
import { registerCadastroRoutes } from '../routes/cadastro.js'
import { registerSaleRoutes } from '../routes/sales.js'

/**
 * O caminho critico, ponta a ponta — NR-049.
 *
 * ## Por que pela API e nao pelo navegador
 *
 * `docs/engenharia/testes.md` descreve tres fluxos E2E "no navegador". Hoje
 * nenhum deles atravessa o navegador de ponta a ponta, e o motivo nao e o
 * teste:
 *
 * - o web NAO tem rota de BFF para `/empresas` nem para `/sales`, entao o
 *   onboarding e a venda nao existem pela tela;
 * - o fluxo 3 (cobranca no WhatsApp -> link de pagamento -> baixa por webhook)
 *   nao tem NENHUMA rota na api.
 *
 * Um Playwright contra as telas de hoje exercitaria mock. Suite verde que prova
 * nada e pior que suite nenhuma, porque cria confianca sem lastro — e o proprio
 * documento diz que "tres testes E2E confiaveis valem mais que trinta que
 * falham aleatoriamente".
 *
 * Entao este teste sobe a api DE VERDADE — rotas reais, composicao real,
 * repositorios reais, Postgres real — e atravessa HTTP -> rota -> `core` ->
 * `db`. E a camada onde os defeitos desta base tem aparecido: dependencia nao
 * declarada, fiacao errada na composicao, SQL que nunca rodou.
 *
 * ## O que ele NAO cobre, e por que
 *
 * A sessao. Nao existe rota de login (so `/auth/me`), entao nao ha como obter
 * um token por HTTP. A identidade e injetada, e o que se prova daqui para baixo
 * e o resto do caminho. Quando a NR-014 fechar, o `onRequest` de teste sai e o
 * fluxo comeca no login.
 */

const DATABASE_URL = process.env.DATABASE_URL
const MIGRATION_URL = process.env.DATABASE_MIGRATION_URL ?? DATABASE_URL

/**
 * `composition.js` entra por import DINAMICO, dentro do `beforeAll`.
 *
 * Ele valida o ambiente no topo do modulo (NR-006) e LANCA se faltar variavel.
 * Importado estaticamente, o arquivo nem chega a ser coletado numa maquina sem
 * `.env` completo — e derruba a suite inteira de `apps/api`, inclusive os
 * testes de rota que nao precisam de banco nenhum. O `skipIf` protege o que
 * roda, nao o que o modulo faz ao ser carregado.
 */
type Composicao = typeof import('../composition.js')

describe.skipIf(!DATABASE_URL)('caminho critico — NR-049', () => {
  let app: FastifyInstance
  let usuario: string

  /*
   * O MESMO cliente que a api usa, e nao uma conexao propria.
   *
   * `postgres` nem e dependencia declarada de `apps/api` — abrir uma conexao
   * paralela aqui pediria uma. E ler pelo caminho da aplicacao, sujeito a RLS
   * como ela, e mais honesto: uma assercao que so passa por fora da politica
   * nao prova nada sobre o que o lojista veria.
   */
  let composicao: Composicao

  const sql = () => getClient(DATABASE_URL!)

  /**
   * Mutavel de proposito: no onboarding ainda nao existe empresa, e a partir
   * dele toda chamada corre sob a que acabou de nascer. E o que torna o teste
   * um FLUXO em vez de chamadas soltas com dados montados a mao.
   */
  let principal: AuthenticatedPrincipal

  const EAN = `789${Date.now()}`.slice(0, 13)
  const CNPJ = `5${Date.now()}`.slice(0, 14)

  beforeAll(async () => {
    /*
     * O job Verificar da CI fornece DATABASE_URL, DATABASE_MIGRATION_URL e
     * REDIS_URL, e mais nada. `loadApiEnv` exige tambem API_URL e JWT_SECRET,
     * e lanca sem eles — foi assim que este arquivo reprovou na primeira
     * rodada.
     *
     * Preenchidos aqui, e nao no workflow: sao exigencia do VALIDADOR, nao
     * deste teste. O E2E nao emite nem verifica token (nao ha rota de login),
     * entao um segredo de mentira e honesto — e por o segredo de verdade no
     * workflow seria pedir uma variavel de CI para um caminho que ninguem
     * exercita. O `??` deixa o ambiente real vencer, se algum dia houver um.
     */
    vi.stubEnv('API_URL', process.env.API_URL ?? 'http://localhost:3333')
    vi.stubEnv('JWT_SECRET', process.env.JWT_SECRET ?? 'segredo-que-o-e2e-nao-usa')

    composicao = await import('../composition.js')

    await migrate(MIGRATION_URL!)

    usuario = randomUUID()
    const placeholder = randomUUID()

    /* O usuario existe antes da empresa porque `created_by` referencia
       `users`. Gravado dentro de um tenant, como todo acesso desta base. */
    await withTenant(
      sql(),
      placeholder,
      (tx) => tx`
        INSERT INTO users (id, name, email)
        VALUES (${usuario}, 'Operadora', ${`e2e-${usuario}@local`})
      `,
    )

    principal = { companyId: placeholder, userId: usuario, role: 'owner' }

    app = Fastify({ logger: false })
    registerErrorHandler(app)
    await registerRateLimit(app)

    /* A unica coisa falsa deste teste. Ver o cabecalho sobre a NR-014. */
    app.addHook('onRequest', async (request) => {
      request.principal = principal
    })

    /* Os MESMOS construtores que o `index.ts` usa. E o que faz este teste pegar
       fiacao errada na composicao — o defeito que os testes de rota, com
       dependencia falsa, nao conseguem ver. */
    registerCadastroRoutes(app, composicao.buildCadastroDeps())
    registerSaleRoutes(app, composicao.buildSaleDeps())

    await app.ready()
  }, 90_000)

  afterAll(async () => {
    await app?.close()

    /*
     * Guarda para o caso de o `beforeAll` ter falhado.
     *
     * Sem ela, a limpeza estoura em `principal.companyId` indefinido e o
     * relatorio mostra ESSE erro no lugar do que realmente quebrou — foi o que
     * aconteceu aqui: a causa era variavel de ambiente faltando, e a CI acusou
     * "Cannot read properties of undefined".
     */
    if (composicao === undefined || principal === undefined) {
      vi.unstubAllEnvs()
      return
    }

    /* Da folha para a raiz, na ordem das chaves estrangeiras. */
    await withTenant(sql(), principal.companyId, async (tx) => {
      await tx`DELETE FROM inventory_movements`
      await tx`DELETE FROM receivables`
      await tx`DELETE FROM payments`
      await tx`DELETE FROM sale_items`
      await tx`DELETE FROM sales`
      await tx`DELETE FROM company_counters`
      await tx`DELETE FROM accounts`
      await tx`DELETE FROM products`
      await tx`DELETE FROM customers`
      await tx`DELETE FROM companies`
      await tx`DELETE FROM users WHERE id = ${usuario}`
    })

    /* Fecha o cliente compartilhado: e o mesmo que a api usa, e deixa-lo aberto
       segura o processo do vitest. */
    await composicao.shutdown()
    vi.unstubAllEnvs()
  })

  /*
   * Um `it` por etapa, na ordem, e nao um teste gigante.
   *
   * O fluxo tem estado — a empresa nasce no primeiro e e usada nos seguintes —
   * entao a ordem E o contrato aqui, ao contrario dos testes de unidade. A
   * vantagem sobre um `it` unico e o diagnostico: quando quebra, o nome do caso
   * ja diz em que degrau do caminho critico o sistema parou.
   */

  let produtoId: string
  let vendaNumero: number

  describe('fluxo 1 — onboarding ate a primeira venda', () => {
    it('cadastra a empresa e ela ja nasce com plano de contas', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/empresas',
        payload: {
          legalName: 'Mercearia do Caminho Critico LTDA',
          cnpj: CNPJ,
          email: `contato@${CNPJ}.local`,
          phone: '41999990000',
        },
      })

      expect(r.statusCode).toBe(201)

      /* Daqui para a frente, tudo corre sob a empresa que acabou de nascer. */
      principal = { ...principal, companyId: r.json().id }

      /* RF-081: o plano padrao e semeado no onboarding. Sem isto o lojista abre
         a tela de classificacao vazia e a resposta pratica dele e nao
         classificar nada — o que reduz o DRE a uma linha so. */
      const contas = await withTenant(
        sql(),
        principal.companyId,
        (tx) => tx<{ total: string }[]>`SELECT count(*) AS total FROM accounts`,
      )
      expect(Number(contas[0]!.total)).toBeGreaterThan(0)
    })

    it('cadastra o produto que sera vendido', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/produtos',
        payload: {
          description: 'Cafe torrado 500g',
          unitOfMeasure: 'un',
          salePriceCents: 1990,
          costPriceCents: 1200,
          barcode: EAN,
          stock: 10,
        },
      })

      expect(r.statusCode).toBe(201)
      produtoId = r.json().id
    })

    it('registra a primeira venda', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': randomUUID() },
        payload: {
          items: [{ productId: produtoId, quantity: 1, unitPriceCents: 1990 }],
          payments: [{ method: 'cash', amountCents: 1990 }],
        },
      })

      expect(r.statusCode).toBe(201)
      expect(r.json().sale.netAmountCents).toBe(1990)
      vendaNumero = r.json().sale.number
    })
  })

  describe('fluxo 2 — leitura do codigo de barras ate o recebivel', () => {
    it('acha o produto pelo codigo lido no balcao', async () => {
      const r = await app.inject({ method: 'GET', url: `/produtos/codigo-de-barras/${EAN}` })

      expect(r.statusCode).toBe(200)
      expect(r.json().id).toBe(produtoId)
    })

    it('codigo que nao existe volta 404, e nao lista vazia', async () => {
      const r = await app.inject({ method: 'GET', url: '/produtos/codigo-de-barras/0000000000000' })

      /* O balcao precisa distinguir "cadastro a fazer" de "cadastro feito e
         zerado". Lista vazia confundiria os dois. */
      expect(r.statusCode).toBe(404)
    })

    it('venda no credito parcelado gera os recebiveis', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': randomUUID() },
        payload: {
          items: [{ productId: produtoId, quantity: 2, unitPriceCents: 1990 }],
          payments: [{ method: 'credit', amountCents: 3980, installments: 2 }],
        },
      })

      expect(r.statusCode).toBe(201)

      const linhas = await withTenant(
        sql(),
        principal.companyId,
        (tx) => tx<{ id: string; net_amount_cents: string }[]>`
          SELECT id, net_amount_cents FROM receivables
          WHERE sale_id = ${r.json().sale.id}
          ORDER BY due_date
        `,
      )

      /* Duas parcelas, dois recebiveis. E o liquido de cada um vem MENOR que a
         metade do bruto: a diferenca e a tarifa da adquirente, que o sistema ja
         calculou na venda (RF-036) — e e por isso que a conciliacao compara o
         extrato com o liquido, e nao com o bruto. */
      expect(linhas).toHaveLength(2)
      for (const l of linhas) expect(Number(l.net_amount_cents)).toBeLessThan(1990)
    })

    it('a venda numerou em sequencia, sem repetir', async () => {
      const linhas = await withTenant(
        sql(),
        principal.companyId,
        (tx) => tx<{ number: number }[]>`SELECT number FROM sales ORDER BY number`,
      )

      expect(linhas.map((l) => l.number)).toEqual([vendaNumero, vendaNumero + 1])
    })
  })

  describe('o reenvio do PDV com internet ruim — RNF-043', () => {
    it('a mesma chave devolve a MESMA venda, com 200 em vez de 201', async () => {
      const chave = randomUUID()
      const corpo = {
        items: [{ productId: produtoId, quantity: 1, unitPriceCents: 1990 }],
        payments: [{ method: 'pix' as const, amountCents: 1990 }],
      }

      const primeira = await app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': chave },
        payload: corpo,
      })
      const segunda = await app.inject({
        method: 'POST',
        url: '/sales',
        headers: { 'idempotency-key': chave },
        payload: corpo,
      })

      /*
       * O caso que a RNF-043 existe para evitar: sem a chave reaproveitada, o
       * reenvio vira uma SEGUNDA venda, com segundo estoque baixado e segundo
       * recebivel. O 200 e o que diz a quem integra "isto ja existia" — 201
       * sempre faria um integrador contar duas onde houve uma.
       */
      expect(primeira.statusCode).toBe(201)
      expect(segunda.statusCode).toBe(200)
      expect(segunda.json().replayed).toBe(true)
      expect(segunda.json().sale.id).toBe(primeira.json().sale.id)
    })

    it('sem o cabecalho, a venda e recusada em vez de arriscada', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/sales',
        payload: {
          items: [{ productId: produtoId, quantity: 1, unitPriceCents: 1990 }],
          payments: [{ method: 'cash', amountCents: 1990 }],
        },
      })

      /* 400 e nao 422: quem chamou corrige sozinho reenviando com o cabecalho. */
      expect(r.statusCode).toBe(400)
    })
  })

  describe('o isolamento vale no caminho inteiro', () => {
    it('outra empresa nao enxerga o produto desta', async () => {
      const meu = principal
      let r

      try {
        principal = { ...principal, companyId: randomUUID() }
        r = await app.inject({ method: 'GET', url: `/produtos/codigo-de-barras/${EAN}` })
      } finally {
        /* `finally` porque a limpeza depende de `principal` apontar para a
           empresa certa: se este caso falhasse no meio, o teardown apagaria as
           linhas de uma empresa que nao existe e deixaria as de verdade para
           tras. */
        principal = meu
      }

      /*
       * A RLS por linha (ADR-0001) atravessando a pilha inteira, e nao so o
       * teste de `db`: aqui ela passa por HTTP, rota, caso de uso e
       * repositorio. Vazamento entre lojas e o defeito mais caro deste produto
       * e o unico que nao da para corrigir depois de acontecer.
       */
      expect(r.statusCode).toBe(404)
    })
  })
})
