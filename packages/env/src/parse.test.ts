import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { parseEnv } from './parse.js'

const schema = z.object({
  A: z.string().min(1, 'A e obrigatoria.'),
  B: z.coerce.number().int('B precisa ser inteiro.'),
})

describe('parseEnv', () => {
  it('devolve o valor validado quando tudo passa', () => {
    expect(parseEnv(schema, { A: 'x', B: '3' }, 'teste')).toEqual({ A: 'x', B: 3 })
  })

  it('nomeia o app na mensagem de erro', () => {
    expect(() => parseEnv(schema, {}, 'meu-app')).toThrow(/meu-app/)
  })

  it('usa a mensagem customizada de cada campo, com o caminho na frente', () => {
    expect.assertions(1)
    try {
      parseEnv(schema, { A: '', B: '3' }, 'teste')
    } catch (error) {
      expect((error as Error).message).toContain('A: A e obrigatoria.')
    }
  })

  it('acumula problemas de mais de um campo na mesma mensagem', () => {
    expect.assertions(2)
    try {
      parseEnv(schema, { A: '', B: '3.5' }, 'teste')
    } catch (error) {
      const msg = (error as Error).message
      expect(msg).toContain('A:')
      expect(msg).toContain('B:')
    }
  })
})
