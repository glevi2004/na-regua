import type { ExportCollection } from '@na-regua/contracts'
import type { CompanyId, UserId } from '../context.js'

/**
 * Portas da exportacao e da anonimizacao — NR-031, RF-125, RF-127, RF-128.
 */

/**
 * Uma pagina de linhas de uma colecao.
 *
 * A leitura e PAGINADA, e nao "traga a colecao", porque a exportacao de uma
 * loja com dois anos de operacao sao centenas de milhares de linhas. Montar o
 * pacote inteiro em memoria mataria o processo do worker justamente na conta
 * grande — a de quem mais usa o sistema, que e quem mais precisa da
 * exportacao ao sair.
 */
export type ExportPage = {
  readonly rows: readonly Record<string, unknown>[]
  /** `undefined` quando acabou. Opaco: quem produz o cursor e o repositorio. */
  readonly nextCursor?: string | undefined
}

export type ExportSource = {
  /**
   * As colecoes que este repositorio sabe ler.
   *
   * Existe para o caso de uso poder CONFERIR que nao ficou nada de fora, em
   * vez de confiar que quem escreveu o repositorio lembrou de todas. Sem isto,
   * uma tabela nova nasceria fora da exportacao e ninguem descobriria — o
   * lojista receberia um pacote que parece completo.
   */
  collections(): readonly ExportCollection[]

  readPage(
    companyId: CompanyId,
    collection: ExportCollection,
    cursor: string | undefined,
  ): Promise<ExportPage>
}

/**
 * Para onde o pacote e escrito.
 *
 * Porta separada da leitura porque o destino muda com o ambiente — disco em
 * desenvolvimento, armazenamento de objetos em producao — e o caso de uso nao
 * deveria mudar por causa disso.
 */
export type ExportSink = {
  /** Grava uma pagina. Chamado varias vezes por colecao. */
  writeRows(collection: ExportCollection, rows: readonly Record<string, unknown>[]): Promise<void>
  /** Fecha o pacote e devolve por onde baixa-lo. */
  finish(manifest: unknown): Promise<{ readonly location: string }>
}

/** Os campos pessoais de um cliente, para a anonimizacao saber o que ha. */
export type CustomerPersonalData = {
  readonly id: string
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
  readonly taxId: string | null
  readonly address: string | null
  /**
   * Quanto ele deve de fiado agora.
   *
   * Vem junto, e nao de um segundo repositorio, porque a anonimizacao RECUSA
   * quem ainda deve — ver `anonymizeCustomer`. Uma dependencia separada e
   * opcional deixaria a verificacao acontecer ou nao dependendo de como o
   * grafo foi montado, e verificacao de seguranca que as vezes roda e pior
   * que nenhuma: da falsa confianca.
   */
  readonly walletBalanceCents: number
  /** Instante da anonimizacao anterior, se ja houve. */
  readonly anonymizedAt: string | null
}

/** Quantas linhas cada categoria teve, para o comprovante. */
export type AnonymizationCounts = {
  /** Vendas preservadas, sem os dados pessoais — RF-128. */
  readonly salesPreserved: number
  /** Recebiveis preservados: divida e obrigacao contabil. */
  readonly receivablesPreserved: number
  /**
   * Documentos fiscais NAO tocados.
   *
   * O XML da nota e assinado: mexer nele invalida a assinatura e destroi o
   * proprio documento que a lei obriga a guardar por cinco anos (RNF-037). O
   * CPF ali tem base legal de obrigacao legal, e nao de interesse legitimo —
   * o pedido de exclusao nao o alcanca.
   */
  readonly fiscalDocumentsPreserved: number
  /**
   * Conversas apagadas de verdade.
   *
   * Nao ha obrigacao de retencao, e o texto livre nao da para higienizar com
   * confianca: o nome da pessoa aparece no meio da frase, escrito por ela ou
   * pelo lojista, de formas que nenhuma substituicao pega. Apagar e o unico
   * jeito honesto de cumprir o pedido.
   */
  readonly messagesDeleted: number
}

export type DataSubjectRepository = {
  findCustomer(companyId: CompanyId, customerId: string): Promise<CustomerPersonalData | undefined>

  /**
   * Substitui os campos pessoais e apaga o que nao precisa ser retido.
   *
   * Tudo numa transacao. Cliente meio anonimizado e o pior estado possivel:
   * responde ao titular que foi atendido e continua com o telefone dele na
   * base, e a segunda tentativa nao sabe de onde continuar.
   *
   * O `id` NAO muda. Trocar o id quebraria as vendas que apontam para ele, que
   * e exatamente o que a RF-128 proibe.
   */
  anonymizeCustomer(pedido: {
    readonly companyId: CompanyId
    readonly customerId: string
    /** O que entra no lugar de cada campo. Decidido em `core`. */
    readonly substitutes: Readonly<Record<string, string | null>>
    readonly anonymizedAt: Date
    readonly anonymizedBy: UserId
  }): Promise<AnonymizationCounts>
}
