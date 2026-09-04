import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { chamarApi } from '@/lib/api-server'
import { SESSION_COOKIE } from '@/lib/session'

/** Cadastro de produto — NR-072, RF-017 a RF-019. */

type ProdutoDaApi = {
  id: string
  description: string
  barcode: string | null
  internalCode: string
  salePriceCents: number
  costPriceCents: number
}

async function comToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value
}

const semSessao = () =>
  NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' } },
    { status: 401 },
  )

export async function POST(request: Request) {
  const token = await comToken()
  if (token === undefined) return semSessao()

  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const r = await chamarApi<ProdutoDaApi>('/produtos', { method: 'POST', body: corpo, token })

  if (!r.ok) {
    return NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
      status: r.status,
    })
  }

  return NextResponse.json(r.dados, { status: 201 })
}

/**
 * Localizar pelo codigo de barras lido — RF-018.
 *
 * `?ean=` aqui, embora a api use `/produtos/codigo-de-barras/:codigo`: para o
 * navegador isto e uma consulta da tela de cadastro, e o handler traduz. Manter
 * o caminho da api aqui acoplaria a rota do Next ao formato da api sem ganho.
 */
export async function GET(request: Request) {
  const token = await comToken()
  if (token === undefined) return semSessao()

  const ean = new URL(request.url).searchParams.get('ean')

  if (ean === null || ean.trim() === '') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Informe o codigo de barras.' } },
      { status: 400 },
    )
  }

  const r = await chamarApi<ProdutoDaApi>(`/produtos/codigo-de-barras/${encodeURIComponent(ean)}`, {
    token,
  })

  if (!r.ok) {
    /* 404 aqui e resposta legitima e nao erro de sistema: o codigo lido pode
       ser de produto que a loja ainda nao cadastrou. A tela distingue. */
    return NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
      status: r.status,
    })
  }

  return NextResponse.json(r.dados)
}
