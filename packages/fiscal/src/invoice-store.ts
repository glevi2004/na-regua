import type { InvoiceIssueResult } from '@na-regua/contracts'

/**
 * A guarda de notas — NR-042.
 *
 * Declarada AQUI, e nao em `core`, pelo mesmo motivo de `InvoiceIssuer` nao
 * declarar seus tipos la: a regra `adapter-nao-importa-core` proibe este pacote
 * de importar `core`. Quem implementa e `db`, que pode importar os dois, e o
 * encaixe e estrutural — o TypeScript confere na raiz de composicao.
 *
 * ## Por que o adapter precisa de guarda
 *
 * Duas coisas, e nenhuma e cache:
 *
 * 1. **Cancelar.** A porta cancela por CHAVE DE ACESSO; o Focus NFe cancela por
 *    REFERENCIA (`DELETE /nfce/{ref}`), que e o nosso `saleId`. Nao existe
 *    endpoint que traduza uma na outra. Sem o par guardado, cancelar e
 *    impossivel.
 * 2. **Idempotencia.** A porta promete que emitir a mesma venda duas vezes
 *    devolve a mesma nota. O `ref` do Focus da parte disso — ele recusa reusar
 *    referencia de nota ja autorizada —, mas a recusa vem como ERRO, e traduzir
 *    erro de volta em "aqui esta a sua nota" exigiria consultar. Guardar e
 *    responder direto e mais barato e mais honesto.
 *
 * O XML fica junto porque ele e o documento fiscal, com guarda legal de cinco
 * anos: depender da conta do provedor continuar ativa nao e guardar.
 */

/** A nota como ela ficou guardada. */
export type NotaGuardada = {
  readonly companyId: string
  readonly saleId: string
  readonly resultado: InvoiceIssueResult
}

export type InvoiceStore = {
  /** A nota desta venda, se ja existir. Base da idempotencia. */
  findBySale(companyId: string, saleId: string): Promise<NotaGuardada | undefined>

  /**
   * A nota desta chave — a traducao que o cancelamento precisa.
   *
   * Nota de outra empresa responde como INEXISTENTE, e nao como proibida: 403
   * confirmaria que a chave existe, e chave de acesso e dado fiscal de
   * terceiro.
   */
  findByAccessKey(companyId: string, accessKey: string): Promise<NotaGuardada | undefined>

  /**
   * Guarda a nota emitida.
   *
   * Devolve o que ficou gravado, que pode NAO ser o que se pediu: se outra
   * execucao gravou a mesma venda no meio do caminho, o indice unico decide e o
   * vencedor volta. Quem chama entao devolve a nota do vencedor, e nao a sua —
   * e assim duas emissoes simultaneas da mesma venda dao uma nota so.
   */
  save(nota: NotaGuardada): Promise<NotaGuardada>

  /** Marca a nota como cancelada, guardando o XML do evento — RF-050. */
  markCancelled(
    companyId: string,
    accessKey: string,
    cancelamento: { readonly protocol: string; readonly xml: string; readonly cancelledAt: string },
  ): Promise<void>
}

/**
 * Guarda em memoria, para teste e para `FISCAL_PROVIDER=fake`.
 *
 * Imita o indice unico por venda: `save` de uma venda que ja existe devolve a
 * PRIMEIRA, e nao sobrescreve. Um falso que sobrescrevesse deixaria passar um
 * adapter sem idempotencia — os testes ficariam verdes e a segunda emissao
 * viraria uma segunda nota fiscal.
 */
export class InMemoryInvoiceStore implements InvoiceStore {
  private readonly porVenda = new Map<string, NotaGuardada>()
  private readonly porChave = new Map<string, NotaGuardada>()

  private static chaveDaVenda(companyId: string, saleId: string): string {
    return `${companyId}:${saleId}`
  }

  async findBySale(companyId: string, saleId: string): Promise<NotaGuardada | undefined> {
    return this.porVenda.get(InMemoryInvoiceStore.chaveDaVenda(companyId, saleId))
  }

  async findByAccessKey(companyId: string, accessKey: string): Promise<NotaGuardada | undefined> {
    return this.porChave.get(`${companyId}:${accessKey}`)
  }

  async save(nota: NotaGuardada): Promise<NotaGuardada> {
    const chave = InMemoryInvoiceStore.chaveDaVenda(nota.companyId, nota.saleId)
    const existente = this.porVenda.get(chave)
    if (existente !== undefined) return existente

    this.porVenda.set(chave, nota)

    if (nota.resultado.status !== 'rejected') {
      this.porChave.set(`${nota.companyId}:${nota.resultado.accessKey}`, nota)
    }

    return nota
  }

  async markCancelled(
    companyId: string,
    accessKey: string,
    _cancelamento: {
      readonly protocol: string
      readonly xml: string
      readonly cancelledAt: string
    },
  ): Promise<void> {
    const nota = this.porChave.get(`${companyId}:${accessKey}`)
    if (nota === undefined) return

    /* A nota some das duas buscas: cancelada nao volta a ser emitida, e uma
       segunda tentativa de cancelar precisa responder "nao encontrada" em vez
       de cancelar de novo. */
    this.porChave.delete(`${companyId}:${accessKey}`)
    this.porVenda.delete(InMemoryInvoiceStore.chaveDaVenda(companyId, nota.saleId))
  }
}
