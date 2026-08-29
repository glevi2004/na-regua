import { z } from 'zod'

/**
 * Tipos comuns a varios schemas.
 *
 * Toda mensagem em PT-BR e dizendo o que fazer, nao so o que houve — ela vai
 * direto para a tela ([RNF-054]).
 */

/**
 * Dinheiro em centavos, sempre inteiro ([RNF-044]).
 *
 * Nao aceita decimal de proposito: `19.90` em ponto flutuante ja chega errado,
 * e arredondar depois so espalha o erro. A tela converte antes de enviar.
 */
export const moneyCentsSchema = z
  .number({ invalid_type_error: 'Informe um valor em centavos, sem virgula.' })
  .int('Valor monetario precisa ser inteiro em centavos.')
  .nonnegative('Valor nao pode ser negativo.')

/** Aceita negativo — desconto e estorno existem. */
export const signedMoneyCentsSchema = z
  .number({ invalid_type_error: 'Informe um valor em centavos, sem virgula.' })
  .int('Valor monetario precisa ser inteiro em centavos.')

/** Identificador opaco. Formato e problema do `db`, nao do contrato. */
export const idSchema = z.string().min(1, 'Identificador obrigatorio.')

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Nome muito curto.')
  .max(120, 'Nome muito longo.')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('E-mail invalido. Confira o endereco.')

/**
 * Telefone brasileiro: DDD + 8 ou 9 digitos.
 *
 * Guarda so digitos. Fixo tem 8, celular tem 9 — os dois existem no balcao.
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((d) => d.length === 10 || d.length === 11, {
    message: 'Telefone invalido. Use DDD e numero.',
  })

/**
 * Codigo de barras EAN/GTIN — 8, 12, 13 ou 14 digitos.
 *
 * Sem digito verificador aqui: leitor de balcao devolve codigo interno de
 * loja que nao segue GTIN, e recusa-lo travaria o cadastro de quem etiqueta
 * a granel.
 */
export const barcodeSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((d) => [8, 12, 13, 14].includes(d.length), {
    message: 'Codigo de barras invalido. Deve ter 8, 12, 13 ou 14 digitos.',
  })

/** Unidade de medida — glossario `UnitOfMeasure`. */
export const unitOfMeasureSchema = z.enum(['un', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'cx', 'pct'], {
  errorMap: () => ({ message: 'Unidade de medida invalida.' }),
})
export type UnitOfMeasure = z.infer<typeof unitOfMeasureSchema>

/** Papel de acesso — glossario `Role`. */
export const roleSchema = z.enum(['owner', 'staff', 'accountant', 'platform_admin'], {
  errorMap: () => ({ message: 'Papel de acesso invalido.' }),
})
export type Role = z.infer<typeof roleSchema>

/**
 * Aliquota em pontos percentuais (18 = 18%).
 *
 * Percentual e nao fracao porque e assim que o lojista fala e digita; a
 * conversao para fracao e do `domain`.
 */
export const rateSchema = z
  .number()
  .min(0, 'Aliquota nao pode ser negativa.')
  .max(100, 'Aliquota nao pode passar de 100%.')

/** Data em ISO 8601, so a parte de data. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida. Use o formato AAAA-MM-DD.')
