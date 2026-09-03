import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { chamarApi } from '@/lib/api-server'
import { DURACAO_DO_COOKIE_SEGUNDOS, opcoesDoCookie, SESSION_COOKIE } from '@/lib/session'

/**
 * Sessao — NR-013, US-059.
 *
 * Este handler e a fronteira: o navegador fala com ele, ele fala com a api, e o
 * token da api **nunca atravessa de volta**. Ver `api-server.ts` para o porque.
 */

type SessaoDaApi = {
  token: string
  expiresAt: string
  userId: string
  userName: string
  memberships: { companyId: string; companyName: string; role: string }[]
  activeCompanyId: string | null
}

/** Entrar. */
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const r = await chamarApi<SessaoDaApi>('/auth/login', { method: 'POST', body: corpo })

  if (!r.ok) {
    /*
     * Repassa o status da api, incluindo 429. A tela precisa distinguir
     * "credencial errada" de "voce tentou demais" — sao acoes diferentes para
     * quem esta na frente.
     */
    return NextResponse.json({ error: { code: r.code, message: r.message } }, { status: r.status })
  }

  const resposta = NextResponse.json(semToken(r.dados))
  resposta.cookies.set(SESSION_COOKIE, r.dados.token, opcoesDoCookie(DURACAO_DO_COOKIE_SEGUNDOS))
  return resposta
}

/** Sair. */
export async function DELETE() {
  const resposta = NextResponse.json({ ok: true })
  /* `maxAge: 0` com as MESMAS opcoes: cookie apagado com path ou sameSite
     diferente do que foi escrito nao e apagado — fica um orfao que o navegador
     continua mandando. */
  resposta.cookies.set(SESSION_COOKIE, '', opcoesDoCookie(0))
  return resposta
}

/** Quem sou eu. Usado pelo shell ao abrir o painel. */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value

  if (token === undefined) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' } },
      { status: 401 },
    )
  }

  const r = await chamarApi<{
    userId: string
    activeCompanyId: string | null
    role: string | null
  }>('/auth/me', { token })

  if (!r.ok) {
    const resposta = NextResponse.json(
      { error: { code: r.code, message: r.message } },
      { status: r.status },
    )
    /* Token recusado pela api: apaga o cookie. Sem isto a pessoa fica presa
       num laco — o proxy ve o cookie e deixa passar, a tela recebe 401. */
    if (r.status === 401) resposta.cookies.set(SESSION_COOKIE, '', opcoesDoCookie(0))
    return resposta
  }

  return NextResponse.json(r.dados)
}

/** O token e o unico campo que nao pode voltar para o navegador. */
function semToken(sessao: SessaoDaApi) {
  const { token: _token, ...resto } = sessao
  return resto
}
