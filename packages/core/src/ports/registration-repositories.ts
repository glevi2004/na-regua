import type { CompanyOutput, CustomerOutput, ProductOutput } from '@na-regua/contracts'
import type { CompanyId, UserId } from '../context.js'

/**
 * Portas dos repositorios de cadastro — RF-001 a RF-019.
 *
 * Declaradas aqui, implementadas por `db` — a seta aponta para dentro. Como em
 * `AppointmentRepository`, os tipos podem morar em `core` porque quem implementa
 * e `db`, e `db` tem permissao para importar `core`. As portas de adapter
 * (`fiscal`, `payments`, `whatsapp`) precisam dos tipos em `contracts` por causa
 * da regra `adapter-nao-importa-core`; esta nao.
 *
 * `companyId` aparece em toda assinatura por decisao, nao por descuido: o
 * isolamento nao pode depender de o chamador lembrar de filtrar. Quem implementa
 * aplica o filtro; quem chama nao tem como esquecer. No banco, a segunda
 * barreira e a politica de RLS (ADR-0001) — as duas juntas, porque uma so
 * depende de disciplina.
 */

export type NewCompany = {
  readonly legalName: string
  readonly tradeName?: string | undefined
  /** So digitos, ja normalizado por `contracts`. */
  readonly cnpj: string
  readonly email: string
  readonly phone: string
  readonly createdAt: Date
}

export type CompanyRepository = {
  /**
   * Grava a empresa e devolve o que ficou gravado.
   *
   * O `id` e gerado por quem implementa, e nao recebido: a politica raiz de RLS
   * exige que a empresa nasca sob o proprio tenant, e quem sabe orquestrar isso
   * e `db` (ver packages/db/README.md#tabelas).
   */
  create(company: NewCompany): Promise<CompanyOutput>

  /**
   * Procura por CNPJ, sem escopo de empresa.
   *
   * E a unica consulta do sistema que atravessa tenants, e de proposito: um
   * CNPJ e uma empresa no pais inteiro, e RF-002 pede recusar o repetido. Por
   * isso devolve apenas se EXISTE — nunca a linha. Devolver os dados da
   * empresa existente vazaria razao social e endereco para quem so digitou um
   * numero.
   */
  cnpjTaken(cnpj: string): Promise<boolean>
}

export type NewCustomer = {
  readonly companyId: CompanyId
  readonly name: string
  readonly document?: string | undefined
  readonly phone?: string | undefined
  readonly email?: string | undefined
  readonly notes?: string | undefined
  readonly walletLimitCents?: number | undefined
  readonly createdBy: UserId
  readonly createdAt: Date
}

export type CustomerRepository = {
  create(customer: NewCustomer): Promise<CustomerOutput>

  /**
   * Procura cliente parecido por telefone ou documento — RF-010.
   *
   * Devolve os candidatos em vez de recusar o cadastro: a decisao de reusar o
   * existente e de quem esta no balcao, com o cliente na frente. Recusar
   * automaticamente travaria a venda de dois irmaos com o mesmo telefone de
   * casa, que acontece.
   */
  findSimilar(
    companyId: CompanyId,
    criteria: { readonly phone?: string | undefined; readonly document?: string | undefined },
  ): Promise<readonly CustomerOutput[]>
}

export type NewProduct = {
  readonly companyId: CompanyId
  readonly description: string
  readonly barcode?: string | undefined
  /** Gerado por `core` quando nao ha codigo de barras — RF-019. */
  readonly internalCode: string
  readonly unitOfMeasure: ProductOutput['unitOfMeasure']
  readonly salePriceCents: number
  readonly costPriceCents: number
  readonly taxRate?: number | undefined
  readonly minStock: number
  readonly categoryId?: string | undefined
  readonly createdBy: UserId
  readonly createdAt: Date
}

export type ProductRepository = {
  create(product: NewProduct): Promise<ProductOutput>

  /** Localiza pelo codigo de barras lido — RF-018. */
  findByBarcode(companyId: CompanyId, barcode: string): Promise<ProductOutput | undefined>

  /**
   * Quantos produtos a empresa tem, para gerar o proximo codigo interno.
   *
   * Contagem, e nao "proximo codigo": gerar o codigo e regra (o formato), e
   * regra mora em `core`. O repositorio informa o fato.
   */
  countAll(companyId: CompanyId): Promise<number>
}
