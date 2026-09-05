import type { InvoiceIssueResult } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import type { InvoiceIssuer } from '../ports/invoice-issuer.js'

/**
 * Notas em contingencia que a SEFAZ ja aceitou — RF-053.
 *
 * ## O que este caso de uso faz, e o que ele NAO faz
 *
 * Ele PERGUNTA ao provedor o estado de cada nota emitida offline, na ordem em
 * que sairam, e atualiza a guarda quando alguma passou a autorizada.
 *
 * Ele nao TRANSMITE. A RF-053 diz "transmitir automaticamente quando a SEFAZ
 * voltar", e a documentacao do provedor nao define como isso se faz: ha um
 * campo `contingencia_offline_efetivada` que sugere que ele resolve sozinho, e
 * sugerir nao basta para um documento fiscal. Inventar a chamada produziria uma
 * de duas coisas — nota duplicada ou nota que nunca chega —, e as duas custam
 * caro para o lojista.
 *
 * Perguntar funciona sob as duas hipoteses: se o provedor efetiva sozinho, a
 * reconciliacao percebe e o estado fica certo; se nao efetiva, as notas
 * permanecem em contingencia, visiveis, em vez de parecerem resolvidas.
 *
 * ## A ordem e o contrato
 *
 * Da mais antiga para a mais nova. A SEFAZ recusa lacuna de numeracao, e parar
 * na primeira que ainda nao autorizou evita marcar como resolvida a nota 12
 * enquanto a 11 continua pendente — o que faria o proximo lote falhar por um
 * buraco que ninguem veria.
 */

export type ReconcileContingencyDeps = {
  readonly invoices: InvoiceIssuer
  readonly store: {
    listContingency(companyId: string): Promise<readonly { readonly saleId: string }[]>
    markAuthorized(companyId: string, saleId: string, r: InvoiceIssueResult): Promise<void>
  }
}

export type ResultadoDaReconciliacao = {
  /** Quantas estavam em contingencia quando a varredura comecou. */
  readonly pendentes: number
  /** Quantas passaram a autorizadas agora. */
  readonly autorizadas: number
}

export async function reconcileContingency(
  deps: ReconcileContingencyDeps,
  ctx: ExecutionContext,
): Promise<ResultadoDaReconciliacao> {
  /*
   * Leitura mais atualizacao de estado, sem `assertCanWrite`.
   *
   * Nao cria nem altera nada que o lojista tenha decidido: apenas registra o
   * que a SEFAZ ja fez. Exigir papel de escrita impediria o `accountant` de
   * abrir a tela fiscal e ver o estado correto — e ele e quem mais olha para
   * nota pendente.
   */
  const pendentes = await deps.store.listContingency(ctx.companyId)

  let autorizadas = 0

  for (const nota of pendentes) {
    const atual = await deps.invoices.consult({
      companyId: ctx.companyId,
      saleId: nota.saleId,
    })

    /*
     * `undefined` e "o provedor ainda nao tem resposta". PARA aqui.
     *
     * Continuar puraria a ordem: marcar a nota seguinte como resolvida
     * enquanto esta continua pendente deixaria uma lacuna de numeracao, e a
     * SEFAZ recusa o lote seguinte por causa dela.
     */
    if (atual === undefined) break
    if (atual.status === 'contingency') break

    /* Rejeitada tambem para a fila: ela precisa de correcao humana, e as
       posteriores nao podem passar na frente. */
    if (atual.status === 'rejected') break

    await deps.store.markAuthorized(ctx.companyId, nota.saleId, atual)
    autorizadas += 1
  }

  return { pendentes: pendentes.length, autorizadas }
}
