import { createFakeInvoiceIssuer } from '@na-regua/fiscal'
import { createFakeMessageSender } from '@na-regua/whatsapp'
import type { Queue } from 'bullmq'
import type { ConsumerDeps, OverdueReader } from './consumers/types.js'
import { log } from './logging.js'
import type { QueueName } from './queues.js'

/**
 * RAIZ DE COMPOSICAO do worker.
 *
 * Como no `api`, este e o unico arquivo autorizado a conhecer adapters. Os
 * consumidores recebem portas e nao sabem quem esta do outro lado — e o que
 * permite testa-los sem Redis, sem SEFAZ e sem WhatsApp.
 *
 * **Os adapters sao os FALSOS por enquanto** (NR-040, NR-043, NR-045
 * entregaram porta + adapter falso; os reais sao NR-042, NR-044, NR-046, todos
 * bloqueados por decisao de provedor). Isso e proposital e nao gambiarra: o
 * adapter falso existe para o resto do sistema poder ser construido e testado
 * antes de a decisao sair. Trocar por real e trocar esta linha.
 */

/**
 * Leitor de vencidos ainda sem implementacao.
 *
 * Precisa do banco, e `packages/db` nao expoe repositorio nenhum — so
 * `getClient`, `migrate`, `withTenant` e o guarda de RLS. Nenhuma tarefa do
 * ledger cria esses repositorios, e isso ja esta registrado no ledger como
 * pendencia de planejamento.
 *
 * Devolve lista vazia e **avisa em cada varredura**, em vez de fingir que
 * varreu. Uma varredura silenciosa que nunca cobra ninguem e pior que uma que
 * grita: a primeira parece funcionar.
 */
const leitorDeVencidosPendente: OverdueReader = {
  listOverdue: async (hoje) => {
    log('warn', 'varredura de cobranca sem leitor de vencidos: nada foi cobrado', {
      hoje,
      motivo: 'packages/db nao expoe repositorio — ver task-ledger.md',
    })
    return []
  },
}

export function montarDeps(queues: Map<QueueName, Queue>): ConsumerDeps {
  return {
    invoices: createFakeInvoiceIssuer(),
    messages: createFakeMessageSender(),
    overdue: leitorDeVencidosPendente,
    enqueue: {
      add: async (queue, payload) => {
        const fila = queues.get(queue as QueueName)
        if (fila === undefined) {
          /* Fila desconhecida e defeito de programacao, nao condicao de
             execucao: melhor estourar aqui do que enfileirar no vazio. */
          throw new Error(`Fila desconhecida: ${queue}`)
        }
        await fila.add(queue, payload)
      },
    },
    now: () => new Date(),
  }
}
