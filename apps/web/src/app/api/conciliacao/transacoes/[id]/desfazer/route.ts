import type { NextRequest } from 'next/server'
import { corpoDe, encaminhar } from '@/lib/bff'

/** Desfazer — RF-080. Nada e apagado: os dois voltam para a fila. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/conciliacao/transacoes/[id]/desfazer'>,
) {
  const { id } = await ctx.params

  return encaminhar(`/conciliacao/transacoes/${encodeURIComponent(id)}/desfazer`, {
    method: 'POST',
    body: await corpoDe(request),
  })
}
