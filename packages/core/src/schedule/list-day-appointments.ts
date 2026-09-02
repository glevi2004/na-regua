import type { AppointmentOutput, ListDayAppointmentsInput } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import type { AppointmentRepository } from '../ports/appointment-repository.js'

export type ListDayAppointmentsDeps = {
  readonly appointments: AppointmentRepository
}

export type DayAgenda = {
  readonly day: string
  readonly appointments: readonly AppointmentOutput[]
  /**
   * Confirmacao explicita de agenda livre — RF-093.
   *
   * Existe como campo, e nao como lista vazia, porque "nao ha nada hoje" e
   * "nao consegui carregar" sao coisas diferentes e a tela precisa distinguir.
   * Lista vazia sozinha nao diz qual das duas aconteceu.
   */
  readonly isEmpty: boolean
}

/**
 * Compromissos do dia, em ordem de horario — RF-093.
 *
 * Leitura: nao passa por `assertCanWrite`. `accountant` e somente leitura,
 * entao pode ver a agenda.
 */
export async function listDayAppointments(
  deps: ListDayAppointmentsDeps,
  ctx: ExecutionContext,
  input: ListDayAppointmentsInput,
): Promise<DayAgenda> {
  /*
   * O dia chega no fuso de exibicao e o armazenamento e UTC. A conversao
   * correta depende do fuso da empresa, que ainda nao existe no contexto —
   * ate la, o intervalo e o dia em UTC.
   *
   * Nao e detalhe: para o fuso de Sao Paulo (UTC-3), um compromisso das 22h
   * cai no dia seguinte em UTC e sumiria da agenda de hoje. Quando o fuso da
   * empresa entrar no ExecutionContext, e aqui que ele se aplica.
   */
  const from = new Date(`${input.day}T00:00:00.000Z`)
  const to = new Date(`${input.day}T23:59:59.999Z`)

  const appointments = await deps.appointments.listBetween(ctx.companyId, from, to)

  return {
    day: input.day,
    appointments,
    isEmpty: appointments.length === 0,
  }
}
