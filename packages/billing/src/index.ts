/**
 * Adapter de assinatura SaaS — a NOSSA mensalidade. Implementa
 * SubscriptionProvider sobre POST /v3/subscriptions da conta-pai Asaas (ADR-0007).
 *
 * Separado de packages/payments de proposito: sao dois problemas de negocio
 * distintos — a nossa receita e o dinheiro do lojista.
 */
export const PLACEHOLDER = 'billing' as const
