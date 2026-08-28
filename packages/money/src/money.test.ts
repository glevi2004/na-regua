import { describe, expect, it } from 'vitest'
import { Money } from './money.js'

describe('Money.parse', () => {
  it.each([
    ['49.90', 4990n],
    ['49,90', 4990n],
    ['R$ 49,90', 4990n],
    ['1.234,56', 123456n],
    ['1,234.56', 123456n],
    ['100', 10000n],
    ['0.01', 1n],
    ['-25,50', -2550n],
    ['129.9', 12990n], // formato que a PagMaxx devolve
  ])('interpreta %s como %s centavos', (input, cents) => {
    expect(Money.parse(input).cents).toBe(cents)
  })

  it('recusa entrada invalida', () => {
    expect(() => Money.parse('abc')).toThrow(RangeError)
    expect(() => Money.parse('')).toThrow(RangeError)
  })
})

describe('aritmetica', () => {
  it('nao sofre erro de ponto flutuante', () => {
    const soma = Money.parse('0.10').add(Money.parse('0.20'))
    expect(soma.equals(Money.parse('0.30'))).toBe(true)
    expect(0.1 + 0.2).not.toBe(0.3) // o motivo de esta classe existir
  })

  it('multiplica por quantidade inteira', () => {
    expect(Money.parse('49.90').multiply(2).toDecimalString()).toBe('99.80')
  })

  it('recusa multiplicacao por fracao', () => {
    expect(() => Money.parse('10.00').multiply(1.5)).toThrow(RangeError)
  })

  it('aplica percentual', () => {
    expect(Money.parse('100.00').percentage(3.49).toDecimalString()).toBe('3.49')
  })

  it('soma lista vazia como zero', () => {
    expect(Money.sum([]).isZero()).toBe(true)
  })
})

describe('allocate — RNF-045', () => {
  it('distribui o resto sem perder centavo', () => {
    const parcelas = Money.parse('100.00').allocate(3)
    expect(parcelas.map((p) => p.toDecimalString())).toEqual(['33.34', '33.33', '33.33'])
    expect(Money.sum(parcelas).equals(Money.parse('100.00'))).toBe(true)
  })

  it('soma sempre bate, para qualquer valor e qualquer numero de parcelas', () => {
    for (let cents = 0; cents <= 200; cents++) {
      for (let parts = 1; parts <= 12; parts++) {
        const total = Money.fromCents(cents)
        expect(Money.sum(total.allocate(parts)).cents).toBe(total.cents)
      }
    }
  })

  it('funciona com valor negativo (estorno)', () => {
    const parcelas = Money.parse('-100.00').allocate(3)
    expect(Money.sum(parcelas).toDecimalString()).toBe('-100.00')
  })

  it('recusa numero de parcelas invalido', () => {
    expect(() => Money.parse('10.00').allocate(0)).toThrow(RangeError)
  })
})

describe('serializacao', () => {
  it('serializa como centavos, nunca como decimal', () => {
    expect(Money.parse('49.90').toJSON()).toEqual({ cents: '4990', currency: 'BRL' })
  })

  it('formata em pt-BR', () => {
    expect(Money.parse('1234.56').format()).toContain('1.234,56')
  })
})
