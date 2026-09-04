import { chamarApi } from './api'
import { abrirSessao } from './session'
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
type SessaoDaApi = {
  token: string
  userId: string
  userName: string
  memberships: { companyId: string; companyName: string; role: string }[]
  activeCompanyId: string | null
}

/**
 * Entra e guarda a sessao — RF-119, RF-120.
 *
 * Com UMA loja, escolhe sozinho e devolve pronto. Com varias, seria preciso
 * perguntar — e o app ainda nao tem essa tela. Por enquanto entra na primeira e
 * o menu lateral mostra qual e; a troca de loja e a NR-078 em diante.
 *
 * A mensagem de falha e a MESMA para usuario inexistente e senha errada, e vem
 * da api — RF-120 pede nao revelar se a conta existe, e reescrever aqui
 * desfaria isso.
 */
export async function entrar(credencial: string, senha: string): Promise<ResultadoLogin> {
  const r = await chamarApi<SessaoDaApi>('/auth/login', {
    method: 'POST',
    body: { identifier: credencial, secret: senha },
  })

  if (!r.ok) return { ok: false, erro: r.message }

  let sessao = r.dados

  if (sessao.activeCompanyId === null) {
    const primeira = sessao.memberships[0]

    if (primeira === undefined) {
      return {
        ok: false,
        erro: 'Sua conta ainda nao esta ligada a nenhuma loja. Fale com quem administra.',
      }
    }

    /*
     * O token da PRIMEIRA resposta ja precisa estar guardado: a chamada de
     * escolher loja e autenticada, e sem isso ela sairia sem `Authorization`
     * e receberia 401.
     */
    await abrirSessao(
      { userId: sessao.userId, nome: sessao.userName, empresa: primeira.companyName },
      sessao.token,
    )

    const escolha = await chamarApi<SessaoDaApi>('/auth/select-company', {
      method: 'POST',
      body: { companyId: primeira.companyId },
    })

    if (!escolha.ok) return { ok: false, erro: escolha.message }
    sessao = escolha.dados
  }

  const ativa =
    sessao.memberships.find((m) => m.companyId === sessao.activeCompanyId)?.companyName ?? ''

  await abrirSessao({ userId: sessao.userId, nome: sessao.userName, empresa: ativa }, sessao.token)

  return { ok: true, usuario: { nome: sessao.userName, email: credencial, empresa: ativa } }
}
