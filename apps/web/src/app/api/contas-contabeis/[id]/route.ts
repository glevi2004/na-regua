import type { NextRequest } from 'next/server'
import { corpoDe, encaminhar } from '@/lib/bff'

/** Renomear — RF-082. */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/contas-contabeis/[id]'>) {
  const { id } = await ctx.params

  return encaminhar(`/contas-contabeis/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: await corpoDe(request),
  })
}

/**
 * Apagar — RF-082.
 *
 * A api responde 204 sem corpo. Quem chama recebe 200 com um objeto: o `pedir`
 * do navegador le JSON, e 204 sem corpo cairia no `catch` do parse e viraria
 * "nao foi possivel carregar" numa operacao que deu certo.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/contas-contabeis/[id]'>,
) {
  const { id } = await ctx.params

  return encaminhar(`/contas-contabeis/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
