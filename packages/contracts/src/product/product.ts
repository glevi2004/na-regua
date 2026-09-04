import { z } from 'zod'
import { cfopSchema, ncmSchema, taxSituationCodeSchema } from '../invoice/invoice.js'
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

    /*
     * Campos fiscais — RF-046. Todos OPCIONAIS no cadastro.
     *
     * Exigir os tres aqui travaria o balcao no dia da instalacao, e a RF-017
     * pede cadastro rapido. Quem cobra e a EMISSAO: ela recusa antes de
     * transmitir e diz qual produto falta classificar, que e o momento em que
     * a informacao realmente faz falta.
     */
    ncm: ncmSchema.optional(),
    /* Varia por produto: 5102 e revenda comum, 5405 e revenda com ST ja
       recolhida — e uma mercearia tem os dois na mesma prateleira. */
    cfop: cfopSchema.optional(),
    /* CST (2 digitos) no regime normal, CSOSN (3) no Simples. Qual vale sai do
       regime da empresa — ver `situacaoTributariaPadrao` em `domain`. */
    taxSituationCode: taxSituationCodeSchema.optional(),
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
  /* Fiscais — RF-046. Nulos ate o lojista informar; a emissao e quem cobra. */
  ncm: z.string().nullable(),
  cfop: z.string().nullable(),
  taxSituationCode: z.string().nullable(),
  stock: z.number().int(),
  minStock: z.number().int(),
  categoryId: idSchema.nullable(),
})

export type ProductOutput = z.infer<typeof productOutputSchema>
