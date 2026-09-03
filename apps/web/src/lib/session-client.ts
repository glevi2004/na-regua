import type { SessionUser } from './session'

/**
 * Sessao, do lado do navegador — NR-013.
 *
 * Nenhuma destas funcoes fala com a api: todas falam com os Route Handlers do
 * Next em `/api/session`, que sao quem guarda o token. E o que mantem o token
 * fora do alcance do JavaScript da pagina — ver `api-server.ts`.
 *
 * O cookie viaja sozinho porque as chamadas sao para a MESMA origem. Nenhuma
 * delas precisa (nem pode) montar um cabecalho `Authorization`.
 */

export type ResultadoDaSessao =
  | { readonly ok: true; readonly sessao: SessionUser }
  | { readonly ok: false; readonly code: string; readonly message: string }

async function pedir(caminho: string, init: RequestInit): Promise<ResultadoDaSessao> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      ...init,
      headers: { 'content-type': 'application/json' },
      /* A rota e da mesma origem, mas explicitar evita que uma mudanca de
         configuracao de fetch no futuro apague o cookie da chamada. */
      credentials: 'same-origin',
    })
  } catch {
    return { ok: false, code: 'OFFLINE', message: 'Sem conexao. Verifique sua internet.' }
  }

  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, never>

  if (!resposta.ok) {
    const erro = (corpo as { error?: { code?: string; message?: string } }).error
    return {
      ok: false,
      code: erro?.code ?? 'UNKNOWN',
      message: erro?.message ?? 'Nao foi possivel completar. Tente de novo.',
    }
  }

  return { ok: true, sessao: corpo as unknown as SessionUser }
}

export const entrar = (identifier: string, secret: string): Promise<ResultadoDaSessao> =>
  pedir('/api/session', { method: 'POST', body: JSON.stringify({ identifier, secret }) })

export const escolherEmpresa = (companyId: string): Promise<ResultadoDaSessao> =>
  pedir('/api/session/empresa', { method: 'POST', body: JSON.stringify({ companyId }) })

/**
 * Sair.
 *
 * Nao devolve resultado: sair sempre "da certo" do ponto de vista de quem
 * clicou. Se a chamada falhar, o cookie pode sobrar — e por isso quem chama
 * navega para o login de qualquer jeito.
 */
export async function sair(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }).catch(
    () => undefined,
  )
}
