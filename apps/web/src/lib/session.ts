/**
 * Sessao do usuario.
 *
 * TEMPORARIO: sem backend, a sessao e apenas um cookie legivel pelo
 * navegador. Ele existe em cookie (e nao em localStorage) por um motivo
 * especifico: o `proxy.ts` roda no servidor e so enxerga cookies — e e la
 * que a protecao de rota precisa acontecer.
 *
 * QUANDO O BACKEND EXISTIR:
 *   - o login passa a receber um cookie httpOnly + Secure assinado pelo
 *     servidor, que o JavaScript nao consegue ler nem forjar;
 *   - o `proxy.ts` valida esse cookie (ou o token dentro dele);
 *   - este arquivo deixa de escrever cookie e passa a so ler o estado.
 *
 * ATENCAO: a checagem no proxy e uma verificacao otimista de navegacao,
 * NAO e autorizacao. Toda rota de API precisa validar a sessao no servidor
 * por conta propria — a documentacao do Next diz isso explicitamente.
 */

export const SESSION_COOKIE = 'nr_session'

export type SessionUser = {
  nome: string
  email: string
  empresa: string
}

/** Dias de validade do cookie de demonstracao. */
const MAX_AGE_DAYS = 7

export function startSession(user: SessionUser): void {
  try {
    const value = encodeURIComponent(JSON.stringify(user))
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60
    document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
  } catch {
    /* Sem acesso a cookie: a navegacao ainda funciona, so nao persiste. */
  }
}

export function endSession(): void {
  try {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  } catch {
    /* ignorado */
  }
}

export function readSession(): SessionUser | null {
  try {
    const match = document.cookie.split('; ').find((row) => row.startsWith(`${SESSION_COOKIE}=`))

    if (!match) return null
    return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')))
  } catch {
    return null
  }
}
