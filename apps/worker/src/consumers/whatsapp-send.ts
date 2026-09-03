import { type SendTextRequest, sendTextRequestSchema } from '@na-regua/contracts'
import { FalhaPermanente } from '../retry.js'
import type { ConsumerDeps, ResultadoDoJob } from './types.js'

/**
 * Envio de mensagem — RF-015, RF-016.
 *
 * Mesma separacao da emissao: `sent` e `rejected` sao resultado, e falha de
 * infraestrutura sobe para o BullMQ retentar.
 *
 * Mas aqui ha um motivo a mais para NAO retentar rejeicao, e ele e legal, nao
 * tecnico: se o provedor recusou por falta de consentimento (RF-016), cada nova
 * tentativa e outra tentativa de contatar alguem que nao quer ser contatado. A
 * politica de repeticao viraria um jeito automatico de insistir.
 */
export async function consumirEnvio(deps: ConsumerDeps, payload: unknown): Promise<ResultadoDoJob> {
  const pedido = validar(payload)

  const r = await deps.messages.sendText(pedido)

  if (r.status === 'sent') {
    return { outcome: 'sent', detalhes: { messageId: r.messageId, to: mascarar(r.to) } }
  }

  return { outcome: 'rejected', detalhes: { reason: r.reason, message: r.message } }
}

function validar(payload: unknown): SendTextRequest {
  const r = sendTextRequestSchema.safeParse(payload)
  if (!r.success) {
    throw new FalhaPermanente(
      `Pedido de envio invalido: ${r.error.issues.map((i) => i.path.join('.') || 'raiz').join(', ')}`,
    )
  }
  return r.data
}

/**
 * Telefone no log sai mascarado — RNF-022, LGPD.
 *
 * O log de fila e agregado e fica retido; numero de cliente inteiro ali vira
 * uma lista de contatos em um lugar que ninguem trata como dado pessoal. Os
 * quatro ultimos digitos bastam para o suporte correlacionar.
 */
export function mascarar(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length <= 4) return '****'
  return `****${digitos.slice(-4)}`
}
