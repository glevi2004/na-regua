import type { CompanyOutput, CustomerOutput, ProductOutput } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'
import type {
  CompanyRepository,
  CustomerRepository,
  NewCompany,
  NewCustomer,
  NewProduct,
  ProductRepository,
} from '../ports/registration-repositories.js'

/**
 * Repositorios em memoria para teste dos casos de uso de cadastro.
 *
 * Aplicam o filtro por empresa **de verdade**, como os da agenda: sem isso, um
 * caso de uso que esquecesse o `companyId` passaria no teste e vazaria dado em
 * producao. O falso que so guarda e devolve nao protege de nada.
 */

export class InMemoryCompanyRepository implements CompanyRepository {
  readonly registros = new Map<string, CompanyOutput>()
  private sequencia = 0

  async create(company: NewCompany): Promise<CompanyOutput> {
    this.sequencia += 1
    const gravada: CompanyOutput = {
      id: `emp-${this.sequencia}`,
      legalName: company.legalName,
      /* O output nao tem nome fantasia opcional: sem ele, o proprio nome
         cumpre o papel na tela. */
      tradeName: company.tradeName ?? company.legalName,
      cnpj: company.cnpj,
      email: company.email,
      phone: company.phone,
      createdAt: company.createdAt.toISOString(),
    }
    this.registros.set(gravada.id, gravada)
    return gravada
  }

  async cnpjTaken(cnpj: string): Promise<boolean> {
    /* Atravessa tenants de proposito — um CNPJ e uma empresa no pais inteiro.
       Devolve apenas se existe, nunca a linha (RF-002). */
    return [...this.registros.values()].some((e) => e.cnpj === cnpj)
  }
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly registros = new Map<string, CustomerOutput & { companyId: CompanyId }>()
  private sequencia = 0

  async create(customer: NewCustomer): Promise<CustomerOutput> {
    this.sequencia += 1
    const gravado = {
      id: `cli-${this.sequencia}`,
      companyId: customer.companyId,
      name: customer.name,
      document: customer.document ?? null,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      notes: customer.notes ?? null,
      walletLimitCents: customer.walletLimitCents ?? 0,
      /* Nao deve nada e zero, nao nulo: nulo obrigaria todo calculo de fiado
         a tratar ausencia. */
      walletBalanceCents: 0,
      createdAt: customer.createdAt.toISOString(),
    }
    this.registros.set(gravado.id, gravado)
    return this.semTenant(gravado)
  }

  async findSimilar(
    companyId: CompanyId,
    criteria: { phone?: string | undefined; document?: string | undefined },
  ): Promise<readonly CustomerOutput[]> {
    if (criteria.phone === undefined && criteria.document === undefined) return []

    return [...this.registros.values()]
      .filter((c) => c.companyId === companyId)
      .filter(
        (c) =>
          (criteria.phone !== undefined && c.phone === criteria.phone) ||
          (criteria.document !== undefined && c.document === criteria.document),
      )
      .map((c) => this.semTenant(c))
  }

  /** `companyId` nao sai do repositorio: e do contexto, nao da resposta. */
  private semTenant(registro: CustomerOutput & { companyId: CompanyId }): CustomerOutput {
    const { companyId: _omitido, ...resto } = registro
    return resto
  }
}

export class InMemoryProductRepository implements ProductRepository {
  private readonly registros = new Map<string, ProductOutput & { companyId: CompanyId }>()
  private sequencia = 0

  async create(product: NewProduct): Promise<ProductOutput> {
    this.sequencia += 1
    const gravado = {
      id: `prod-${this.sequencia}`,
      companyId: product.companyId,
      description: product.description,
      barcode: product.barcode ?? null,
      internalCode: product.internalCode,
      unitOfMeasure: product.unitOfMeasure,
      salePriceCents: product.salePriceCents,
      costPriceCents: product.costPriceCents,
      taxRate: product.taxRate ?? null,
      stock: 0,
      minStock: product.minStock,
      categoryId: product.categoryId ?? null,
    }
    this.registros.set(gravado.id, gravado)
    return this.semTenant(gravado)
  }

  async findByBarcode(companyId: CompanyId, barcode: string): Promise<ProductOutput | undefined> {
    const achado = [...this.registros.values()].find(
      (p) => p.companyId === companyId && p.barcode === barcode,
    )
    /* De outra empresa e o mesmo que inexistente. */
    return achado ? this.semTenant(achado) : undefined
  }

  /**
   * Busca por descricao ou codigo, sem depender de caixa.
   *
   * O falso imita o LIMITE e a ORDEM do repositorio de verdade. Um falso que
   * devolvesse tudo, em qualquer ordem, deixaria passar um SQL sem `LIMIT` —
   * e o defeito so apareceria na loja com catalogo grande, que e a que menos
   * pode travar.
   */
  async search(
    companyId: CompanyId,
    criterio: { readonly termo?: string; readonly limite: number },
  ): Promise<readonly ProductOutput[]> {
    const termo = criterio.termo?.trim().toLowerCase() ?? ''

    return [...this.registros.values()]
      .filter((p) => p.companyId === companyId)
      .filter(
        (p) =>
          termo === '' ||
          p.description.toLowerCase().includes(termo) ||
          p.internalCode.toLowerCase().includes(termo) ||
          (p.barcode ?? '').includes(termo),
      )
      .sort((a, b) => a.description.localeCompare(b.description))
      .slice(0, criterio.limite)
      .map((p) => this.semTenant(p))
  }

  async countAll(companyId: CompanyId): Promise<number> {
    return [...this.registros.values()].filter((p) => p.companyId === companyId).length
  }

  private semTenant(registro: ProductOutput & { companyId: CompanyId }): ProductOutput {
    const { companyId: _omitido, ...resto } = registro
    return resto
  }
}
