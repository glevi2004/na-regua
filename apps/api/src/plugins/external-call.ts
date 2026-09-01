import type { FastifyBaseLogger } from 'fastify'

/**
 * Registro de chamada a provedor externo — RNF-059.
 *
 * Quando uma integracao falha, a pergunta seguinte e sempre a mesma: o que
 * mandamos, o que voltou e quanto demorou. Sem os tres, o suporte abre chamado
 * com o fornecedor sem ter o que mostrar.
 *
 * O que NAO pode ir junto e credencial e dado pessoal (RNF-034), e e por isso
 * que existe `mask` aqui em vez de um `JSON.stringify` no ponto da chamada.
 */

const SENSITIVE_KEY =
  /senha|password|secret|token|authorization|api[-_]?key|cpf|cnpj|documento?|email|e-mail|telefone|phone|cartao|card|cvv/i

/** Deixa as pontas visiveis para conferir, sem revelar o valor. */
function maskValue(value: string): string {
  if (value.length <= 4) return '[oculto]'
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

/**
 * Mascara recursivamente o que a chave denuncia como sensivel.
 *
 * Decide pelo NOME da chave, nao pelo formato do valor: um CPF sem pontuacao e
 * indistinguivel de um numero de pedido, e tentar adivinhar pelo conteudo
 * erraria nos dois sentidos.
 */
export function mask(input: unknown, depth = 0): unknown {
  /* Corta ciclo e estrutura funda — log nao e lugar de despejar objeto inteiro. */
  if (depth > 4) return '[profundo demais]'

  if (input === null || input === undefined) return input
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return input
  }
  if (Array.isArray(input)) return input.map((item) => mask(item, depth + 1))

  if (typeof input === 'object') {
    const saida: Record<string, unknown> = {}
    for (const [chave, valor] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(chave)) {
        saida[chave] = typeof valor === 'string' ? maskValue(valor) : '[oculto]'
      } else {
        saida[chave] = mask(valor, depth + 1)
      }
    }
    return saida
  }

  return '[nao serializavel]'
}

export type ExternalCall<T> = {
  /** Nome do provedor e da operacao: `pagmaxx.criarCobranca`. */
  readonly operation: string
  /** O que foi enviado. Passa por `mask` antes de virar log. */
  readonly request?: unknown
  readonly run: () => Promise<T>
}

/**
 * Executa a chamada medindo duracao e registrando o que importa.
 *
 * Sucesso sai em `debug` com a duracao — util para achar lentidao sem poluir o
 * log normal. Falha sai em `error` com requisicao e resposta mascaradas, que e
 * o que a RNF-059 exige.
 *
 * O erro e relancado: quem chama decide o que fazer. Log nao e tratamento.
 */
export async function withExternalCallLogging<T>(
  log: FastifyBaseLogger,
  call: ExternalCall<T>,
): Promise<T> {
  const inicio = performance.now()

  try {
    const resultado = await call.run()
    log.debug(
      { operation: call.operation, durationMs: Math.round(performance.now() - inicio) },
      'chamada externa concluida',
    )
    return resultado
  } catch (erro) {
    log.error(
      {
        operation: call.operation,
        durationMs: Math.round(performance.now() - inicio),
        request: mask(call.request),
        response: mask(extractResponse(erro)),
      },
      'chamada externa falhou',
    )
    throw erro
  }
}

/**
 * Tira da excecao o que o provedor devolveu.
 *
 * Cada cliente HTTP embrulha a resposta de um jeito; estes tres cobrem os
 * formatos mais comuns. Sem achar nada, devolve a mensagem — melhor que nada,
 * e nunca a stack, que nao ajuda a conversar com o fornecedor.
 */
function extractResponse(erro: unknown): unknown {
  if (typeof erro !== 'object' || erro === null) return String(erro)

  const e = erro as Record<string, unknown>
  return e.response ?? e.body ?? e.data ?? (e.message as string | undefined) ?? '[sem resposta]'
}
