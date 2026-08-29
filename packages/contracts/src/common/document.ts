import { z } from 'zod'

/**
 * CPF e CNPJ.
 *
 * Valida forma, nao existencia: o digito verificador prova que o numero foi
 * digitado certo, nao que a pessoa existe na Receita. Consultar cadastro e
 * responsabilidade de um adapter, nunca daqui.
 */

/** Tira pontuacao. O usuario digita com mascara; o sistema guarda so digitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Digito verificador pelo modulo 11.
 *
 * Serve aos dois documentos: o que muda e o peso de cada posicao, e CPF e
 * CNPJ usam sequencias diferentes.
 */
function checkDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce((total, weight, i) => total + Number(digits[i]) * weight, 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

const CPF_FIRST = [10, 9, 8, 7, 6, 5, 4, 3, 2] as const
const CPF_SECOND = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11) return false
  /* 111.111.111-11 passa no modulo 11 mas nao e CPF de ninguem. */
  if (/^(\d)\1{10}$/.test(d)) return false

  return Number(d[9]) === checkDigit(d, CPF_FIRST) && Number(d[10]) === checkDigit(d, CPF_SECOND)
}

const CNPJ_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const
const CNPJ_SECOND = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  return Number(d[12]) === checkDigit(d, CNPJ_FIRST) && Number(d[13]) === checkDigit(d, CNPJ_SECOND)
}

/** Guarda so digitos: mascara e decisao de tela, nao de dado. */
export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCpf, { message: 'CPF invalido. Confira os numeros.' })

export const cnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCnpj, { message: 'CNPJ invalido. Confira os numeros.' })

/**
 * Cliente pode ser pessoa fisica ou juridica, e o balcao nao pergunta qual —
 * digita o numero e o sistema decide pelo tamanho.
 */
export const documentSchema = z
  .string()
  .transform(onlyDigits)
  .refine((d) => (d.length === 11 ? isValidCpf(d) : d.length === 14 ? isValidCnpj(d) : false), {
    message: 'Documento invalido. Informe um CPF ou CNPJ.',
  })
