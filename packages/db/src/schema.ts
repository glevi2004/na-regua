import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey(),
  legalName: text('legal_name').notNull(),
  tradeName: text('trade_name'),
  cnpj: text('cnpj').notNull().unique(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  stateRegistration: text('state_registration'),
  municipalRegistration: text('municipal_registration'),
  street: text('street').notNull(),
  streetNumber: text('street_number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  postalCode: text('postal_code').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  cityIbgeCode: text('city_ibge_code'),
  taxRegime: text('tax_regime').notNull(),
  optedReformaHibrida: boolean('opted_reforma_hibrida').notNull().default(false),
  taxRate: numeric('tax_rate', { precision: 7, scale: 4 }),
  whatsappLinkedAt: timestamp('whatsapp_linked_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id').references(() => companies.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(),
    ...timestamps,
  },
  (t) => [index('users_company_id_idx').on(t.companyId)],
)

export const companyFocus = pgTable('company_focus', {
  companyId: uuid('company_id')
    .primaryKey()
    .references(() => companies.id),
  focusCompanyId: text('focus_company_id'),
  focusTokenSecretRef: text('focus_token_secret_ref'),
  nfceEnabled: boolean('nfce_enabled').notNull().default(false),
  nfseEnabled: boolean('nfse_enabled').notNull().default(false),
  certificateStatus: text('certificate_status').notNull().default('missing'),
  certificateExpiresAt: timestamp('certificate_expires_at', { withTimezone: true, mode: 'date' }),
  hasNfceCsc: boolean('has_nfce_csc').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const companyPagmaxx = pgTable('company_pagmaxx', {
  companyId: uuid('company_id')
    .primaryKey()
    .references(() => companies.id),
  onboardingStatus: text('onboarding_status').notNull().default('not_started'),
  accountId: text('account_id'),
  secretRef: text('secret_ref'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: text('name').notNull(),
    document: text('document'),
    phone: text('phone'),
    email: text('email'),
    notes: text('notes'),
    walletLimitCents: bigint('wallet_limit_cents', { mode: 'number' }).notNull().default(0),
    walletBalanceCents: bigint('wallet_balance_cents', { mode: 'number' }).notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('customers_company_created_idx').on(t.companyId, t.createdAt),
    index('customers_company_document_idx').on(t.companyId, t.document),
    index('customers_company_phone_idx').on(t.companyId, t.phone),
  ],
)

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    customerId: uuid('customer_id')
      .primaryKey()
      .references(() => customers.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    street: text('street').notNull(),
    streetNumber: text('street_number').notNull(),
    complement: text('complement'),
    neighborhood: text('neighborhood').notNull(),
    postalCode: text('postal_code').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    cityIbgeCode: text('city_ibge_code'),
  },
  (t) => [index('customer_addresses_company_idx').on(t.companyId)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    kind: text('kind').notNull(),
    description: text('description').notNull(),
    barcode: text('barcode'),
    unitOfMeasure: text('unit_of_measure').notNull(),
    salePriceCents: bigint('sale_price_cents', { mode: 'number' }).notNull(),
    costPriceCents: bigint('cost_price_cents', { mode: 'number' }).notNull(),
    stock: integer('stock').notNull().default(0),
    minStock: integer('min_stock').notNull().default(0),
    taxRate: numeric('tax_rate', { precision: 7, scale: 4 }),
    category: text('category'),
    supplier: text('supplier'),
    ncm: text('ncm'),
    codigoTributacaoNacionalIss: text('codigo_tributacao_nacional_iss'),
    codigoNbs: text('codigo_nbs'),
    ...timestamps,
  },
  (t) => [
    index('products_company_created_idx').on(t.companyId, t.createdAt),
    uniqueIndex('products_company_barcode_idx')
      .on(t.companyId, t.barcode)
      .where(sql`${t.barcode} IS NOT NULL`),
  ],
)

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    customerId: uuid('customer_id').references(() => customers.id),
    number: integer('number').notNull(),
    status: text('status').notNull(),
    grossAmountCents: bigint('gross_amount_cents', { mode: 'number' }).notNull(),
    discountCents: bigint('discount_cents', { mode: 'number' }).notNull().default(0),
    taxAmountCents: bigint('tax_amount_cents', { mode: 'number' }).notNull(),
    cardFeeAmountCents: bigint('card_fee_amount_cents', { mode: 'number' }).notNull(),
    netAmountCents: bigint('net_amount_cents', { mode: 'number' }).notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    unique('sales_company_number_unique').on(t.companyId, t.number),
    index('sales_company_created_idx').on(t.companyId, t.createdAt),
  ],
)

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityDelta: integer('quantity_delta').notNull(),
    reason: text('reason').notNull(),
    saleId: uuid('sale_id').references(() => sales.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('inventory_movements_company_created_idx').on(t.companyId, t.createdAt)],
)

export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).notNull(),
    discountCents: bigint('discount_cents', { mode: 'number' }).notNull().default(0),
    ncm: text('ncm'),
    codigoTributacaoNacionalIss: text('codigo_tributacao_nacional_iss'),
    codigoNbs: text('codigo_nbs'),
  },
  (t) => [index('sale_items_company_sale_idx').on(t.companyId, t.saleId)],
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),
    method: text('method').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    installments: integer('installments'),
    brand: text('brand'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('payments_company_sale_idx').on(t.companyId, t.saleId)],
)

export const paymentPagmaxx = pgTable(
  'payment_pagmaxx',
  {
    paymentId: uuid('payment_id')
      .primaryKey()
      .references(() => payments.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    providerPaymentId: text('provider_payment_id'),
    providerStatus: text('provider_status'),
    checkoutUrl: text('checkout_url'),
    providerEventId: text('provider_event_id').unique(),
    cardTokenRef: text('card_token_ref'),
  },
  (t) => [index('payment_pagmaxx_company_idx').on(t.companyId)],
)

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    providerRef: text('provider_ref').notNull(),
    providerStatusCode: text('provider_status_code'),
    providerMessage: text('provider_message'),
    providerPayload: jsonb('provider_payload'),
    number: text('number'),
    xmlPath: text('xml_path'),
    danfeUrl: text('danfe_url'),
    accessKey: text('access_key'),
    series: text('series'),
    qrCode: text('qr_code'),
    ...timestamps,
  },
  (t) => [
    unique('invoices_company_provider_ref_unique').on(t.companyId, t.providerRef),
    index('invoices_company_sale_idx').on(t.companyId, t.saleId),
  ],
)

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    companyId: uuid('company_id').references(() => companies.id),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [unique('webhook_events_provider_event_unique').on(t.provider, t.eventId)],
)
