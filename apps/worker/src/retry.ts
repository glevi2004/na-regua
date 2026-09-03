/**
 * Politica de reprocessamento — RF-130, RNF-011, RNF-062.
 *
 * A decisao que este arquivo existe para tornar explicita: **nem toda falha
 * merece nova tentativa.**
 *
 * O BullMQ retenta quando o processador LANCA. Isso torna `throw` uma decisao
 * de negocio disfarcada de tratamento de erro: lancar em uma nota rejeitada
 * pela SEFAZ faria o sistema reenviar cinco vezes o mesmo XML invalido, com
 * espera crescente, para receber cinco vezes a mesma recusa — e so entao
 * desistir, quarenta segundos depois, tendo escondido do lojista por todo esse
 * tempo que a nota nao saiu.
 *
 * Dai a separacao em dois tipos:
 *
 * - **Resultado** (`authorized`, `rejected`, `contingency`, `sent`) — o
 *   provedor respondeu. O job TERMINOU, mesmo quando a resposta e "nao".
 *   Retentar nao mudaria nada, porque nada mudou.
 * - **Falha** — o provedor nao respondeu, ou respondeu algo ilegivel: rede,
 *   token, certificado vencido. Ai retentar faz sentido, porque a proxima
 *   tentativa encontra um mundo possivelmente diferente.
 *
 * As portas ja foram desenhadas assim: `InvoiceIssuer.issue` "nao lanca em
 * rejeicao nem em contingencia" e lanca "somente em falha de infraestrutura".
 * Este arquivo e a outra ponta dessa decisao.
 */

/** Erro que NAO deve ser retentado, mesmo tendo sido lancado. */
export class FalhaPermanente extends Error {
  readonly permanente = true

  constructor(message: string) {
    super(message)
    this.name = 'FalhaPermanente'
  }
}

export function ehPermanente(erro: unknown): boolean {
  return erro instanceof FalhaPermanente
}

export type TentativaInfo = {
  /** Quantas tentativas ja foram feitas, incluindo a atual. */
  readonly tentativa: number
  readonly maxTentativas: number
}

/**
 * Esta e a ultima chance? — RNF-062.
 *
 * Importa porque o descarte precisa ficar **visivel**: a ultima falha nao e
 * mais uma na sequencia, e o momento em que o job para de tentar e alguem
 * precisa saber. Sem distinguir, a linha de log da quinta tentativa e igual a
 * da primeira, e o descarte acontece em silencio.
 */
export function ehUltimaTentativa({ tentativa, maxTentativas }: TentativaInfo): boolean {
  return tentativa >= maxTentativas
}

/**
 * O nivel de log de uma falha de job.
 *
 * Tentativa intermediaria e `warn`: vai ser retentada, e tratar como erro
 * treina quem opera a ignorar erro. So o descarte e `error` — e o unico que
 * exige acao humana.
 */
export function nivelDaFalha(info: TentativaInfo, erro: unknown): 'warn' | 'error' {
  return ehPermanente(erro) || ehUltimaTentativa(info) ? 'error' : 'warn'
}

/**
 * Espera antes da proxima tentativa, em milissegundos — RNF-011.
 *
 * Exponencial a partir de `base`: 5s, 10s, 20s, 40s. Calculada aqui, e nao so
 * declarada no BullMQ, para que exista um lugar onde a politica possa ser lida
 * e testada — a configuracao do BullMQ diz `exponential` e nao diz o que isso
 * significa nesta casa.
 */
export function esperaDaTentativa(tentativa: number, baseMs = 5_000): number {
  if (tentativa < 1) throw new Error('A tentativa comeca em 1.')
  return baseMs * 2 ** (tentativa - 1)
}
