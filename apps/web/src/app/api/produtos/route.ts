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
 * Duas perguntas diferentes, e a resposta vazia significa coisas opostas.
 *
 * - `?ean=` — localizar pelo codigo lido (RF-018). Nao achou e **404**: o
 *   codigo existe no mundo e nao no cadastro da loja, e o balcao precisa saber
 *   que ha cadastro a fazer.
 * - `?q=` ou nada — o catalogo do balcao (RF-019). Nao achou e **lista
 *   vazia**: e busca sobre colecao, e "nenhum produto com esse nome" e uma
 *   resposta.
 *
 * A api ja separa as duas em caminhos distintos; aqui elas convivem porque para
 * o navegador as duas sao "consultar produto", e o handler traduz.
 */
export async function GET(request: Request) {
  const token = await comToken()
  if (token === undefined) return semSessao()

  const params = new URL(request.url).searchParams
  const ean = params.get('ean')

  /* Sem `ean`: e o catalogo, e nao um pedido malformado. */
  if (ean === null) {
    const q = params.get('q')
    const r = await chamarApi(q === null ? '/produtos' : `/produtos?q=${encodeURIComponent(q)}`, {
      token,
    })

    return r.ok
      ? NextResponse.json(r.dados)
      : NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
          status: r.status,
        })
  }

  if (ean.trim() === '') {
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
