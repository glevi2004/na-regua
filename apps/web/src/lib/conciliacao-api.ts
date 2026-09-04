import { pedir, type Resultado } from './http'

/**
 * Conciliacao bancaria contra a api — NR-076, RF-076 a RF-080.
 *
 * Tudo passa pelo BFF em `/api/...`: o token da sessao fica num cookie
 * `httpOnly` e o navegador nunca fala com a api direto.
 */

export type DirecaoBancaria = 'debit' | 'credit'
export type TipoDeLancamento = 'payable' | 'receivable'

export type LancamentoConciliado = {
  kind: TipoDeLancamento
  id: string
  counterparty: string
  description: string
  dueDate: string
}

export type TransacaoBancaria = {
  id: string
  externalId: string
  direction: DirecaoBancaria
  /** Sempre positivo. Quem diz o sinal e `direction`. */
  amountCents: number
  postedOn: string
  description: string
  counterparty: string | null
  reconciledEntryKind: TipoDeLancamento | null
  reconciledEntryId: string | null
  /** Nulo na fila; preenchido no recorte das conciliadas. */
  reconciledWith: LancamentoConciliado | null
}

export type FilaDeConciliacao = {
  transactions: TransacaoBancaria[]
  /** Quantas faltam conferir, mesmo olhando as conciliadas. */
  pendingCount: number
}

export type Sugestao = {
  entry: {
    entryKind: TipoDeLancamento
    id: string
    counterparty: string
    description: string
    amountCents: number
    netAmountCents: number | null
    dueDate: string
    reconciled: boolean
    status: string
  }
  daysApart: number
  confidencePoints: number
  /** O que se esperava ver no extrato: liquido quando ha taxa. */
  expectedAmountCents: number
}

export type ResultadoDaImportacao = {
  imported: number
  ignored: number
  format: 'ofx' | 'csv'
  account: string | null
}

export type RecorteDaFila = 'pending' | 'reconciled'

/** A fila — NR-076. */
export const carregarFila = (scope: RecorteDaFila): Promise<Resultado<FilaDeConciliacao>> =>
  pedir<FilaDeConciliacao>(`/api/conciliacao/transacoes?scope=${scope}`)

/** Sugestoes de uma transacao — RF-078. Lista vazia e resposta legitima. */
export const carregarSugestoes = (
  transacaoId: string,
): Promise<Resultado<{ suggestions: Sugestao[] }>> =>
  pedir(`/api/conciliacao/transacoes/${transacaoId}/sugestoes`)

/** Casar com um lancamento existente — RF-079. */
export const conciliar = (
  transacaoId: string,
  entrada: { entryKind: TipoDeLancamento; entryId: string },
): Promise<Resultado<{ reconciled: true }>> =>
  pedir(`/api/conciliacao/transacoes/${transacaoId}/conciliar`, {
    method: 'POST',
    body: JSON.stringify(entrada),
  })

/**
 * Criar o lancamento a partir da transacao — RF-079.
 *
 * Valor e data NAO entram: sao o extrato. O que o lojista informa e o que o
 * banco nao sabe — quem esta do outro lado e para que serviu.
 */
export const criarLancamentoDaTransacao = (
  transacaoId: string,
  entrada: { counterparty: string; description: string },
): Promise<Resultado<{ entryKind: TipoDeLancamento; entryId: string }>> =>
  pedir(`/api/conciliacao/transacoes/${transacaoId}/lancamento`, {
    method: 'POST',
    body: JSON.stringify(entrada),
  })

/** Desfazer — RF-080. O motivo e obrigatorio. */
export const desfazerConciliacao = (
  transacaoId: string,
  reason: string,
): Promise<Resultado<{ undone: true }>> =>
  pedir(`/api/conciliacao/transacoes/${transacaoId}/desfazer`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

/**
 * Importar o extrato — RF-076, RF-077.
 *
 * O arquivo vai em base64, e nao como texto. OFX de banco brasileiro costuma
 * vir em latin-1: `FileReader.readAsText` assumiria UTF-8 e "Manutencao"
 * chegaria corrompido no cadastro do fornecedor, sem erro nenhum. Ler os BYTES
 * e deixar a decodificacao com quem sabe qual e.
 */
export async function importarExtrato(arquivo: File): Promise<Resultado<ResultadoDaImportacao>> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())

  /*
   * Em pedacos: `String.fromCharCode(...bytes)` de uma vez estoura a pilha em
   * arquivo grande ("Maximum call stack size exceeded"), e o extrato grande e
   * exatamente o que o lojista sobe no fim do ano.
   */
  let binario = ''
  const PEDACO = 0x8000
  for (let i = 0; i < bytes.length; i += PEDACO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + PEDACO))
  }

  return pedir<ResultadoDaImportacao>('/api/extratos', {
    method: 'POST',
    body: JSON.stringify({ filename: arquivo.name, contentBase64: btoa(binario) }),
  })
}
