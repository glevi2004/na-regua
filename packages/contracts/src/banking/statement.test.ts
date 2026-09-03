import { describe, expect, it } from 'vitest'
import {
  importStatementResultSchema,
  parsedBankTransactionSchema,
  statementFormatSchema,
  statementParseResultSchema,
  statementRejectionCodeSchema,
} from './statement.js'

describe('formato de extrato — RF-076', () => {
  it.each(['ofx', 'csv'])('aceita %s', (f) => {
    expect(statementFormatSchema.parse(f)).toBe(f)
  })

  /* PDF nao esta aqui de proposito: nao da para importar, e o leitor recusa
     com uma mensagem que diz onde achar o OFX. */
  it.each(['pdf', 'xls', 'qif', ''])('recusa %s', (f) => {
    expect(statementFormatSchema.safeParse(f).success).toBe(false)
  })
})

describe('transacao lida do arquivo', () => {
  const valida = {
    externalId: '2026091000001',
    direction: 'debit' as const,
    amountCents: 48_000,
    postedOn: '2026-09-10',
    description: 'PAGTO ELETRON COPEL',
    counterparty: null,
  }

  it('aceita a transacao minima', () => {
    expect(parsedBankTransactionSchema.parse(valida).amountCents).toBe(48_000)
  })

  /*
   * Sem identificador nao ha deduplicacao, e sem deduplicacao a segunda
   * importacao do mesmo arquivo duplica tudo. O leitor de CSV sintetiza um
   * quando o banco nao manda — mas vazio nunca serve.
   */
  it('recusa identificador vazio', () => {
    expect(parsedBankTransactionSchema.safeParse({ ...valida, externalId: '' }).success).toBe(false)
  })

  /* Quem diz o sinal e `direction`. Negativo aqui significaria que alguem
     inverteu a convencao no meio do caminho. */
  it('recusa valor negativo', () => {
    expect(parsedBankTransactionSchema.safeParse({ ...valida, amountCents: -100 }).success).toBe(
      false,
    )
  })

  it.each(['10/09/2026', '20260910', '2026-09-10T00:00:00Z'])('recusa data "%s"', (postedOn) => {
    expect(parsedBankTransactionSchema.safeParse({ ...valida, postedOn }).success).toBe(false)
  })

  it('aceita contraparte quando o arquivo informa', () => {
    expect(
      parsedBankTransactionSchema.parse({ ...valida, counterparty: 'COPEL DISTRIBUICAO' })
        .counterparty,
    ).toBe('COPEL DISTRIBUICAO')
  })
})

describe('resultado da leitura como uniao — RF-077', () => {
  const transacao = {
    externalId: 'a',
    direction: 'credit' as const,
    amountCents: 1,
    postedOn: '2026-09-10',
    description: 'x',
    counterparty: null,
  }

  it('aceita a leitura bem-sucedida', () => {
    const r = statementParseResultSchema.parse({
      outcome: 'parsed',
      format: 'ofx',
      transactions: [transacao],
      account: '341/12345-6',
    })
    expect(r.outcome).toBe('parsed')
  })

  /*
   * Leitura que deu certo com zero transacoes nao existe: ou o periodo nao tem
   * movimento — e isso e uma RECUSA com codigo proprio, para o lojista conferir
   * as datas — ou o arquivo esta truncado. "Importou 0 com sucesso" nao diz
   * qual dos dois foi.
   */
  it('recusa leitura bem-sucedida com zero transacoes', () => {
    expect(
      statementParseResultSchema.safeParse({
        outcome: 'parsed',
        format: 'ofx',
        transactions: [],
        account: null,
      }).success,
    ).toBe(false)
  })

  it('aceita a recusa com linha', () => {
    const r = statementParseResultSchema.parse({
      outcome: 'rejected',
      code: 'TRANSACAO_INVALIDA',
      message: 'A data da linha 42 nao foi reconhecida. Nada foi importado.',
      line: 42,
    })
    expect(r.outcome).toBe('rejected')
  })

  it('aceita a recusa sem linha, para problema do arquivo inteiro', () => {
    expect(
      statementParseResultSchema.safeParse({
        outcome: 'rejected',
        code: 'FORMATO_DESCONHECIDO',
        message: 'Este arquivo e um PDF.',
        line: null,
      }).success,
    ).toBe(true)
  })

  it('recusa linha zero — a contagem e base 1, como no editor', () => {
    expect(
      statementParseResultSchema.safeParse({
        outcome: 'rejected',
        code: 'TRANSACAO_INVALIDA',
        message: 'x',
        line: 0,
      }).success,
    ).toBe(false)
  })

  /* A uniao e discriminada: nao existe resultado que seja meio um, meio outro. */
  it('recusa resultado sem desfecho', () => {
    expect(statementParseResultSchema.safeParse({ format: 'ofx', transactions: [] }).success).toBe(
      false,
    )
  })

  it('recusa misturar campo dos dois desfechos', () => {
    expect(
      statementParseResultSchema.safeParse({
        outcome: 'parsed',
        format: 'ofx',
        transactions: [transacao],
        account: null,
        code: 'SEM_TRANSACOES',
      }).success,
    ).toBe(false)
  })

  it.each(['FORMATO_DESCONHECIDO', 'ESTRUTURA_INVALIDA', 'TRANSACAO_INVALIDA', 'SEM_TRANSACOES'])(
    'conhece o motivo %s',
    (c) => {
      expect(statementRejectionCodeSchema.parse(c)).toBe(c)
    },
  )
})

describe('resultado da importacao — RF-076', () => {
  /*
   * Dois numeros e nao um total: "0 importadas" faria o lojista concluir que o
   * arquivo nao serviu; "0 importadas, 45 ja existiam" responde a pergunta que
   * ele tinha ao importar de novo.
   */
  it('separa o que entrou do que ja existia', () => {
    const r = importStatementResultSchema.parse({
      imported: 0,
      ignored: 45,
      format: 'ofx',
      account: '341/12345-6',
    })
    expect([r.imported, r.ignored]).toEqual([0, 45])
  })

  it('aceita conta nula, porque CSV nao informa', () => {
    expect(
      importStatementResultSchema.parse({ imported: 2, ignored: 0, format: 'csv', account: null })
        .account,
    ).toBeNull()
  })

  it.each([
    ['importadas negativas', { imported: -1, ignored: 0, format: 'ofx', account: null }],
    ['ignoradas fracionarias', { imported: 0, ignored: 1.5, format: 'ofx', account: null }],
  ])('recusa %s', (_motivo, entrada) => {
    expect(importStatementResultSchema.safeParse(entrada).success).toBe(false)
  })
})
