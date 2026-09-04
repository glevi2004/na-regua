import { chamarApi } from './api'

/**
 * Resultado do periodo — NR-077, RF-085, US-041.
 *
 * Fala com `GET /relatorios/dre`, a mesma rota do web. O app NAO tem uma conta
 * propria: a ordem das subtracoes vem de `domain` e chega pronta, e e
 * exatamente a parte que nao pode variar entre a tela do celular, a do
 * computador e o resumo do assistente. Somar aqui daria uma segunda resposta
 * para "o mes fechou no azul".
 */

export type TipoDeConta = 'revenue' | 'deduction' | 'cost' | 'expense'

export type LinhaDoDre = {
  readonly accountId: string | null
  readonly accountName: string
  readonly type: TipoDeConta
  readonly amountCents: number
  readonly entryCount: number
}

export type Dre = {
  readonly from: string
  readonly to: string
  readonly grossRevenueCents: number
  readonly deductionsCents: number
  readonly netRevenueCents: number
  readonly costCents: number
  readonly grossProfitCents: number
  readonly expensesCents: number
  readonly resultCents: number
  /** Pontos por cem (18 = 18%). Nulo quando nao houve receita. */
  readonly grossMarginPoints: number | null
  readonly lines: readonly LinhaDoDre[]
}

export type ResultadoDre<T> =
  { readonly ok: true; readonly dados: T } | { readonly ok: false; readonly erro: string }

/**
 * O mes de uma data, em `AAAA-MM-DD`.
 *
 * Campos LOCAIS, nunca `toISOString`: no fuso do Brasil o dia 1 as 00h ainda e
 * o dia 30 em UTC, e o mes comecaria no anterior. O mesmo cuidado de
 * `hojeLocal` na agenda.
 */
export function mesLocal(agora: Date = new Date()): { de: string; ate: string } {
  const ano = agora.getFullYear()
  const mes = agora.getMonth()
  const dois = (n: number) => String(n).padStart(2, '0')

  /* Dia 0 do mes seguinte e o ultimo deste — inclusive em fevereiro bissexto. */
  const ultimo = new Date(ano, mes + 1, 0).getDate()

  return {
    de: `${ano}-${dois(mes + 1)}-01`,
    ate: `${ano}-${dois(mes + 1)}-${dois(ultimo)}`,
  }
}

export async function carregarDre(de: string, ate: string): Promise<ResultadoDre<Dre>> {
  const r = await chamarApi<Dre>(
    `/relatorios/dre?from=${encodeURIComponent(de)}&to=${encodeURIComponent(ate)}`,
  )

  return r.ok ? { ok: true, dados: r.dados } : { ok: false, erro: r.message }
}
