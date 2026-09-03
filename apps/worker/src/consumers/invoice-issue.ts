import { type IssueInvoiceRequest, issueInvoiceRequestSchema } from '@na-regua/contracts'
import { FalhaPermanente } from '../retry.js'
import type { ConsumerDeps, ResultadoDoJob } from './types.js'

/**
 * Emissao fiscal assincrona — RNF-004, RF-045 a RF-049.
 *
 * A fila existe para que a venda feche sem esperar a SEFAZ. Consequencia direta
 * no tratamento de erro: **este consumidor nunca pode fazer a venda voltar
 * atras**, porque quando ele roda a venda ja esta gravada e o cliente ja saiu
 * da loja com o produto.
 *
 * Os tres desfechos, e por que so um deles retenta:
 *
 * - `authorized` — deu certo. Fim.
 * - `contingency` — a SEFAZ estava fora e a nota saiu em contingencia. E um
 *   desfecho VALIDO (RF-052), nao um erro: retentar geraria uma segunda nota
 *   para a mesma venda.
 * - `rejected` — a SEFAZ recusou o conteudo. Retentar reenviaria o mesmo XML
 *   invalido para receber a mesma recusa, cinco vezes, com espera crescente.
 *   O que resolve e alguem corrigir o cadastro, e para isso a rejeicao precisa
 *   ficar visivel AGORA, nao daqui a quarenta segundos.
 */
export async function consumirEmissao(
  deps: ConsumerDeps,
  payload: unknown,
): Promise<ResultadoDoJob> {
  const pedido = validar(payload)

  /* Nao ha try/catch: falha de infraestrutura DEVE subir, para o BullMQ
     retentar com espera crescente. Engolir aqui transformaria uma SEFAZ fora
     do ar em nota que nunca sai e ninguem procura. */
  const r = await deps.invoices.issue(pedido)

  switch (r.status) {
    case 'authorized':
      return {
        outcome: 'authorized',
        detalhes: { saleId: pedido.saleId, accessKey: r.accessKey, number: r.number },
      }

    case 'contingency':
      return {
        outcome: 'contingency',
        detalhes: { saleId: pedido.saleId, accessKey: r.accessKey },
      }

    case 'rejected':
      /* Job CONCLUIDO, nao falho. A nota nao saiu e isso e informacao, nao
         erro de execucao — o que falta e correcao humana, e retentar so
         atrasaria a hora em que alguem descobre. */
      return {
        outcome: 'rejected',
        detalhes: {
          saleId: pedido.saleId,
          code: r.rejection.code,
          message: r.rejection.message,
        },
      }
  }
}

/**
 * Payload invalido e falha PERMANENTE.
 *
 * Um job com corpo malformado nao vai melhorar na quinta tentativa — quem o
 * enfileirou e que errou. Retentar gastaria quarenta segundos para chegar na
 * mesma conclusao e esconderia o defeito real atras de "falhou varias vezes".
 */
function validar(payload: unknown): IssueInvoiceRequest {
  const r = issueInvoiceRequestSchema.safeParse(payload)
  if (!r.success) {
    throw new FalhaPermanente(
      `Pedido de emissao invalido: ${r.error.issues.map((i) => i.path.join('.') || 'raiz').join(', ')}`,
    )
  }
  return r.data
}
