/**
 * Adapter de PSP — o dinheiro do LOJISTA. Implementa a porta `PaymentGateway`
 * declarada por `core`: cobranca Pix, link de pagamento, estorno, cotacao de
 * tarifas e leitura de webhook.
 *
 * O provedor real ainda nao foi decidido (DEC-006 e DEC-015) e o adapter
 * PagMaxx entra com a NR-044. O que existe hoje e o falso —
 * `PAYMENTS_PROVIDER=fake` — que satisfaz a porta inteira e **reproduz as
 * armadilhas documentadas do provedor**, porque falso que nao as reproduz nao
 * protege de nenhuma delas.
 *
 * Atencao: a API devolve dinheiro como decimal (`129.9`) e ate como string
 * (`"100.00"`). A conversao acontece NA BORDA deste pacote, com `Money.parse`
 * — nunca com `parseFloat`. Fora daqui, dinheiro e centavo inteiro.
 *
 * A suite de contrato (`payment-gateway-contract.ts`) nao e exportada aqui de
 * proposito: importa `vitest`, que e dependencia de desenvolvimento.
 */
export { centavosDeDecimal, createFakePaymentGateway, FakePaymentGateway } from './fake-gateway.js'
export type { FakePaymentGatewayOptions } from './fake-gateway.js'
