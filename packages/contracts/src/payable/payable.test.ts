import { describe, expect, it } from 'vitest'
import { createPayableInputSchema, recurrenceInputSchema } from './payable.js'

const valida = {
  supplier: 'Copel',
  description: 'Energia da loja',
  amountCents: 48_000,
  dueDate: '2026-09-10',
}

describe('lancar conta a pagar — RF-055', () => {
  it('aceita a conta minima', () => {
    expect(createPayableInputSchema.parse(valida).amountCents).toBe(48_000)
  })

  it('exige fornecedor', () => {
    const { supplier: _fora, ...sem } = valida
    expect(createPayableInputSchema.safeParse(sem).success).toBe(false)
  })

  it.each(['10/09/2026', '2026-9-10', 'amanha'])('recusa vencimento "%s"', (dueDate) => {
    expect(createPayableInputSchema.safeParse({ ...valida, dueDate }).success).toBe(false)
  })

  it('recusa valor zero — conta de zero nao e conta', () => {
    expect(createPayableInputSchema.safeParse({ ...valida, amountCents: 0 }).success).toBe(false)
  })

  it('recusa campo desconhecido — o schema e strict', () => {
    expect(createPayableInputSchema.safeParse({ ...valida, pago: true }).success).toBe(false)
  })

  it('apara o fornecedor', () => {
    expect(createPayableInputSchema.parse({ ...valida, supplier: '  Copel  ' }).supplier).toBe(
      'Copel',
    )
  })
})

describe('recorrencia — RF-057', () => {
  /* Uma ocorrencia so nao e recorrencia, e um zero digitado por engano geraria
     serie vazia. O piso e dois. */
  it('recusa recorrencia de uma ocorrencia so', () => {
    expect(recurrenceInputSchema.safeParse({ frequency: 'monthly', occurrences: 1 }).success).toBe(
      false,
    )
  })

  it('aceita duas', () => {
    expect(recurrenceInputSchema.parse({ frequency: 'monthly', occurrences: 2 }).occurrences).toBe(
      2,
    )
  })

  /* Dez anos de conta mensal. Acima disso quase sempre e engano de digitacao, e
     gerar mil linhas por engano e mais caro de desfazer que de recusar. */
  it('recusa acima de 120 ocorrencias', () => {
    expect(
      recurrenceInputSchema.safeParse({ frequency: 'monthly', occurrences: 121 }).success,
    ).toBe(false)
  })

  it('recusa frequencia que nao existe', () => {
    expect(recurrenceInputSchema.safeParse({ frequency: 'diaria', occurrences: 5 }).success).toBe(
      false,
    )
  })

  it('a conta pode nascer sem recorrencia', () => {
    expect(createPayableInputSchema.parse(valida).recurrence).toBeUndefined()
  })
})
