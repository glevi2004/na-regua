/**
 * NUCLEO — casos de uso.
 *
 * Toda operacao de negocio vive aqui, com transacao, autorizacao e auditoria.
 * Recebe (deps, ExecutionContext, input) e nao sabe se a chamada veio do
 * aplicativo ou do WhatsApp. Tambem e aqui que as PORTAS dos adapters sao
 * declaradas. Ver docs/arquitetura/principios.md#1-core-e-o-nucleo
 *
 * A agenda (NR-034) e o primeiro caso de uso completo e serve de molde para os
 * proximos: porta declarada aqui, repositorio injetado, teste com implementacao
 * em memoria. Cadastros e venda vem com NR-021 e NR-022.
 */
export { AppError, isAppError } from './app-error.js'
export type { AppErrorCode, FieldIssue } from './app-error.js'

export { assertCanWrite } from './authorization.js'

export type { Channel, CompanyId, ExecutionContext, UseCase, UserId } from './context.js'

/* --- Portas: interfaces que db, worker e os adapters implementam --- */
export type { AppointmentRepository, NewAppointment } from './ports/appointment-repository.js'
export type { InvoiceIssuer } from './ports/invoice-issuer.js'
export type { ReminderScheduler } from './ports/reminder-scheduler.js'

/* --- Agenda — NR-034 --- */
export { cancelAppointment } from './schedule/cancel-appointment.js'
export type { CancelAppointmentDeps } from './schedule/cancel-appointment.js'
export { createAppointment, reminderFireAt } from './schedule/create-appointment.js'
export type { CreateAppointmentDeps } from './schedule/create-appointment.js'
export { listDayAppointments } from './schedule/list-day-appointments.js'
export type { DayAgenda, ListDayAppointmentsDeps } from './schedule/list-day-appointments.js'
