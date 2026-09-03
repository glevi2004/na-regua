import type { TituloSnapshot } from '../ports/settlement-writers.js'

/**
 * A baixa deste titulo mexe no que o cliente deve? — RF-066, RF-067.
 *
 * A regra vive em `core`, e nao no repositorio, porque e regra: quem le o banco
 * nao deveria decidir de quem e a divida. E vive aqui e nao dentro do caso de
 * uso porque a baixa e o estorno precisam da MESMA resposta — se divergirem, o
 * estorno devolve uma divida que a baixa nunca tirou, e o saldo do cliente
 * cresce sozinho a cada par de operacoes.
 *
 * Duas condicoes, e as duas importam:
 *
 * - **Sem cliente, nao ha saldo a mexer.** Recebivel avulso sem cliente e
 *   dinheiro que entra sem alguem devendo.
 * - **Cartao e divida da ADQUIRENTE.** Quando a venda foi no credito, quem deve
 *   a loja e a operadora, nao a pessoa que passou o cartao — ela ja pagou. Se
 *   baixar esse recebivel diminuisse o saldo dela, um cliente que comprou no
 *   cartao apareceria com credito na loja que ninguem lhe deu.
 *
 * `wallet` (fiado) e o caso classico. Recebivel avulso ligado a um cliente
 * tambem conta: alguem lancou uma cobranca nominal, e ela e divida dele.
 */
export function mexeNoSaldoDoCliente(titulo: TituloSnapshot): boolean {
  if (titulo.customerId === null) return false
  return titulo.paymentMethod === 'wallet' || titulo.paymentMethod === null
}
