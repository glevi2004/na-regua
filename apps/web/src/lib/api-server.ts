import 'server-only'

/**
 * Chamada a api, do SERVIDOR do Next — NR-013.
 *
 * `server-only` no topo nao e decoracao: ele faz o build QUEBRAR se alguem
 * importar este arquivo de um componente de cliente. Sem isso, o import errado
 * mandaria a `API_URL` interna e, pior, o token da sessao para o navegador — e
 * quebrar no build e infinitamente melhor que descobrir isso em producao.
 *
 * ## Por que a api nao e chamada direto do navegador
 *
 * A api devolve o token no CORPO, sem `Set-Cookie` (decisao registrada na
 * NR-014: cookie exigiria CSRF, e CSRF exige uma decisao de dominio que a
 * DEC-009 ainda nao tomou). Se o navegador guardasse esse token — em
 * `localStorage` ou em cookie legivel — qualquer XSS o levaria embora, e com
 * ele doze horas de sessao.
 *
 * Com o Next no meio, o token fica em cookie `httpOnly` que o JavaScript da
 * pagina nao le. O custo e real: toda chamada passa por aqui. O ganho e que
 * XSS deixa de ser roubo de sessao.
 */

/** Base da api. Variavel de servidor — NAO e `NEXT_PUBLIC_`, de proposito. */
const API_URL = process.env.API_URL ?? 'http://localhost:3333'

/** O envelope de erro que a api usa em todas as rotas. */
type EnvelopeDeErro = {
  error: { code: string; message: string; fields?: { path: string; message: string }[] }
}

export type Resposta<T> =
  | { readonly ok: true; readonly dados: T }
  | {
      readonly ok: false
      readonly status: number
      readonly code: string
      readonly message: string
      /**
       * O corpo bruto do erro.
       *
       * Existe porque nem tudo que vem num 4xx e detalhe do erro. O 409 de
       * cliente duplicado traz `candidates` FORA do envelope — sao a
       * informacao que permite decidir, e sem isto eles se perderiam aqui, a
       * um passo da tela que precisa mostra-los.
       */
      readonly corpo: unknown
    }

/**
 * A mensagem quando a api nao responde.
 *
 * Generica de proposito: "ECONNREFUSED 127.0.0.1:3333" na tela nao ajuda o
 * lojista e conta a topologia interna para quem estiver olhando.
 */
const INDISPONIVEL = 'Nao conseguimos falar com o servidor. Tente de novo em instantes.'

export async function chamarApi<T>(
  caminho: string,
  opcoes: { method?: string; body?: unknown; token?: string | undefined } = {},
): Promise<Resposta<T>> {
  let resposta: Response

  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: opcoes.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(opcoes.token === undefined ? {} : { authorization: `Bearer ${opcoes.token}` }),
      },
      ...(opcoes.body === undefined ? {} : { body: JSON.stringify(opcoes.body) }),
      /* Sessao nunca vem de cache. */
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 503, code: 'UNAVAILABLE', message: INDISPONIVEL, corpo: null }
  }

  if (resposta.ok) {
    /*
     * `204 No Content` NAO tem corpo, e `json()` num corpo vazio lanca.
     *
     * Sem esta guarda, apagar uma conta do plano (RF-082) funcionava na api e
     * voltava 500 para a tela: a operacao dava certo e o lojista via erro, que
     * e o pior desencontro possivel — ele tentaria de novo e receberia "conta
     * nao encontrada".
     */
    if (resposta.status === 204) return { ok: true, dados: undefined as T }

    return { ok: true, dados: (await resposta.json()) as T }
  }

  /*
   * Erro da api: repassa codigo e mensagem, que ja vem em PT-BR e ja foram
   * pensados para a tela (RNF-054). Reescrever aqui criaria duas versoes da
   * mesma mensagem, e elas divergiriam.
   */
  try {
    const envelope = (await resposta.json()) as EnvelopeDeErro
    return {
      ok: false,
      status: resposta.status,
      code: envelope.error?.code ?? 'UNKNOWN',
      message: envelope.error?.message ?? INDISPONIVEL,
      corpo: envelope,
    }
  } catch {
    /* Resposta sem corpo JSON — 502 de um proxy, por exemplo. */
    return {
      ok: false,
      status: resposta.status,
      code: 'UNKNOWN',
      message: INDISPONIVEL,
      corpo: null,
    }
  }
}
