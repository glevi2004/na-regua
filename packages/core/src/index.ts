/**
 * NUCLEO — casos de uso.
 *
 * Toda operacao de negocio vive aqui, com transacao, autorizacao e auditoria.
 * Recebe (deps, ExecutionContext, input) e nao sabe se a chamada veio do
 * aplicativo ou do WhatsApp. Tambem e aqui que as PORTAS dos adapters sao
 * declaradas. Ver docs/arquitetura/principios.md#1-core-e-o-nucleo
 *
 * Ainda nao implementado. Ver NR-021 no docs/processo/task-ledger.md
 */
export const PLACEHOLDER = 'core' as const
