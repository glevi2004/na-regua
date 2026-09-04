import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { chamarApi } from './api-server'
import { SESSION_COOKIE } from './session'

/**
 * O encaminhamento do BFF, num lugar so — NR-013, NR-076.
 *
 * Todo handler daqui faz a mesma coisa: pega o token do cookie `httpOnly`,
 * chama a api e traduz a resposta. Escrito a mao em cada arquivo, o pedaco que
 * some primeiro e o `if (token === undefined)` — e um handler sem ele nao falha
 * em desenvolvimento (a api recusa e a tela mostra erro), so deixa de proteger.
 *
 * `import 'server-only'`: se este modulo entrar num componente de cliente por
 * engano, o build quebra em vez de mandar o cookie para o navegador.
 */

const semSessao = () =>
  NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' } },
    { status: 401 },
  )

export type OpcoesDeEncaminhamento = {
  readonly method?: string
  readonly body?: unknown
  /** Codigo do sucesso, quando nao e 200. */
  readonly okStatus?: number
}

export async function encaminhar(
  caminho: string,
  opcoes: OpcoesDeEncaminhamento = {},
): Promise<NextResponse> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token === undefined) return semSessao()

  const r = await chamarApi(caminho, {
    method: opcoes.method,
    body: opcoes.body,
    token,
  })

  return r.ok
    ? /* `dados` vem indefinido quando a api responde 204 (apagar conta do
         plano, por exemplo). `NextResponse.json(undefined)` escreve o texto
         "undefined" no corpo, que estoura no parse do navegador — entao vira
         um objeto de verdade. */
      NextResponse.json(r.dados ?? { ok: true }, { status: opcoes.okStatus ?? 200 })
    : /*
       * O corpo CRU da api quando ele existe, e nao so codigo e mensagem.
       *
       * E o que faz a recusa de arquivo chegar na tela com a linha do problema
       * (`fields`), em vez de virar "arquivo invalido" — a mesma razao pela
       * qual a tela de clientes recebe os candidatos a duplicata.
       */
      NextResponse.json(r.corpo ?? { error: { code: r.code, message: r.message } }, {
        status: r.status,
      })
}

/** O corpo JSON do pedido, ou vazio — corpo malformado nao derruba o handler. */
export async function corpoDe(request: Request): Promise<Record<string, unknown>> {
  return (await request.json().catch(() => ({}))) as Record<string, unknown>
}
