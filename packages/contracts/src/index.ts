/**
 * Schemas Zod — o contrato unico do sistema.
 *
 * Cada schema serve a TRES consumidores: validacao do corpo HTTP em apps/api,
 * tipos TypeScript em todo o monorepo, e definicao das tools do agente em
 * packages/agent. E isso que garante que app e WhatsApp aceitem exatamente os
 * mesmos campos. Ver docs/arquitetura/principios.md#4-contracts-e-o-contrato-unico
 *
 * Ainda nao implementado. Ver NR-005 no docs/processo/task-ledger.md
 */
export const PLACEHOLDER = 'contracts' as const
