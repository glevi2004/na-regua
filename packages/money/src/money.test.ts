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

/**
 * Caminhos que a suite original nao alcancava.
 *
 * Foram descobertos ao ligar o piso de cobertura do NR-010: o pacote estava em
 * 86,95%, abaixo dos 90% que a RNF-068 exige, e o que faltava era justamente
 * o comportamento de recusa — a parte que mais importa num tipo de dinheiro.
 */
describe('Money.fromCents', () => {
  it('aceita bigint e number inteiro', () => {
    expect(Money.fromCents(4990n).cents).toBe(4990n)
    expect(Money.fromCents(4990).cents).toBe(4990n)
  })

  it('recusa numero fracionado — centavo nao tem casa decimal', () => {
    expect(() => Money.fromCents(49.9)).toThrow(RangeError)
  })
})

describe('parse recusa o que nao e valor', () => {
  it.each(['R$', '-', 'abc', '  '])('recusa %s', (entrada) => {
    expect(() => Money.parse(entrada)).toThrow(RangeError)
  })

  it('recusa sinal sobrando no meio dos digitos', () => {
    expect(() => Money.parse('1-2-3')).toThrow(RangeError)
  })

  /*
   * Dois casos que NAO sao recusados, descobertos ao escrever estes testes —
   * ambos supunham o contrario. Ficam registrados porque sao o comportamento
   * real, e porque vale a pergunta se deveriam ser:
   *
   *   - separador sozinho vira zero;
   *   - um hifen perdido no meio e descartado, porque `replace('-', '')` tira
   *     so a primeira ocorrencia. Com dois hifens sobra um e ai sim recusa,
   *     que e o caso do teste acima.
   */
  it('trata separador sozinho como zero', () => {
    expect(Money.parse(',').isZero()).toBe(true)
    expect(Money.parse('.').isZero()).toBe(true)
  })

  it('descarta um hifen perdido no meio dos digitos', () => {
    expect(Money.parse('1-2').toDecimalString()).toBe('12.00')
  })
})

describe('subtracao', () => {
  it('subtrai mantendo centavos exatos', () => {
    expect(Money.parse('49.90').subtract(Money.parse('9.90')).toDecimalString()).toBe('40.00')
  })

  it('aceita resultado negativo — estorno passa do saldo', () => {
    expect(Money.parse('10.00').subtract(Money.parse('25.50')).isNegative()).toBe(true)
  })
})

describe('comparacao', () => {
  it('reconhece zero e negativo', () => {
    expect(Money.zero().isZero()).toBe(true)
    expect(Money.parse('0.01').isZero()).toBe(false)
    expect(Money.parse('-0.01').isNegative()).toBe(true)
    expect(Money.parse('0.01').isNegative()).toBe(false)
  })

  it.each([
    ['10.00', '20.00', -1],
    ['20.00', '10.00', 1],
    ['10.00', '10.00', 0],
  ])('compara %s com %s', (a, b, esperado) => {
    expect(Money.parse(a).compare(Money.parse(b))).toBe(esperado)
  })

  it('equals compara valor e moeda', () => {
    expect(Money.parse('10.00').equals(Money.parse('10.00'))).toBe(true)
    expect(Money.parse('10.00').equals(Money.parse('10.01'))).toBe(false)
  })
})

/*
 * `assertSameCurrency` nao tem teste porque nao ha como chama-lo com moedas
 * diferentes: `Currency` tem um membro so (`'BRL'`), entao o tipo impede
 * construir o caso. O `throw` e defesa para quando houver a segunda moeda —
 * e ai o teste entra junto com ela.
 */
