import type { NextRequest } from 'next/server'
import { corpoDe, encaminhar } from '@/lib/bff'

/** Criar o lancamento a partir da transacao e conciliar — RF-079. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/conciliacao/transacoes/[id]/lancamento'>,
) {
  const { id } = await ctx.params

  return encaminhar(`/conciliacao/transacoes/${encodeURIComponent(id)}/lancamento`, {
    method: 'POST',
    body: await corpoDe(request),
    okStatus: 201,
  })
}
