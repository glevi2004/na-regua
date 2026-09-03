/**
 * Adapter de assinatura SaaS — a NOSSA mensalidade. Implementa
 * SubscriptionProvider sobre /subscriptions/* da PagMaxx (ADR-0003).
 *
 * Separado de packages/payments de proposito: sao dois problemas de negocio
 * distintos — a nossa receita e o dinheiro do lojista.
 */
export const PLACEHOLDER = 'billing' as const
