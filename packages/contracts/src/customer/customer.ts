import { z } from 'zod'
import { documentSchema } from '../common/document.js'
import {
  emailSchema,
  idSchema,
  moneyCentsSchema,
  nameSchema,
  phoneSchema,
} from '../common/primitives.js'

/**
 * Cliente da loja — glossario `Customer`. Nunca `Client`, que fica reservado
 * para cliente HTTP.
 */

export const createCustomerInputSchema = z
  .object({
    name: nameSchema,
    /**
     * Documento e telefone sao opcionais de proposito: no balcao a venda
     * acontece antes do cadastro completo, e exigir CPF para vender empurra
     * o lojista de volta para o caderno.
     */
    document: documentSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    notes: z.string().trim().max(500, 'Observacao muito longa.').optional(),
    /** Teto do fiado. Ausente = sem fiado liberado. */
    walletLimitCents: moneyCentsSchema.optional(),
  })
  .strict()

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>

export const updateCustomerInputSchema = createCustomerInputSchema.partial().strict()
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>

export const customerOutputSchema = z.object({
  id: idSchema,
  name: z.string(),
  document: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  walletLimitCents: z.number().int(),
  /** Saldo devedor. Positivo = o cliente deve para a loja. */
  walletBalanceCents: z.number().int(),
  createdAt: z.string(),
})

export type CustomerOutput = z.infer<typeof customerOutputSchema>
