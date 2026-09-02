import { z } from 'zod'
import {
  barcodeSchema,
  idSchema,
  moneyCentsSchema,
  rateSchema,
  unitOfMeasureSchema,
} from '../common/primitives.js'

/** Produto — glossario `Product`. */

export const createProductInputSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(2, 'Descricao muito curta.')
      .max(200, 'Descricao muito longa.'),
    /** Ausente em produto sem etiqueta — granel, servico, feito na hora. */
    barcode: barcodeSchema.optional(),
    unitOfMeasure: unitOfMeasureSchema,
    salePriceCents: moneyCentsSchema,
    /**
     * Custo e obrigatorio: sem ele nao existe margem, e vender sem saber a
     * margem e o problema que este produto se propoe a resolver.
     */
    costPriceCents: moneyCentsSchema,
    /** Aliquota propria. Ausente = usa a do regime da empresa. */
    taxRate: rateSchema.optional(),
    stock: z.number().int('Estoque precisa ser inteiro.').default(0),
    /** Abaixo disto a tela avisa que precisa repor. */
    minStock: z.number().int('Estoque minimo precisa ser inteiro.').nonnegative().default(0),
    categoryId: idSchema.optional(),
  })
  .strict()
  .refine((p) => p.salePriceCents >= p.costPriceCents, {
    /* Vender abaixo do custo existe (queima de estoque), mas quase sempre e
       erro de digitacao. Recusar aqui e mais barato que descobrir no DRE. */
    message: 'Preco de venda menor que o custo. Confira os valores.',
    path: ['salePriceCents'],
  })

export type CreateProductInput = z.infer<typeof createProductInputSchema>

/**
 * Atualizacao nao herda o `.refine` acima porque `partial()` remove os campos
 * que a regra compara. A checagem de preco contra custo, na edicao, e do
 * `core`, que enxerga o produto inteiro.
 */
export const updateProductInputSchema = z
  .object({
    description: z.string().trim().min(2).max(200),
    barcode: barcodeSchema,
    unitOfMeasure: unitOfMeasureSchema,
    salePriceCents: moneyCentsSchema,
    costPriceCents: moneyCentsSchema,
    taxRate: rateSchema,
    minStock: z.number().int().nonnegative(),
    categoryId: idSchema,
  })
  .partial()
  .strict()

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>

export const productOutputSchema = z.object({
  id: idSchema,
  description: z.string(),
  barcode: z.string().nullable(),
  /**
   * Codigo interno, gerado quando nao ha codigo de barras — RF-019.
   *
   * Sai no output porque e por ele que o lojista se refere ao item quando o
   * leitor nao le: etiqueta amassada, granel, produto sem embalagem. Codigo
   * gerado que a tela nao mostra nao serve para nada.
   */
  internalCode: z.string().min(1),
  unitOfMeasure: unitOfMeasureSchema,
  salePriceCents: z.number().int(),
  costPriceCents: z.number().int(),
  taxRate: z.number().nullable(),
  stock: z.number().int(),
  minStock: z.number().int(),
  categoryId: idSchema.nullable(),
})

export type ProductOutput = z.infer<typeof productOutputSchema>
