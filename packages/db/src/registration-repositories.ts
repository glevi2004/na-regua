import { randomUUID } from 'node:crypto'
import type { CompanyOutput, CustomerOutput, ProductOutput } from '@na-regua/contracts'
import type {
  CompanyRepository,
  CustomerRepository,
  NewCompany,
  NewCustomer,
  NewProduct,
  ProductRepository,
} from '@na-regua/core'
import type { Sql } from 'postgres'
import { withPlatformScope, withTenant } from './tenant.js'

/**
 * Repositorios de cadastro — NR-026, RF-001 a RF-019.
 *
 * `bigint` volta como STRING no postgres.js, de proposito, para nao perder
 * precisao acima de 2^53. As portas declaram `number`, e um valor em string
 * entrando num calculo estoura com "Cannot mix BigInt and other types" — a CI
 * ja mostrou isso no repositorio de vendas. A conversao acontece na BORDA.
 */
const numero = (valor: unknown): number => Number(valor)

type LinhaEmpresa = {
  id: string
  legal_name: string
  trade_name: string | null
  cnpj: string
  email: string
  phone: string
  tax_regime: string
  is_active: boolean
  created_at: Date
}

const paraEmpresa = (l: LinhaEmpresa): CompanyOutput => ({
  id: l.id,
  legalName: l.legal_name,
  /* O contrato pede `string`, a coluna aceita nulo: quem nao informou nome
     fantasia opera com a razao social, e e isso que a tela mostra. */
  tradeName: l.trade_name ?? l.legal_name,
  cnpj: l.cnpj,
  email: l.email,
  phone: l.phone,
  createdAt: l.created_at.toISOString(),
})

export function createCompanyRepository(sql: Sql): CompanyRepository {
  return {
    create: async (c: NewCompany) => {
      /*
       * O id e gerado AQUI e passado no INSERT, e nao deixado para o
       * `DEFAULT gen_random_uuid()`.
       *
       * A politica raiz de `companies` e `WITH CHECK (id = current_company_id())`:
       * para inserir, o tenant do contexto ja precisa ser o id da linha. Com o
       * id vindo do default, nao haveria o que colocar em `app.company_id`
       * antes de inserir — o INSERT seria recusado pela propria politica que
       * protege a tabela. Ver packages/db/README.md#tabelas.
       */
      const id = randomUUID()

      const [linha] = await withTenant(
        sql,
        id,
        (tx) => tx<LinhaEmpresa[]>`
          INSERT INTO companies (id, legal_name, trade_name, cnpj, email, phone, created_at)
          VALUES (${id}, ${c.legalName}, ${c.tradeName ?? null}, ${c.cnpj},
                  ${c.email}, ${c.phone}, ${c.createdAt})
          RETURNING *
        `,
      )
      return paraEmpresa(linha!)
    },

    /*
     * A UNICA consulta do sistema que atravessa tenants, e por isso usa
     * `withPlatformScope` — nomeado assim para quem le ver uma excecao
     * consciente, e nao um esquecimento.
     *
     * Devolve booleano, nunca a linha: RF-002 pede recusar CNPJ repetido "sem
     * revelar dados da empresa existente". Devolver a linha vazaria razao
     * social para quem so digitou um numero.
     */
    cnpjTaken: async (cnpj) =>
      withPlatformScope(sql, async (tx) => {
        const [linha] = await tx<{ existe: boolean }[]>`
          SELECT EXISTS (SELECT 1 FROM companies WHERE cnpj = ${cnpj}) AS existe
        `
        return linha?.existe === true
      }),
  }
}

type LinhaCliente = {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  notes: string | null
  wallet_limit_cents: string | number
  wallet_balance_cents: string | number
  created_at: Date
}

const paraCliente = (l: LinhaCliente): CustomerOutput => ({
  id: l.id,
  name: l.name,
  document: l.document,
  phone: l.phone,
  email: l.email,
  notes: l.notes,
  walletLimitCents: numero(l.wallet_limit_cents),
  walletBalanceCents: numero(l.wallet_balance_cents),
  createdAt: l.created_at.toISOString(),
})

export function createCustomerRepository(sql: Sql): CustomerRepository {
  return {
    create: async (c: NewCustomer) => {
      const [linha] = await withTenant(
        sql,
        c.companyId,
        (tx) => tx<LinhaCliente[]>`
          INSERT INTO customers
            (company_id, name, document, phone, email, notes, wallet_limit_cents,
             created_by, created_at)
          VALUES (${c.companyId}, ${c.name}, ${c.document ?? null}, ${c.phone ?? null},
                  ${c.email ?? null}, ${c.notes ?? null}, ${c.walletLimitCents ?? 0},
                  ${c.createdBy}, ${c.createdAt})
          RETURNING *
        `,
      )
      return paraCliente(linha!)
    },

    findSimilar: async (companyId, criteria) => {
      /*
       * Sem criterio nao ha semelhanca a procurar. Sair antes evita um
       * `WHERE false` que varreria o indice a toa — e, pior, evita que uma
       * mudanca futura no SQL transforme isso em "traz todo mundo".
       */
      if (criteria.phone === undefined && criteria.document === undefined) return []

      return withTenant(sql, companyId, async (tx) => {
        const linhas = await tx<LinhaCliente[]>`
          SELECT * FROM customers
          WHERE deleted_at IS NULL
            AND (
              ${criteria.phone ?? null}::text IS NOT NULL AND phone = ${criteria.phone ?? null}
              OR
              ${criteria.document ?? null}::text IS NOT NULL AND document = ${criteria.document ?? null}
            )
          ORDER BY created_at DESC
          LIMIT 10
        `
        return linhas.map(paraCliente)
      })
    },
  }
}

type LinhaProduto = {
  id: string
  description: string
  barcode: string | null
  internal_code: string
  unit_of_measure: string
  sale_price_cents: string | number
  cost_price_cents: string | number
  tax_rate: string | null
  stock_quantity: number
  min_stock: number
  category_id: string | null
  is_active: boolean
  created_at: Date
}

const paraProduto = (l: LinhaProduto): ProductOutput => ({
  id: l.id,
  description: l.description,
  barcode: l.barcode,
  internalCode: l.internal_code,
  unitOfMeasure: l.unit_of_measure as ProductOutput['unitOfMeasure'],
  salePriceCents: numero(l.sale_price_cents),
  costPriceCents: numero(l.cost_price_cents),
  /* `numeric` tambem volta como string — e `null` continua `null`. */
  taxRate: l.tax_rate === null ? null : numero(l.tax_rate),
  /* A coluna chama `stock_quantity`; o contrato chama `stock`. */
  stock: l.stock_quantity,
  minStock: l.min_stock,
  categoryId: l.category_id,
})

export function createProductRepository(sql: Sql): ProductRepository {
  return {
    create: async (p: NewProduct) => {
      const [linha] = await withTenant(
        sql,
        p.companyId,
        (tx) => tx<LinhaProduto[]>`
          INSERT INTO products
            (company_id, description, barcode, internal_code, unit_of_measure,
             sale_price_cents, cost_price_cents, tax_rate, min_stock, category_id,
             created_by, created_at)
          VALUES (${p.companyId}, ${p.description}, ${p.barcode ?? null}, ${p.internalCode},
                  ${p.unitOfMeasure}, ${p.salePriceCents}, ${p.costPriceCents},
                  ${p.taxRate ?? null}, ${p.minStock}, ${p.categoryId ?? null},
                  ${p.createdBy}, ${p.createdAt})
          RETURNING *
        `,
      )
      return paraProduto(linha!)
    },

    findByBarcode: async (companyId, barcode) => {
      const [linha] = await withTenant(
        sql,
        companyId,
        (tx) => tx<LinhaProduto[]>`
          SELECT * FROM products
          WHERE barcode = ${barcode} AND deleted_at IS NULL
        `,
      )
      return linha === undefined ? undefined : paraProduto(linha)
    },

    countAll: async (companyId) => {
      const [linha] = await withTenant(
        sql,
        companyId,
        /* Conta os apagados tambem: o codigo interno nao pode ser reusado, e
           contar so os vivos faria o proximo colidir com um que ja existiu. */
        (tx) => tx<{ total: string }[]>`SELECT count(*)::text AS total FROM products`,
      )
      return numero(linha?.total ?? 0)
    },
  }
}
