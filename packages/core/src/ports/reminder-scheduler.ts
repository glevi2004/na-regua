import type { CompanyId } from '../context.js'

/**
 * Porta do agendador de lembretes — RF-091, RF-092.
 *
 * Implementada pelo `worker` (fila BullMQ com atraso). Fica como porta, e nao
 * como chamada direta a fila, porque o caso de uso nao pode depender de qual
 * tecnologia de fila existe — e porque assim o teste roda sem Redis.
 *
 * O agendamento acontece FORA da transacao do banco: se o Redis estiver fora
 * do ar, o compromisso ainda precisa ser salvo. Perder o lembrete e ruim;
 * perder o compromisso e pior.
 */
export type ReminderScheduler = {
  /**
   * Agenda o lembrete para `fireAt`. Idempotente por `appointmentId`:
   * reagendar o mesmo compromisso substitui o lembrete anterior em vez de
   * criar um segundo.
   */
  schedule(input: {
    readonly companyId: CompanyId
    readonly appointmentId: string
    readonly fireAt: Date
  }): Promise<void>

  /**
   * Cancela o lembrete pendente. Nao e erro cancelar o que nao existe: o
   * compromisso pode nao ter lembrete, e o caso de uso nao deveria precisar
   * saber disso para poder cancelar.
   */
  cancel(companyId: CompanyId, appointmentId: string): Promise<void>
}
