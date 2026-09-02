import { Money } from '@na-regua/money'
import { describe, expect, it } from 'vitest'
import { calculateChange } from './calculate-change.js'
import { DomainError } from './domain-error.js'
import type { PaymentInput } from './types/payment-input.js'

const dinheiro = (valor: string): PaymentInput => ({
  method: 'cash',
  amount: Money.parse(valor),
})

const pix = (valor: string): PaymentInput => ({ method: 'pix', amount: Money.parse(valor) })

describe('troco em dinheiro — RF-035', () => {
  it('devolve a diferenca quando o cliente paga a mais', () => {
    const troco = calculateChange(Money.parse('86.90'), [dinheiro('100.00')])

    expect(troco.toDecimalString()).toBe('13.10')
  })

  it('nao ha troco quando o valor e exato', () => {
    expect(calculateChange(Money.parse('86.90'), [dinheiro('86.90')]).isZero()).toBe(true)
  })

  it.each([
    ['0.01', '0.02', '0.01'],
    ['99.99', '100.00', '0.01'],
    ['1.00', '50.00', '49.00'],
  ])('total %s pago com %s da troco de %s', (total, pago, esperado) => {
    expect(calculateChange(Money.parse(total), [dinheiro(pago)]).toDecimalString()).toBe(esperado)
  })
})

/**
 * So `cash` gera troco. Nao existe pagar a mais em Pix e receber a diferenca
 * em especie — tratar assim transformaria erro de digitacao em saida de caixa.
 */
describe('formas sem troco', () => {
  it.each(['pix', 'debit', 'credit', 'wallet'] as const)('%s nao gera troco', (method) => {
    const troco = calculateChange(Money.parse('50.00'), [{ method, amount: Money.parse('100.00') }])

    expect(troco.isZero()).toBe(true)
  })

  it('venda sem pagamento nenhum nao gera troco', () => {
    expect(calculateChange(Money.parse('50.00'), []).isZero()).toBe(true)
  })
})

/**
 * Pagamento misto: o dinheiro cobre o que sobrou depois das outras formas.
 * Medir a sobra sobre a soma total daria troco onde nao ha.
 */
describe('pagamento misto', () => {
  it('troco sai apenas da parte em dinheiro', () => {
    const troco = calculateChange(Money.parse('100.00'), [pix('60.00'), dinheiro('50.00')])

    expect(troco.toDecimalString()).toBe('10.00')
  })

  it('sem troco quando o dinheiro cobre exatamente o restante', () => {
    expect(calculateChange(Money.parse('100.00'), [pix('60.00'), dinheiro('40.00')]).isZero()).toBe(
      true,
    )
  })

  it('soma varias entradas em dinheiro', () => {
    const troco = calculateChange(Money.parse('100.00'), [dinheiro('50.00'), dinheiro('70.00')])

    expect(troco.toDecimalString()).toBe('20.00')
  })
})

describe('recusas', () => {
  it('recusa quando falta dinheiro para fechar', () => {
    try {
      calculateChange(Money.parse('100.00'), [pix('60.00'), dinheiro('10.00')])
      expect.fail('deveria ter recusado')
    } catch (erro) {
      expect((erro as DomainError).code).toBe('PAYMENT_TOTAL_MISMATCH')
    }
  })

  it('recusa quando as formas sem troco ja passam do total', () => {
    expect(() =>
      calculateChange(Money.parse('100.00'), [pix('120.00'), dinheiro('10.00')]),
    ).toThrow(DomainError)
  })

  it('recusa total negativo', () => {
    expect(() => calculateChange(Money.parse('-1.00'), [dinheiro('10.00')])).toThrow(DomainError)
  })
})

/**
 * Propriedade: dinheiro entregue menos troco e sempre o que faltava cobrir.
 * Se isso quebrar, o caixa fecha com diferenca.
 */
describe('propriedade: dinheiro - troco cobre o restante', () => {
  it('vale para 0 a 200 centavos de total contra 0 a 200 de dinheiro', () => {
    for (let total = 0; total <= 200; total += 7) {
      for (let pago = total; pago <= 200; pago += 11) {
        const troco = calculateChange(Money.fromCents(total), [
          { method: 'cash', amount: Money.fromCents(pago) },
        ])
        expect(Money.fromCents(pago).subtract(troco).cents).toBe(BigInt(total))
      }
    }
  })
})
