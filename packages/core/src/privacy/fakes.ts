import type { ExportCollection } from '@na-regua/contracts'
import type { CompanyId } from '../context.js'
import type {
  AnonymizationCounts,
  CustomerPersonalData,
  DataSubjectRepository,
  ExportPage,
  ExportSink,
  ExportSource,
} from '../ports/privacy.js'

/**
 * Fonte de exportacao em memoria, com paginacao de verdade.
 *
 * A paginacao e o ponto: um falso que devolvesse a colecao inteira numa pagina
 * deixaria passar um caso de uso que ignora o cursor, e o teste diria que a
 * exportacao funciona quando ela traria so as primeiras linhas de cada tabela
 * na producao — silenciosamente, e num pacote que parece completo.
 */
export class InMemoryExportSource implements ExportSource {
  private readonly dados = new Map<string, Record<string, unknown>[]>()
  /** Colecoes que este falso ADMITE saber ler. Ver `esquecer`. */
  private conhecidas = new Set<ExportCollection>()
  tamanhoDaPagina = 2

  constructor(colecoes: readonly ExportCollection[]) {
    this.conhecidas = new Set(colecoes)
  }

  semear(companyId: CompanyId, collection: ExportCollection, linhas: number): void {
    this.dados.set(
      `${companyId}|${collection}`,
      Array.from({ length: linhas }, (_, i) => ({ id: `${collection}-${i}` })),
    )
  }

  /** Simula uma tabela que nasceu sem entrar na exportacao. */
  esquecer(collection: ExportCollection): void {
    this.conhecidas.delete(collection)
  }

  collections(): readonly ExportCollection[] {
    return [...this.conhecidas]
  }

  async readPage(
    companyId: CompanyId,
    collection: ExportCollection,
    cursor: string | undefined,
  ): Promise<ExportPage> {
    const todas = this.dados.get(`${companyId}|${collection}`) ?? []
    const de = cursor === undefined ? 0 : Number(cursor)
    const ate = de + this.tamanhoDaPagina

    return {
      rows: todas.slice(de, ate),
      /* `undefined` no fim. Devolver cursor sempre faria o laco nao terminar. */
      nextCursor: ate < todas.length ? String(ate) : undefined,
    }
  }
}

export class InMemoryExportSink implements ExportSink {
  readonly escritas: { collection: ExportCollection; rows: number }[] = []
  manifesto: unknown
  /** Liga para simular o destino fora do ar. */
  falhar = false

  async writeRows(
    collection: ExportCollection,
    rows: readonly Record<string, unknown>[],
  ): Promise<void> {
    if (this.falhar) throw new Error('destino indisponivel')
    this.escritas.push({ collection, rows: rows.length })
  }

  async finish(manifest: unknown): Promise<{ location: string }> {
    this.manifesto = manifest
    return { location: 'https://exemplo/pacote.zip' }
  }

  linhasDe(collection: ExportCollection): number {
    return this.escritas.filter((e) => e.collection === collection).reduce((s, e) => s + e.rows, 0)
  }
}

type ClienteGuardado = CustomerPersonalData & { readonly companyId: CompanyId }

export class InMemoryDataSubjects implements DataSubjectRepository {
  private clientes: ClienteGuardado[] = []
  /** Quantas linhas cada cliente tem, para o comprovante. */
  private readonly volumes = new Map<string, AnonymizationCounts>()
  private sequencia = 0

  adicionar(
    companyId: CompanyId,
    c: Partial<Omit<CustomerPersonalData, 'id'>> = {},
    volumes: Partial<AnonymizationCounts> = {},
  ): CustomerPersonalData {
    this.sequencia += 1
    const guardado: ClienteGuardado = {
      companyId,
      id: `cli-${this.sequencia}`,
      name: c.name ?? 'Joana Ribeiro',
      phone: c.phone ?? '41988887777',
      email: c.email ?? 'joana@exemplo.com',
      taxId: c.taxId ?? '12345678909',
      address: c.address ?? 'Rua das Flores, 12',
      walletBalanceCents: c.walletBalanceCents ?? 0,
      anonymizedAt: c.anonymizedAt ?? null,
    }
    this.clientes.push(guardado)
    this.volumes.set(guardado.id, {
      salesPreserved: volumes.salesPreserved ?? 14,
      receivablesPreserved: volumes.receivablesPreserved ?? 3,
      fiscalDocumentsPreserved: volumes.fiscalDocumentsPreserved ?? 2,
      messagesDeleted: volumes.messagesDeleted ?? 27,
    })
    return guardado
  }

  cliente(id: string): CustomerPersonalData | undefined {
    return this.clientes.find((c) => c.id === id)
  }

  async findCustomer(
    companyId: CompanyId,
    customerId: string,
  ): Promise<CustomerPersonalData | undefined> {
    return this.clientes.find((c) => c.companyId === companyId && c.id === customerId)
  }

  async anonymizeCustomer(pedido: {
    companyId: CompanyId
    customerId: string
    substitutes: Readonly<Record<string, string | null>>
    anonymizedAt: Date
    anonymizedBy: string
  }): Promise<AnonymizationCounts> {
    const i = this.clientes.findIndex(
      (c) => c.companyId === pedido.companyId && c.id === pedido.customerId,
    )
    if (i < 0) throw new Error('cliente nao encontrado')

    /*
     * Aplica os substitutos que `core` mandou, e nao um conjunto proprio: se o
     * falso decidisse o que apagar, o teste provaria a decisao do falso. O
     * mapeamento de nome de campo do dominio para coluna e do repositorio real;
     * aqui os nomes coincidem.
     */
    const atual = this.clientes[i]!
    this.clientes[i] = {
      ...atual,
      name: pedido.substitutes.name ?? '',
      taxId: 'document' in pedido.substitutes ? pedido.substitutes.document : atual.taxId,
      phone: 'phone' in pedido.substitutes ? pedido.substitutes.phone : atual.phone,
      email: 'email' in pedido.substitutes ? pedido.substitutes.email : atual.email,
      anonymizedAt: pedido.anonymizedAt.toISOString(),
    }

    return this.volumes.get(pedido.customerId)!
  }
}
