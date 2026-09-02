/**
 * Adapter de emissao fiscal (NFC-e / NFS-e). Implementa a porta `InvoiceIssuer`
 * declarada por `core`.
 *
 * O provedor real ainda nao foi escolhido (DEC-004), e o adapter real entra com
 * a NR-042. O que existe hoje e o falso — `FISCAL_PROVIDER=fake` — que satisfaz
 * a porta inteira, inclusive os caminhos de erro, e permite que a venda, a fila
 * e a tela sejam construidas sem esperar a decisao.
 *
 * A suite de contrato (`invoice-issuer-contract.ts`) NAO e exportada aqui de
 * proposito: ela importa `vitest`, que e dependencia de desenvolvimento. Quem
 * precisa dela e o teste do adapter real, dentro deste mesmo pacote.
 */
export { chaveDeAcesso, createFakeInvoiceIssuer, FakeInvoiceIssuer } from './fake-issuer.js'
export type { FakeInvoiceIssuerOptions } from './fake-issuer.js'
