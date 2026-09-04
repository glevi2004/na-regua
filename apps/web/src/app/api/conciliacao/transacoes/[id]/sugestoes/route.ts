import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/** Sugestoes para uma transacao — RF-078. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/conciliacao/transacoes/[id]/sugestoes'>,
) {
  const { id } = await ctx.params

  return encaminhar(`/conciliacao/transacoes/${encodeURIComponent(id)}/sugestoes`)
}
