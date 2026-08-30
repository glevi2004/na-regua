/**
 * NUCLEO — casos de uso.
 *
 * Toda operacao de negocio vive aqui, com transacao, autorizacao e auditoria.
 * Recebe (deps, ExecutionContext, input) e nao sabe se a chamada veio do
 * aplicativo ou do WhatsApp. Tambem e aqui que as PORTAS dos adapters sao
 * declaradas. Ver docs/arquitetura/principios.md#1-core-e-o-nucleo
 *
 * Os casos de uso em si ainda nao existem — NR-021 em diante. O que ja esta
 * aqui e o vocabulario que `apps/api` precisa para montar a borda: o contexto
 * de execucao e o erro tipado que ele traduz para HTTP (NR-009).
 */
export { AppError, isAppError } from './app-error.js'
export type { AppErrorCode, FieldIssue } from './app-error.js'

export type { Channel, CompanyId, ExecutionContext, UseCase, UserId } from './execution-context.js'
