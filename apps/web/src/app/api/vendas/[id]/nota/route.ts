import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/** Pedir a nota — RF-045. O servidor enfileira e responde 202. */
export async function POST(_request: NextRequest, ctx: RouteContext<'/api/vendas/[id]/nota'>) {
  const { id } = await ctx.params

  return encaminhar(`/vendas/${encodeURIComponent(id)}/nota`, { method: 'POST' })
}

/** O estado fiscal da venda — RF-054. */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/vendas/[id]/nota'>) {
  const { id } = await ctx.params

  return encaminhar(`/vendas/${encodeURIComponent(id)}/nota`)
}
