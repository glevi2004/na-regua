import type {
  CancelInvoiceRequest,
  InvoiceCancellation,
  InvoiceIssueResult,
  IssueInvoiceRequest,
} from '@na-regua/contracts'

/**
 * Porta da emissao fiscal — RF-045 a RF-054.
 *
 * Declarada aqui, implementada por `fiscal` — a seta aponta para dentro: quem
 * define o contrato e o nucleo, nao o provedor de nota. E o que permite testar
 * o caso de uso com um emissor falso, sem certificado e sem SEFAZ.
 *
 * Diferente de `AppointmentRepository`, nenhum tipo desta porta e declarado em
 * `core`: todos vem de `contracts`. A razao e a regra `adapter-nao-importa-core`
 * — `packages/fiscal` nao pode importar `core`, entao o adapter satisfaz esta
 * porta ESTRUTURALMENTE, e o TypeScript confere a compatibilidade na raiz de
 * composicao, onde os dois se encontram. Se os tipos morassem aqui, so `db`
 * (que pode importar `core`) conseguiria implementar uma porta.
 *
 * `companyId` viaja dentro do pedido, e nao como parametro separado, porque
 * quem emite e um job da fila e nao uma requisicao: o pedido precisa ser
 * serializavel inteiro, com o tenant dentro. Continua valendo que ele vem do
 * `ExecutionContext`, nunca do cliente — principio 8.
 */
export type InvoiceIssuer = {
  /**
   * Emite a nota da venda.
   *
   * **Nao lanca em rejeicao nem em contingencia.** As duas sao resultado, e o
   * tipo de retorno obriga quem chama a tratar os tres casos. Lancar seria
   * pior que inutil: o `catch` mais proximo poderia desfazer a transacao da
   * venda, e RF-047 e RF-052 exigem que a venda permaneca registrada mesmo
   * quando a nota nao sai.
   *
   * Idempotente por `saleId`: reprocessar o job da mesma venda devolve a nota
   * que ja existe em vez de emitir uma segunda. Nota duplicada nao e
   * inconveniencia, e problema fiscal — RNF-043.
   *
   * Lanca somente em falha de infraestrutura: token invalido, certificado
   * vencido, resposta ilegivel. Ai o job deve ser retentado.
   */
  issue(request: IssueInvoiceRequest): Promise<InvoiceIssueResult>

  /**
   * Cancela a nota na SEFAZ mediante justificativa — RF-050.
   *
   * O adapter nao verifica o PRAZO legal: isso e regra de negocio e mora em
   * `core` (RF-051), que precisa recusar antes de gastar transmissao e orientar
   * a emissao de devolucao. Aqui, cancelamento fora do prazo volta como
   * rejeicao da SEFAZ, e continua sendo resultado, nao excecao.
   *
   * Nota de outra empresa responde como inexistente, nunca como proibida — 404
   * e nao 403, porque 403 confirma que a nota existe.
   */
  cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellation>

  /**
   * Pergunta ao provedor o estado ATUAL da nota — RF-053.
   *
   * Existe para a contingencia. Nota emitida offline tem chave e numero e ainda
   * nao tem protocolo da SEFAZ; quando a SEFAZ volta, ela e autorizada — e a
   * unica forma de saber e perguntar.
   *
   * `undefined` quando o provedor nao conhece a referencia: resultado, e nao
   * excecao, porque "essa venda nunca foi transmitida" e uma resposta que a
   * reconciliacao precisa tratar.
   *
   * NAO emite. Se a nota nao existe la, este metodo nao a cria — criar e
   * `issue`, e confundir os dois faria uma consulta virar uma segunda nota.
   */
  consult(request: {
    readonly companyId: string
    readonly saleId: string
  }): Promise<InvoiceIssueResult | undefined>
}
