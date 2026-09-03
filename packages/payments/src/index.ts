/**
 * Adapter de PSP — o dinheiro do LOJISTA. Implementa a porta PaymentGateway:
 * cobranca Pix, link de pagamento, estorno e tabela de tarifas.
 *
 * Provedor: PagMaxx (ADR-0003). Pix, link, cartao online; sem TEF.
 * Ver docs/arquitetura/integracoes/pagmaxx.md
 *
 * Atencao: a API devolve dinheiro como decimal (`129.9`) e ate como string
 * (`"100.00"`). A conversao para Money acontece NA BORDA deste pacote, com
 * Money.parse — nunca com parseFloat. Fora daqui, dinheiro e centavos.
 */
export const PLACEHOLDER = 'payments' as const
