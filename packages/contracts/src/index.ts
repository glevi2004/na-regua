/**
 * Schemas Zod — o contrato unico do sistema.
 *
 * Cada schema serve tres consumidores: valida o corpo HTTP na `api`, e o tipo
 * TypeScript em todo o monorepo, e vira definicao de tool no `agent`. E o que
 * torna estrutural a promessa de que app e WhatsApp fazem a mesma coisa.
 *
 * Valida forma, nunca regra: "o CPF tem 11 digitos" e aqui; "este cliente pode
 * comprar fiado" e `core`.
 */
export * from './common/index.js'
export * from './company/company.js'
export * from './customer/customer.js'
export * from './invoice/invoice.js'
export * from './messaging/sender.js'
export * from './payment/gateway.js'
export * from './product/product.js'
export * from './schedule/appointment.js'
export * from './sale/sale.js'
