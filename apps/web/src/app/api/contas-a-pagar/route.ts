import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { chamarApi } from '@/lib/api-server'
import { SESSION_COOKIE } from '@/lib/session'

/**
 * Contas a pagar — NR-074, RF-055 a RF-062.
 *
 * Mesmo BFF da sessao (NR-013): o navegador fala com este handler, e o token da
 * api fica no cookie `httpOnly`.
 */

async function comToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value
}

const semSessao = () =>
  NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' } },
    { status: 401 },
  )

/** A lista agrupada por vencimento, com total por grupo. */
export async function GET() {
  const token = await comToken()
  if (token === undefined) return semSessao()

  const r = await chamarApi('/contas-a-pagar', { token })

  return r.ok
    ? NextResponse.json(r.dados)
    : NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
        status: r.status,
      })
}

/** Lancar — RF-055, RF-057. */
export async function POST(request: Request) {
  const token = await comToken()
  if (token === undefined) return semSessao()

  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const r = await chamarApi('/contas-a-pagar', { method: 'POST', body: corpo, token })

  return r.ok
    ? NextResponse.json(r.dados, { status: 201 })
    : NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
        status: r.status,
      })
}
