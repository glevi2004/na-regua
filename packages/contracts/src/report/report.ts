import { z } from 'zod'
import { dateSchema, idSchema } from '../common/primitives.js'

/**
 * Relatorios de venda — NR-077, US-041.
 *
 * Faturamento mes a mes e os rankings de cliente e de produto. O DRE fica em
 * `accounting`: ele soma LANCAMENTOS classificados, por competencia, e estes
 * somam VENDAS. Sao perguntas diferentes e nao devem compartilhar schema.
 */

/**
 * Periodo, igual ao do DRE — sem padrao escondido.
 *
 * Um "mes atual" embutido aqui faria a tela, o assistente e a exportacao
 * discordarem no dia 1 de cada mes, cada um com a sua ideia de mes corrente.
 * Quem escolhe o periodo e quem pergunta.
 */
export const revenueByMonthInputSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .strict()
  .refine((p) => p.from <= p.to, {
    message: 'O inicio do periodo nao pode ser depois do fim.',
    path: ['from'],
  })

export type RevenueByMonthInput = z.infer<typeof revenueByMonthInputSchema>

/** Um mes da serie. Mes sem venda vem com zeros, e nao ausente. */
export const revenueMonthSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  grossCents: z.number().int(),
  discountsCents: z.number().int(),
  netCents: z.number().int(),
  salesCount: z.number().int(),
  /** Ticket medio do mes. Nulo quando nao houve venda — nao zero. */
  averageTicketCents: z.number().int().nullable(),
})

export type RevenueMonth = z.infer<typeof revenueMonthSchema>

export const revenueByMonthOutputSchema = z.object({
  from: z.string(),
  to: z.string(),
  months: z.array(revenueMonthSchema),
  totalNetCents: z.number().int(),
})

export type RevenueByMonthOutput = z.infer<typeof revenueByMonthOutputSchema>

/** Quantas posicoes o ranking devolve. */
export const LIMITE_PADRAO_DO_RANKING = 10
export const LIMITE_MAXIMO_DO_RANKING = 50

export const rankingInputSchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    limit: z.coerce
      .number()
      .int()
      .min(1, 'O ranking precisa de ao menos uma posicao.')
      .max(LIMITE_MAXIMO_DO_RANKING, `O ranking vai ate ${LIMITE_MAXIMO_DO_RANKING} posicoes.`)
      .default(LIMITE_PADRAO_DO_RANKING),
  })
  .strict()
  .refine((p) => p.from <= p.to, {
    message: 'O inicio do periodo nao pode ser depois do fim.',
    path: ['from'],
  })

export type RankingInput = z.infer<typeof rankingInputSchema>

export const customerRankSchema = z.object({
  customerId: idSchema,
  customerName: z.string(),
  netCents: z.number().int(),
  salesCount: z.number().int(),
  /** Ultima compra do periodo, em AAAA-MM-DD. */
  lastSaleOn: z.string(),
})

export type CustomerRank = z.infer<typeof customerRankSchema>

/**
 * O ranking, mais o que ficou de fora dele.
 *
 * `unidentifiedCents` e a venda de balcao sem cliente — a maioria, em muitas
 * lojas (RF-033). Fora da lista porque um "Nao identificado" em primeiro lugar
 * nao e um ranking de clientes; presente no resultado porque, sem ele, a soma
 * das posicoes nao bate com o faturamento e o lojista conclui que um dos dois
 * relatorios esta errado.
 */
export const customerRankingOutputSchema = z.object({
  from: z.string(),
  to: z.string(),
  customers: z.array(customerRankSchema),
  unidentifiedCents: z.number().int(),
})

export type CustomerRankingOutput = z.infer<typeof customerRankingOutputSchema>

export const productRankSchema = z.object({
  productId: idSchema,
  productName: z.string(),
  quantity: z.number().int(),
  netCents: z.number().int(),
})

export type ProductRank = z.infer<typeof productRankSchema>

/** `unlinkedCents`: item vendido sem produto no cadastro — mesma razao. */
export const productRankingOutputSchema = z.object({
  from: z.string(),
  to: z.string(),
  products: z.array(productRankSchema),
  unlinkedCents: z.number().int(),
})

export type ProductRankingOutput = z.infer<typeof productRankingOutputSchema>
