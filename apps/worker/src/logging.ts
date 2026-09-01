/**
 * Log estruturado do worker — NR-030.
 *
 * O worker nao tem requisicao HTTP, entao o que correlaciona aqui e o job:
 * fila, id e tentativa. Sem isso, uma falha que so acontece na terceira
 * tentativa e indistinguivel de tres falhas diferentes.
 */

export type Level = 'debug' | 'info' | 'warn' | 'error'

/**
 * URL de conexao NUNCA vai inteira para o log.
 *
 * `REDIS_URL` e `DATABASE_URL` sao marcadas como segredo em ambientes.md e
 * carregam usuario e senha no proprio texto (`redis://user:senha@host`).
 * Logar "conectado a redis://..." publica a credencial em qualquer lugar que
 * agregue log — RNF-022.
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}:${u.port || '(padrao)'}`
  } catch {
    /* Nao parseou: melhor omitir do que arriscar imprimir credencial. */
    return '[url invalida]'
  }
}

export function log(level: Level, msg: string, extra: Record<string, unknown> = {}): void {
  const linha = JSON.stringify({
    level,
    service: 'worker',
    time: new Date().toISOString(),
    msg,
    ...extra,
  })

  if (level === 'error') {
    console.error(linha)
    return
  }
  console.log(linha)
}
