import type { ReminderScheduler } from '@na-regua/core'
import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

/**
 * Agendador de lembretes — NR-036, RF-091, RF-092.
 *
 * Fila com atraso: o job existe desde que o compromisso e marcado e so fica
 * pronto na hora do lembrete. E o que permite cancelar depois — um `setTimeout`
 * no processo morreria no primeiro deploy, e um varredor periodico precisaria
 * consultar a agenda inteira a cada minuto para achar os poucos que vencem.
 *
 * ## O nome da fila esta duplicado, e isso e sabido
 *
 * `apps/worker/src/queues.ts` tem a lista das filas, mas `apps/api` nao pode
 * importar de `apps/worker` — sao dois aplicativos, e a fronteira existe por
 * bons motivos. Um pacote so para constante de fila resolveria, e e tarefa
 * propria; duplicar UMA string com este comentario custa menos hoje.
 *
 * Nomenclatura: `<dominio>-<acao>` em kebab-case, sem `:` — o BullMQ reserva os
 * dois-pontos como separador de chave no Redis e recusa o nome em execucao.
 */
export const FILA_DE_LEMBRETE = 'appointment-remind'

/**
 * O id do job E o id do compromisso.
 *
 * E o que torna `schedule` idempotente sem contador nem consulta: o BullMQ
 * recusa job com id repetido, entao reagendar o mesmo compromisso nao cria um
 * segundo lembrete. A porta exige essa propriedade, e aqui ela sai de graca.
 *
 * Prefixado pela empresa porque id de compromisso e unico por tabela, mas a
 * chave do Redis e global — e duas lojas nao deveriam poder colidir.
 */
const jobId = (companyId: string, appointmentId: string): string => `${companyId}-${appointmentId}`

export function createReminderScheduler(connection: Redis): ReminderScheduler {
  const fila = new Queue(FILA_DE_LEMBRETE, { connection })

  return {
    schedule: async ({ companyId, appointmentId, fireAt }) => {
      const id = jobId(companyId, appointmentId)

      /*
       * Remove antes de agendar. Sem isto, reagendar um compromisso adiado
       * manteria o lembrete no horario ANTIGO: o BullMQ ignora o job novo por
       * causa do id repetido, e o velho continua de pe — o lembrete chegaria na
       * hora errada, que e pior que nao chegar.
       */
      await fila.remove(id).catch(() => undefined)

      await fila.add(
        FILA_DE_LEMBRETE,
        { companyId, appointmentId },
        {
          jobId: id,
          /* Atraso a partir de agora. Negativo o BullMQ trata como zero, e o
             caso de uso ja recusa antecedencia que cairia no passado. */
          delay: Math.max(0, fireAt.getTime() - Date.now()),
          removeOnComplete: true,
          /* Falha fica visivel para reprocessar — RNF-062. */
          removeOnFail: false,
        },
      )
    },

    cancel: async (companyId, appointmentId) => {
      /* Nao e erro cancelar o que nao existe: o compromisso pode nao ter
         lembrete, e a porta diz explicitamente que o caso de uso nao deveria
         precisar saber disso. */
      await fila.remove(jobId(companyId, appointmentId)).catch(() => undefined)
    },
  }
}
