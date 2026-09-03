import type { PaymentMethod, SettlementOutput } from '@na-regua/contracts'
import type { CompanyId, UserId } from '../context.js'

/**
 * Portas da baixa e do estorno — NR-029, RF-059, RF-060, RF-066, RF-067.
 *
 * A fronteira de transacao e o caso de uso, como sempre: gravar a baixa,
 * atualizar o titulo e mexer no saldo do cliente sao tres escritas que
 * precisam entrar juntas. Titulo quitado com o saldo do cliente intocado e a
 * divida que o sistema esqueceu de perdoar.
 */

/** O titulo como esta agora, para a regra decidir. */
export type TituloSnapshot = {
  readonly id: string
  readonly amountCents: number
  readonly settledAmountCents: number
  readonly status: string
  /** Nulo quando o titulo nao esta ligado a ninguem. */
  readonly customerId: string | null
  /**
   * Como a venda foi paga, quando o recebivel veio de uma.
   *
   * Nulo em recebivel avulso (RF-065) e em conta a pagar. Serve para uma
   * decisao so, e ela vive em `core`: recebivel de CARTAO e divida da
   * adquirente, nao do cliente — baixar um deles nao pode diminuir o que o
   * cliente deve na loja.
   */
  readonly paymentMethod: PaymentMethod | null
}

export type NewSettlement = {
  readonly companyId: CompanyId
  readonly payableId: string | null
  readonly receivableId: string | null
  /** Negativo no estorno — a soma das linhas e o saldo baixado. */
  readonly amountCents: number
  readonly method: PaymentMethod | null
  readonly bankAccount: string | null
  readonly settledOn: string
  readonly notes: string | null
  readonly reversesId: string | null
  readonly createdBy: UserId
  readonly createdAt: Date
}

export type SettlementTransaction = {
  findPayable(companyId: CompanyId, id: string): Promise<TituloSnapshot | undefined>
  findReceivable(companyId: CompanyId, id: string): Promise<TituloSnapshot | undefined>
  findSettlement(companyId: CompanyId, id: string): Promise<SettlementOutput | undefined>

  /** Ja estornada? Uma baixa so pode ser desfeita uma vez. */
  hasReversal(companyId: CompanyId, settlementId: string): Promise<boolean>

  insertSettlement(baixa: NewSettlement): Promise<SettlementOutput>

  /**
   * Grava o novo total baixado e a situacao do titulo.
   *
   * Os dois juntos, e nao a situacao calculada na leitura, porque a consulta
   * de lista filtra por status e um filtro que precisa recalcular nao usa
   * indice. A situacao vem de `domain`, entao as duas fontes nao divergem.
   */
  updateTitulo(
    companyId: CompanyId,
    tipo: 'payable' | 'receivable',
    id: string,
    settledAmountCents: number,
    status: string,
  ): Promise<void>

  /**
   * Move o saldo devedor do cliente — RF-066, RF-067.
   *
   * `delta` assinado: negativo quando ele paga, positivo quando um estorno
   * devolve a divida.
   *
   * **Nada no sistema INCREMENTA este saldo hoje.** A venda no fiado deveria
   * aumenta-lo e `registerSale` nao o toca — nao ha escritor de saldo nas
   * portas dele. Isto esta registrado no PR da NR-029: a baixa esta certa, e a
   * outra metade do fiado (RF-013) e uma tarefa que falta.
   */
  adjustCustomerBalance(companyId: CompanyId, customerId: string, deltaCents: number): Promise<void>
}

export type SettlementUnitOfWork = {
  transaction<T>(companyId: CompanyId, fn: (tx: SettlementTransaction) => Promise<T>): Promise<T>
}
