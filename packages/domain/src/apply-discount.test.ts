import { Money } from '@na-regua/money'
import { describe, expect, it } from 'vitest'
import { applyDiscount } from './apply-discount.js'
import { DomainError } from './domain-error.js'
import type { DiscountPolicy } from './types/discount.js'

const semLimite: DiscountPolicy = { maxDiscountRate: 100 }
const limiteStaff: DiscountPolicy = { maxDiscountRate: 10 }

describe('desconto em valor — RF-030', () => {
  it('abate o valor e devolve o total', () => {
    const r = applyDiscount(
      Money.parse('100.00'),
      { kind: 'amount', amount: Money.parse('15.00') },
      semLimite,
    )

    expect(r.discountAmount.toDecimalString()).toBe('15.00')
    expect(r.total.toDecimalString()).toBe('85.00')
  })

  it('calcula o percentual efetivo, para o teto valer tambem em valor', () => {
    const r = applyDiscount(
      Money.parse('100.00'),
      { kind: 'amount', amount: Money.parse('50.00') },
      semLimite,
    )

    expect(r.effectiveRate).toBe(50)
  })

  it('aceita desconto igual ao total — venda zerada e cortesia, nao erro', () => {
    const r = applyDiscount(
      Money.parse('100.00'),
      { kind: 'amount', amount: Money.parse('100.00') },
      semLimite,
    )

    expect(r.total.isZero()).toBe(true)
    expect(r.effectiveRate).toBe(100)
  })

  it('aceita desconto zero — o caminho de quem nao deu desconto', () => {
    const r = applyDiscount(
      Money.parse('100.00'),
      { kind: 'amount', amount: Money.zero() },
      {
        maxDiscountRate: 0,
      },
    )

    expect(r.total.toDecimalString()).toBe('100.00')
    expect(r.effectiveRate).toBe(0)
  })
})

describe('desconto em percentual — RF-030', () => {
  it.each([
    ['10.00', 10, '9.00'],
    ['100.00', 25, '75.00'],
    ['49.90', 50, '24.95'],
    ['100.00', 0, '100.00'],
    ['100.00', 100, '0.00'],
  ])('%s com %i%% vira %s', (base, rate, esperado) => {
    const r = applyDiscount(Money.parse(base), { kind: 'percentage', rate }, semLimite)

    expect(r.total.toDecimalString()).toBe(esperado)
  })

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])('recusa percentual %s', (rate) => {
    expect(() => applyDiscount(Money.parse('100.00'), { kind: 'percentage', rate }, semLimite)) //
      .toThrow(DomainError)
  })
})

describe('desconto maior que o total e recusado — RF-031', () => {
  it('recusa com o codigo proprio', () => {
    try {
      applyDiscount(
        Money.parse('100.00'),
        { kind: 'amount', amount: Money.parse('100.01') },
        semLimite,
      )
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect(erro).toBeInstanceOf(DomainError)
      expect((erro as DomainError).code).toBe('DISCOUNT_EXCEEDS_TOTAL')
    }
  })

  it('recusa por um centavo — o limite e o total, nao "perto do total"', () => {
    expect(() =>
      applyDiscount(
        Money.parse('0.10'),
        { kind: 'amount', amount: Money.parse('0.11') },
        semLimite,
      ),
    ).toThrow(DomainError)
  })

  it('recusa desconto negativo, que aumentaria o total', () => {
    expect(() =>
      applyDiscount(
        Money.parse('100.00'),
        { kind: 'amount', amount: Money.parse('-10.00') },
        semLimite,
      ),
    ).toThrow(DomainError)
  })
})

/**
 * US-016: "um `staff` com limite de 10% tenta 15% — e bloqueado com o motivo".
 * Bloqueado, nao cortado no teto: cortar em silencio esconde do lojista que o
 * funcionario tentou passar da alcada.
 */
describe('limite do papel — RF-031, RF-008', () => {
  it('bloqueia 15% quando o teto e 10%', () => {
    try {
      applyDiscount(Money.parse('100.00'), { kind: 'percentage', rate: 15 }, limiteStaff)
      expect.fail('deveria ter bloqueado')
    } catch (erro) {
      expect((erro as DomainError).code).toBe('DISCOUNT_ABOVE_ROLE_LIMIT')
      expect((erro as DomainError).message).toContain('10%')
    }
  })

  it('aceita exatamente no teto', () => {
    const r = applyDiscount(Money.parse('100.00'), { kind: 'percentage', rate: 10 }, limiteStaff)

    expect(r.total.toDecimalString()).toBe('90.00')
  })

  it('aplica o teto tambem a desconto em VALOR — R$ 15 em R$ 100 sao 15%', () => {
    expect(() =>
      applyDiscount(
        Money.parse('100.00'),
        { kind: 'amount', amount: Money.parse('15.00') },
        limiteStaff,
      ),
    ).toThrow(DomainError)
  })

  it('teto zero bloqueia qualquer desconto, mas deixa passar o desconto nulo', () => {
    const semAlcada: DiscountPolicy = { maxDiscountRate: 0 }

    expect(() =>
      applyDiscount(Money.parse('100.00'), { kind: 'percentage', rate: 1 }, semAlcada),
    ).toThrow(DomainError)
    expect(
      applyDiscount(
        Money.parse('100.00'),
        { kind: 'percentage', rate: 0 },
        semAlcada,
      ).total.toDecimalString(),
    ).toBe('100.00')
  })

  it.each([-1, Number.NaN])('recusa limite invalido: %s', (maxDiscountRate) => {
    expect(() =>
      applyDiscount(Money.parse('100.00'), { kind: 'percentage', rate: 1 }, { maxDiscountRate }),
    ).toThrow(DomainError)
  })
})

describe('base invalida', () => {
  it('recusa base negativa', () => {
    expect(() =>
      applyDiscount(Money.parse('-10.00'), { kind: 'amount', amount: Money.zero() }, semLimite),
    ).toThrow(DomainError)
  })

  it('base zero nao divide por zero ao calcular o percentual', () => {
    const r = applyDiscount(Money.zero(), { kind: 'amount', amount: Money.zero() }, semLimite)

    expect(r.effectiveRate).toBe(0)
    expect(r.total.isZero()).toBe(true)
  })
})

/**
 * Propriedade: para qualquer base e qualquer percentual dentro do teto, o
 * total somado ao desconto reproduz a base. Se essa igualdade quebrar, sobra
 * ou falta centavo no caixa — que e o motivo de `Money` existir.
 */
describe('propriedade: desconto + total sempre reconstroi a base', () => {
  it('vale para 0 a 200 centavos em todos os percentuais inteiros', () => {
    for (let cents = 0; cents <= 200; cents++) {
      const base = Money.fromCents(cents)
      for (let rate = 0; rate <= 100; rate += 5) {
        const r = applyDiscount(base, { kind: 'percentage', rate }, semLimite)
        expect(r.total.add(r.discountAmount).cents).toBe(base.cents)
      }
    }
  })
})
