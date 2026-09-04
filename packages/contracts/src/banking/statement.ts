import { z } from 'zod'
import {
  bankTransactionDirectionSchema,
  type BankTransactionDirection,
} from '../reconciliation/reconciliation.js'
import { dateSchema, moneyCentsSchema } from '../common/primitives.js'

/** Importacao de extrato — RF-076, RF-077. */

/** Formatos que a importacao por arquivo aceita. */
export const statementFormatSchema = z.enum(['ofx', 'csv'])

export type StatementFormat = z.infer<typeof statementFormatSchema>

/**
 * Uma transacao lida do arquivo, antes de virar linha no banco.
 *
 * `externalId` e o que impede a mesma transacao de entrar duas vezes quando o
 * lojista sobe o mesmo extrato de novo — e ele acontece, porque a forma normal
 * de conferir se a importacao funcionou e importar outra vez.
 */
export const parsedBankTransactionSchema = z.object({
  externalId: z.string().min(1),
  direction: bankTransactionDirectionSchema,
  amountCents: moneyCentsSchema,
  postedOn: dateSchema,
  description: z.string(),
  counterparty: z.string().nullable(),
})

export type ParsedBankTransaction = z.infer<typeof parsedBankTransactionSchema>

/**
 * Por que um arquivo foi recusado.
 *
 * Codigo separado da mensagem porque quem escolhe o que a tela faz e a tela: um
 * arquivo do formato errado pede "escolha outro arquivo"; uma linha invalida
 * pede "confira a linha 42". A mensagem muda com a redacao, o codigo nao.
 */
export const statementRejectionCodeSchema = z.enum([
  /** Nao parece OFX nem CSV — provavelmente PDF ou planilha. */
  'FORMATO_DESCONHECIDO',
  /** E OFX/CSV, mas a estrutura esperada nao esta la. */
  'ESTRUTURA_INVALIDA',
  /** Uma transacao especifica nao pode ser lida. */
  'TRANSACAO_INVALIDA',
  /** Leu o arquivo inteiro e nao havia transacao nenhuma. */
  'SEM_TRANSACOES',
])

export type StatementRejectionCode = z.infer<typeof statementRejectionCodeSchema>

/**
 * O resultado da leitura, como UNIAO — e nao excecao.
 *
 * Os dois membros sao `.strict()`. Uniao discriminada por si NAO reclama de
 * chave desconhecida, e sem o `strict` um leitor que devolvesse
 * `{outcome: 'parsed', ..., code: 'SEM_TRANSACOES'}` passaria — meio um
 * desfecho, meio o outro, e o `code` seria ignorado em silencio.
 *
 * A RF-077 exige recusar arquivo invalido **sem importacao parcial**, e a uniao
 * e o que torna isso estrutural: `parse` devolve tudo ou uma recusa, entao nao
 * existe caminho em que metade das transacoes ja foi gravada quando o problema
 * aparece. Com excecao no meio da leitura, essa garantia dependeria de quem
 * chama lembrar de envolver tudo numa transacao.
 */
export const statementParseResultSchema = z.discriminatedUnion('outcome', [
  z
    .object({
      outcome: z.literal('parsed'),
      format: statementFormatSchema,
      transactions: z.array(parsedBankTransactionSchema).min(1),
      /** Conta e agencia, quando o formato informa. So para o lojista conferir. */
      account: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      outcome: z.literal('rejected'),
      code: statementRejectionCodeSchema,
      /** Vai para a tela: diz o que houve e o que fazer — RNF-054. */
      message: z.string(),
      /** Linha do arquivo, quando o problema tem uma. Base 1, como o editor. */
      line: z.number().int().positive().nullable(),
    })
    .strict(),
])

export type StatementParseResult = z.infer<typeof statementParseResultSchema>

/** O que a importacao devolve ao lojista — RF-076. */
export const importStatementResultSchema = z.object({
  /** Quantas entraram. */
  imported: z.number().int().nonnegative(),
  /**
   * Quantas foram ignoradas por ja existirem.
   *
   * Numero separado, e nao um total so, porque "45 transacoes importadas" e
   * "0 importadas, 45 ja existiam" contam historias opostas e a segunda e a
   * resposta certa para quem importou duas vezes. Sem a distincao, o lojista
   * veria "0 importadas" e concluiria que o arquivo nao serviu.
   */
  ignored: z.number().int().nonnegative(),
  format: statementFormatSchema,
  account: z.string().nullable(),
})

export type ImportStatementResult = z.infer<typeof importStatementResultSchema>

export type { BankTransactionDirection }

/**
 * O extrato chegando pela api — NR-076.
 *
 * Base64, e nao o texto do arquivo. OFX de banco brasileiro costuma vir em
 * latin-1: transportar como string obrigaria alguem a escolher uma decodificacao
 * antes do parser, e "Manutencao" viraria "Manuten��o" sem erro nenhum — o
 * arquivo importaria, com o nome do fornecedor corrompido. Base64 preserva os
 * bytes e deixa a decisao com `decodificar`, que e de quem ela e.
 *
 * Sem multipart pelo mesmo motivo de nao haver upload em nenhuma outra rota: um
 * extrato mensal tem dezenas de KB, e a dependencia a mais nao se paga.
 */
export const importStatementInputSchema = z
  .object({
    filename: z.string().trim().min(1, 'Informe o nome do arquivo.').max(255),
    contentBase64: z
      .string()
      .min(1, 'Arquivo vazio.')
      /* Base64 invalido nao lanca no `Buffer.from`: ele descarta o que nao
         reconhece e devolve bytes truncados. Sem esta checagem, um envio
         corrompido viraria "arquivo em formato desconhecido" e mandaria o
         lojista procurar problema no extrato. */
      .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Conteudo do arquivo corrompido no envio.'),
  })
  .strict()

export type ImportStatementInput = z.infer<typeof importStatementInputSchema>
