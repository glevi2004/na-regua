import type { CreateCustomerInput, CustomerOutput } from '@na-regua/contracts'
import { AppError } from '../app-error.js'
import { assertCanWrite } from '../authorization.js'
import type { ExecutionContext } from '../context.js'
import type { CustomerRepository } from '../ports/registration-repositories.js'

export type RegisterCustomerDeps = {
  readonly customers: CustomerRepository
}

export type RegisterCustomerOptions = {
  /**
   * Confirma o cadastro mesmo havendo parecido — RF-010.
   *
   * O balcao ja viu a lista de candidatos e decidiu que e outra pessoa. Sem
   * este passo, dois irmaos com o mesmo telefone de casa nao conseguiriam
   * comprar, e isso acontece.
   */
  readonly allowDuplicate?: boolean
}

/**
 * Resultado do cadastro.
 *
 * Uniao discriminada, e nao excecao no caso do parecido: "achei alguem
 * parecido" nao e erro, e uma pergunta — e a resposta e do balcao, com o
 * cliente na frente. Excecao aqui obrigaria a rota a transformar um fluxo
 * normal em `catch`, e o WhatsApp a fazer o mesmo por outro caminho.
 */
export type RegisterCustomerResult =
  | { readonly status: 'created'; readonly customer: CustomerOutput }
  | { readonly status: 'duplicate_found'; readonly candidates: readonly CustomerOutput[] }

/**
 * Cadastra cliente — RF-009, RF-010.
 *
 * Exige apenas nome. RF-009 fala em "apenas nome e telefone", e o telefone
 * tambem e opcional aqui de proposito: no balcao ele as vezes vem depois, e
 * exigir mais campo do que o necessario e travar a venda para cadastrar
 * ficha. Quem precisa de telefone e o envio de mensagem, que verifica na hora.
 */
export async function registerCustomer(
  deps: RegisterCustomerDeps,
  ctx: ExecutionContext,
  input: CreateCustomerInput,
  options: RegisterCustomerOptions = {},
): Promise<RegisterCustomerResult> {
  assertCanWrite(ctx)

  if (!options.allowDuplicate && (input.phone !== undefined || input.document !== undefined)) {
    const candidates = await deps.customers.findSimilar(ctx.companyId, {
      phone: input.phone,
      document: input.document,
    })

    if (candidates.length > 0) {
      return { status: 'duplicate_found', candidates }
    }
  }

  const customer = await deps.customers.create({
    companyId: ctx.companyId,
    name: input.name,
    document: input.document,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    walletLimitCents: input.walletLimitCents,
    createdBy: ctx.userId,
    createdAt: ctx.now,
  })

  return { status: 'created', customer }
}

/**
 * Recusa cadastro sem nenhum jeito de identificar a pessoa.
 *
 * Nao e chamada por `registerCustomer` — o cadastro so com nome e legitimo.
 * Existe para quem PRECISA identificar depois: cobranca por WhatsApp, fiado.
 * Fica aqui, e nao na rota, porque a regra vale para os dois canais.
 */
export function assertIdentifiable(customer: CustomerOutput): void {
  if (customer.phone === null && customer.document === null) {
    throw AppError.validation(
      'Este cliente nao tem telefone nem documento. Complete o cadastro para continuar.',
      [{ path: 'phone', message: 'Informe telefone ou documento.' }],
    )
  }
}
