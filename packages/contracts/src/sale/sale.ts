import { z } from 'zod'
import { idSchema, moneyCentsSchema, rateSchema } from '../common/primitives.js'

/**
 * Venda — glossario `Sale`. Documento fechado; nunca `Order` no MVP.
 *
 * Os nomes acompanham `packages/domain` (`SaleItemInput`, `PaymentInput`),
 * mas as formas nao: la o dinheiro ja e `Money`, aqui ainda e centavo cru
 * vindo do JSON. Converter e do `core`, na fronteira entre os dois.
 */

/** Formas aceitas no fechamento — RF-034. */
export const paymentMethodSchema = z.enum(['cash', 'pix', 'boleto', 'debit', 'credit', 'wallet'], {
  errorMap: () => ({ message: 'Forma de pagamento invalida.' }),
})
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const cardBrandSchema = z.enum(
  ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'unknown'],
  { errorMap: () => ({ message: 'Bandeira de cartao invalida.' }) },
)
export type CardBrand = z.infer<typeof cardBrandSchema>

export const saleItemInputSchema = z
  .object({
    productId: idSchema,
    /** Inteiro >= 1. Fracao e do cadastro (`UnitOfMeasure`), nao da venda. */
    quantity: z.number().int('Quantidade precisa ser inteira.').positive('Quantidade minima e 1.'),
    /**
     * Preco praticado, nao o de tabela: o balcao negocia, e a venda tem de
     * registrar o que foi cobrado de fato.
     */
    unitPriceCents: moneyCentsSchema,
    discountCents: moneyCentsSchema.optional(),
  })
  .strict()

export type SaleItemInput = z.infer<typeof saleItemInputSchema>

export const paymentInputSchema = z
  .object({
    method: paymentMethodSchema,
    amountCents: moneyCentsSchema,
    /** So faz sentido em credito. Ausente = a vista. */
    installments: z
      .number()
      .int()
      .min(1, 'Numero de parcelas invalido.')
      .max(21, 'Maximo de 21 parcelas.')
      .optional(),
    /** Ausente no balcao: a maquininha nem sempre informa. */
    brand: cardBrandSchema.optional(),
  })
  .strict()
  .refine((p) => p.method === 'credit' || p.installments === undefined, {
    message: 'Parcelamento so vale para credito.',
    path: ['installments'],
  })

export type PaymentInput = z.infer<typeof paymentInputSchema>

export const createSaleInputSchema = z
  .object({
    /** Ausente = venda sem cliente, que e a maioria no balcao. */
    customerId: idSchema.optional(),
    items: z
      .array(saleItemInputSchema)
      .min(1, 'A venda precisa de ao menos um item.')
      .max(200, 'Venda com itens demais. Divida em duas.'),
    payments: z.array(paymentInputSchema).min(1, 'Informe ao menos uma forma de pagamento.'),
    /** Desconto no total, alem dos descontos por item. */
    discountCents: moneyCentsSchema.optional(),
    surchargeRate: rateSchema.optional(),
    notes: z.string().trim().max(500, 'Observacao muito longa.').optional(),
  })
  .strict()
  .refine((s) => s.payments.every((p) => p.method !== 'wallet') || s.customerId !== undefined, {
    /* Fiado sem cliente e divida de ninguem. */
    message: 'Venda no fiado exige cliente identificado.',
    path: ['customerId'],
  })

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>

export const saleOutputSchema = z.object({
  id: idSchema,
  number: z.number().int(),
  customerId: idSchema.nullable(),
  status: z.enum(['open', 'settled', 'cancelled', 'returned']),
  grossAmountCents: z.number().int(),
  discountCents: z.number().int(),
  taxAmountCents: z.number().int(),
  cardFeeAmountCents: z.number().int(),
  netAmountCents: z.number().int(),
  createdAt: z.string(),
})

export type SaleOutput = z.infer<typeof saleOutputSchema>
