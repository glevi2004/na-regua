/**
 * ============================================================================
 * PONTOS DE INTEGRACAO — AUTENTICACAO (MOBILE)
 * ============================================================================
 *
 *  | Funcao  | Endpoint esperado | Disparo         |
 *  |---------|-------------------|-----------------|
 *  | entrar  | POST /auth/login  | submit do login |
 *
 * O mobile NAO tem criacao de conta nem fluxo de assinatura. Contratar o
 * plano, pagar e regularizar pendencia sao tarefas de retaguarda e ficam
 * so no web — aqui o lojista entra com uma conta que ja existe.
 */

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type Usuario = {
  nome: string
  email: string
  empresa: string
}

export type ResultadoLogin = { ok: true; usuario: Usuario } | { ok: false; erro: string }

/**
 * SUBSTITUIR POR: POST /auth/login
 *
 * Sem backend, qualquer credencial com senha de 6+ caracteres entra.
 */
export async function entrar(credencial: string, senha: string): Promise<ResultadoLogin> {
  await espera(900)

  if (senha.length < 6) {
    return { ok: false, erro: 'E-mail ou senha incorretos.' }
  }

  return {
    ok: true,
    usuario: {
      nome: 'Marina Alves',
      email: credencial,
      empresa: 'Mercearia Sol Nascente',
    },
  }
}
