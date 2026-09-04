import type { NextRequest } from 'next/server'
import { corpoDe, encaminhar } from '@/lib/bff'

/** Casar com um lancamento existente — RF-079. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/conciliacao/transacoes/[id]/conciliar'>,
) {
  const { id } = await ctx.params

  return encaminhar(`/conciliacao/transacoes/${encodeURIComponent(id)}/conciliar`, {
    method: 'POST',
    body: await corpoDe(request),
  })
}
