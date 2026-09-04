import type { CompanyOutput, CustomerOutput, ProductOutput } from '@na-regua/contracts'
import type {
  CompanyRepository,
  CustomerRepository,
  NewCustomer,
  NewProduct,
  ProductRepository,
} from '@na-regua/core'
import { InMemoryChartOfAccounts, TETO_DO_CATALOGO } from '@na-regua/core'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerRateLimit } from '../plugins/rate-limit.js'
import { type CadastroDeps, registerCadastroRoutes } from './cadastro.js'

const PRINCIPAL: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

function cadastroEmMemoria() {
  const empresas: CompanyOutput[] = []
  const clientes: (CustomerOutput & { companyId: string })[] = []
  const produtos: (ProductOutput & { companyId: string })[] = []
  let seq = 0

  const companies: CompanyRepository = {
    create: async (c) => {
      seq += 1
      const e: CompanyOutput = {
        id: `emp-${seq}`,
        legalName: c.legalName,
        tradeName: c.tradeName ?? c.legalName,
        cnpj: c.cnpj,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
      }
      empresas.push(e)
      return e
    },
    cnpjTaken: async (cnpj) => empresas.some((e) => e.cnpj === cnpj),
  }

  const customers: CustomerRepository = {
    create: async (c: NewCustomer) => {
      seq += 1
      const cl = {
        id: `cli-${seq}`,
        companyId: c.companyId,
        name: c.name,
        document: c.document ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        notes: c.notes ?? null,
        walletLimitCents: c.walletLimitCents ?? 0,
        walletBalanceCents: 0,
        createdAt: c.createdAt.toISOString(),
      }
      clientes.push(cl)
      return cl
    },
    findSimilar: async (companyId, criteria) =>
      criteria.phone === undefined && criteria.document === undefined
        ? []
        : clientes.filter(
            (c) =>
              c.companyId === companyId &&
              ((criteria.phone !== undefined && c.phone === criteria.phone) ||
                (criteria.document !== undefined && c.document === criteria.document)),
          ),
  }

  const products: ProductRepository = {
    /* O catalogo do balcao (RF-019). Imita o LIMITE e a ORDEM do repositorio de
       verdade: um falso que devolvesse tudo em qualquer ordem deixaria passar
       um SQL sem `LIMIT` nem `ORDER BY`. */
    search: async (companyId, criterio) => {
      const termo = criterio.termo?.toLowerCase() ?? ''
      return produtos
        .filter((p) => p.companyId === companyId)
        .filter((p) => termo === '' || p.description.toLowerCase().includes(termo))
        .sort((a, b) => a.description.localeCompare(b.description))
        .slice(0, criterio.limite)
    },

    create: async (p: NewProduct) => {
      seq += 1
      const pr = {
        id: `prod-${seq}`,
        companyId: p.companyId,
        description: p.description,
        barcode: p.barcode ?? null,
        internalCode: p.internalCode,
        unitOfMeasure: p.unitOfMeasure,
        salePriceCents: p.salePriceCents,
        costPriceCents: p.costPriceCents,
        taxRate: p.taxRate ?? null,
        stock: 0,
        minStock: p.minStock,
        categoryId: p.categoryId ?? null,
      }
      produtos.push(pr)
      return pr
    },
    /* Filtra por empresa de verdade: um falso que ignorasse isso faria o teste
       de isolamento medir o vazio. */
    findByBarcode: async (companyId, barcode) =>
      produtos.find((p) => p.companyId === companyId && p.barcode === barcode),
    countAll: async (companyId) => produtos.filter((p) => p.companyId === companyId).length,
  }

  /* O onboarding semeia o plano de contas (RF-081, NR-077), entao a rota
     precisa da porta. Falso de verdade, e nao um objeto vazio: assim o teste
     do 201 prova que a semeadura roda, em vez de so nao explodir. */
  const accounts = new InMemoryChartOfAccounts()

  return { companies, customers, products, accounts, empresas, clientes, produtos }
}

async function buildApp(principal: AuthenticatedPrincipal | null = PRINCIPAL) {
  const memoria = cadastroEmMemoria()
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  await registerRateLimit(app)
  app.addHook('onRequest', async (request) => {
    if (principal !== null) request.principal = principal
  })
  registerCadastroRoutes(app, memoria as unknown as CadastroDeps)
  return { app, memoria }
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

const EMPRESA = {
  legalName: 'Mercearia Sol Nascente LTDA',
  cnpj: '11222333000181',
  email: 'contato@sol.local',
  phone: '41999990000',
}

describe('cadastrar empresa — RF-001, RF-002', () => {
  it('cria e responde 201', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/empresas', payload: EMPRESA })

    expect(r.statusCode).toBe(201)
    expect(r.json().cnpj).toBe('11222333000181')
  })

  /**
   * RF-002 pede recusar CNPJ repetido "sem revelar dados da empresa existente".
   * A mensagem nao pode trazer razao social — quem digitou so um numero nao
   * deveria descobrir de quem ele e.
   */
  it('recusa CNPJ repetido sem revelar a empresa existente', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/empresas', payload: EMPRESA })

    const r = await app.inject({
      method: 'POST',
      url: '/empresas',
      payload: { ...EMPRESA, legalName: 'Outra Razao Social LTDA' },
    })

    expect(r.statusCode).toBe(409)
    expect(JSON.stringify(r.json())).not.toContain('Sol Nascente')
  })

  it('CNPJ invalido responde 400', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'POST',
      url: '/empresas',
      payload: { ...EMPRESA, cnpj: '11111111111111' },
    })

    expect(r.statusCode).toBe(400)
  })

  it('sem sessao responde 401', async () => {
    const c = await buildApp(null)
    app = c.app

    expect(
      (await app.inject({ method: 'POST', url: '/empresas', payload: EMPRESA })).statusCode,
    ).toBe(401)
  })
})

/**
 * O ponto mais interessante do cadastro: duplicado NAO e erro, e resposta.
 *
 * A decisao de reusar o existente e de quem esta no balcao, com o cliente na
 * frente — recusar automaticamente travaria o cadastro de dois irmaos com o
 * telefone de casa, que acontece.
 */
describe('cadastrar cliente — RF-009, RF-010', () => {
  const CLIENTE = { name: 'Dona Marta', phone: '41988887777' }

  it('cria com apenas nome — RF-009', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/clientes', payload: { name: 'Marta' } })

    expect(r.statusCode).toBe(201)
  })

  it('telefone repetido responde 409 COM os candidatos', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/clientes', payload: CLIENTE })

    const r = await app.inject({
      method: 'POST',
      url: '/clientes',
      payload: { name: 'Marta Souza', phone: '41988887777' },
    })

    expect(r.statusCode).toBe(409)
    expect(r.json().candidates).toHaveLength(1)
    expect(r.json().candidates[0].name).toBe('Dona Marta')
  })

  /* Os candidatos vao FORA do envelope de erro: nao sao detalhe do erro, sao a
     informacao que permite decidir. */
  it('os candidatos nao ficam dentro do envelope de erro', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/clientes', payload: CLIENTE })

    const r = await app.inject({ method: 'POST', url: '/clientes', payload: CLIENTE })

    expect(r.json().error.candidates).toBeUndefined()
    expect(r.json().candidates).toBeDefined()
  })

  it('quem decidiu reenvia com ?duplicado=permitir e cadastra', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/clientes', payload: CLIENTE })

    const r = await app.inject({
      method: 'POST',
      url: '/clientes?duplicado=permitir',
      payload: { name: 'Marta Souza', phone: '41988887777' },
    })

    expect(r.statusCode).toBe(201)
    expect(c.memoria.clientes).toHaveLength(2)
  })

  it('cliente sem telefone nem documento nao dispara busca de duplicado', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/clientes', payload: { name: 'Joao' } })

    const r = await app.inject({ method: 'POST', url: '/clientes', payload: { name: 'Joao' } })

    expect(r.statusCode).toBe(201)
  })

  it('accountant recebe 403', async () => {
    const c = await buildApp({ ...PRINCIPAL, role: 'accountant' })
    app = c.app

    expect(
      (await app.inject({ method: 'POST', url: '/clientes', payload: CLIENTE })).statusCode,
    ).toBe(403)
  })
})

describe('cadastrar produto — RF-017, RF-019', () => {
  const PRODUTO = {
    description: 'Cafe torrado 500g',
    unitOfMeasure: 'un' as const,
    salePriceCents: 1990,
    costPriceCents: 1200,
  }

  it('cria e responde 201', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/produtos', payload: PRODUTO })

    expect(r.statusCode).toBe(201)
  })

  /* RF-019: sem codigo de barras, `core` gera o interno. A rota nao participa
     disso — se participasse, o canal WhatsApp geraria outro formato. */
  it('sem codigo de barras, ganha codigo interno', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/produtos', payload: PRODUTO })

    expect(r.json().internalCode).toBeTruthy()
    expect(r.json().barcode).toBeNull()
  })

  it('preco negativo responde 400', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'POST',
      url: '/produtos',
      payload: { ...PRODUTO, salePriceCents: -1 },
    })

    expect(r.statusCode).toBe(400)
  })
})

describe('localizar por codigo de barras — RF-018', () => {
  const COM_CODIGO = {
    description: 'Arroz 5kg',
    barcode: '7891234567895',
    unitOfMeasure: 'un' as const,
    salePriceCents: 2890,
    costPriceCents: 2100,
  }

  it('devolve o produto lido', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/produtos', payload: COM_CODIGO })

    const r = await app.inject({ method: 'GET', url: '/produtos/codigo-de-barras/7891234567895' })

    expect(r.statusCode).toBe(200)
    expect(r.json().description).toBe('Arroz 5kg')
  })

  /* 404 e nao lista vazia: o balcao precisa distinguir "nao existe" de "existe
     e esta zerado" — a segunda e cadastro feito, a primeira e cadastro a
     fazer. */
  it('codigo desconhecido responde 404, nao lista vazia', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/produtos/codigo-de-barras/0000000000000' })

    expect(r.statusCode).toBe(404)
  })

  it('produto de outra empresa responde 404', async () => {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/produtos', payload: COM_CODIGO })
    await app.close()

    const outra = await buildApp({ ...PRINCIPAL, companyId: 'empresa-2' })
    app = outra.app

    const r = await app.inject({ method: 'GET', url: '/produtos/codigo-de-barras/7891234567895' })

    expect(r.statusCode).toBe(404)
  })

  /* Somente leitura nao e sem acesso — o contador confere cadastro. */
  it('accountant consulta', async () => {
    const c = await buildApp({ ...PRINCIPAL, role: 'accountant' })
    app = c.app

    expect(
      (await app.inject({ method: 'GET', url: '/produtos/codigo-de-barras/0000000000000' }))
        .statusCode,
    ).toBe(404)
  })
})

describe('catalogo do balcao — RF-019', () => {
  const CAFE = {
    description: 'Cafe torrado 500g',
    unitOfMeasure: 'un' as const,
    salePriceCents: 1990,
    costPriceCents: 1200,
  }
  const ACUCAR = {
    description: 'Acucar refinado 1kg',
    unitOfMeasure: 'un' as const,
    salePriceCents: 599,
    costPriceCents: 400,
  }

  async function comCatalogo() {
    const c = await buildApp()
    app = c.app
    await app.inject({ method: 'POST', url: '/produtos', payload: CAFE })
    await app.inject({ method: 'POST', url: '/produtos', payload: ACUCAR })
    return c
  }

  it('sem termo, devolve o catalogo — e o estado em que o PDV abre', async () => {
    await comCatalogo()

    const r = await app.inject({ method: 'GET', url: '/produtos' })

    expect(r.statusCode).toBe(200)
    expect(r.json().products).toHaveLength(2)
  })

  it('ordena por descricao, para a lista nao dancar entre buscas iguais', async () => {
    await comCatalogo()

    const r = await app.inject({ method: 'GET', url: '/produtos' })

    expect(r.json().products.map((p: { description: string }) => p.description)).toEqual([
      'Acucar refinado 1kg',
      'Cafe torrado 500g',
    ])
  })

  it('filtra pelo termo, sem depender da caixa', async () => {
    await comCatalogo()

    const r = await app.inject({ method: 'GET', url: '/produtos?q=CAFE' })

    expect(r.json().products).toHaveLength(1)
    expect(r.json().products[0].description).toBe('Cafe torrado 500g')
  })

  it('nada encontrado e lista VAZIA, e nao 404', async () => {
    await comCatalogo()

    const r = await app.inject({ method: 'GET', url: '/produtos?q=bicicleta' })

    /*
     * Aqui e busca sobre colecao: "nenhum produto com esse nome" e uma
     * resposta. O 404 fica para o codigo de barras, onde nao achar significa
     * "existe no mundo e falta cadastrar" — e o balcao age diferente nos dois.
     */
    expect(r.statusCode).toBe(200)
    expect(r.json().products).toEqual([])
  })

  it('nao passa do teto, mesmo se pedirem mais', async () => {
    const c = await comCatalogo()
    app = c.app

    const r = await app.inject({ method: 'GET', url: `/produtos?limite=${TETO_DO_CATALOGO + 500}` })

    /* O teto e decisao de produto e mora em `core`: na rota, cada cliente novo
       — mobile, assistente — escolheria o seu. Quem pede pode reduzir. */
    expect(r.json().products.length).toBeLessThanOrEqual(TETO_DO_CATALOGO)
  })

  it('sem sessao, 401', async () => {
    const c = await buildApp(null)
    app = c.app

    expect((await app.inject({ method: 'GET', url: '/produtos' })).statusCode).toBe(401)
  })
})
