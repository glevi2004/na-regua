import { describe, expect, it } from 'vitest'
import { calcularDre, type LancamentoDoPeriodo } from './dre.js'
import { DomainError } from './domain-error.js'

const l = (tipo: LancamentoDoPeriodo['tipo'], amountCents: number): LancamentoDoPeriodo => ({
  tipo,
  amountCents,
})

describe('DRE simplificado — RF-085', () => {
  /** Mes tipico: R$ 10.000 de venda, R$ 800 de imposto e tarifa, R$ 6.000 de
      custo, R$ 2.000 de despesa. Sobra R$ 1.200. */
  const mes = [
    l('revenue', 1_000_000),
    l('deduction', 80_000),
    l('cost', 600_000),
    l('expense', 200_000),
  ]

  it('a ordem das subtracoes fecha o resultado', () => {
    const d = calcularDre(mes)

    expect(d.receitaBruta.cents).toBe(1_000_000n)
    expect(d.receitaLiquida.cents).toBe(920_000n)
    expect(d.lucroBruto.cents).toBe(320_000n)
    expect(d.resultado.cents).toBe(120_000n)
  })

  it('soma varios lancamentos do mesmo tipo', () => {
    const d = calcularDre([l('expense', 100_000), l('expense', 50_000), l('revenue', 300_000)])

    expect(d.despesas.cents).toBe(150_000n)
  })

  /* Mes no vermelho e resultado negativo, nao zero: esconder o prejuizo faria
     o relatorio mentir justamente quando ele mais importa. */
  it('mes no vermelho da resultado negativo', () => {
    const d = calcularDre([l('revenue', 100_000), l('cost', 80_000), l('expense', 50_000)])

    expect(d.resultado.cents).toBe(-30_000n)
    expect(d.resultado.isNegative()).toBe(true)
  })

  it('periodo sem movimento nenhum da tudo zero', () => {
    const d = calcularDre([])

    expect(d.receitaBruta.isZero()).toBe(true)
    expect(d.resultado.isZero()).toBe(true)
  })

  it('despesa sem receita e prejuizo do tamanho da despesa', () => {
    const d = calcularDre([l('expense', 200_000)])

    expect(d.resultado.cents).toBe(-200_000n)
  })
})

describe('margem bruta', () => {
  it('sai em PONTOS, como o resto do sistema', () => {
    /* Receita 1.000,00; custo 600,00 → lucro bruto 400,00 → 40 pontos. */
    const d = calcularDre([l('revenue', 100_000), l('cost', 60_000)])

    expect(d.margemBrutaPontos).toBe(40)
  })

  it('arredonda para duas casas — 12,4% e 12,6% sao diferentes na conta do mes', () => {
    const d = calcularDre([l('revenue', 100_000), l('cost', 87_550)])

    expect(d.margemBrutaPontos).toBe(12.45)
  })

  /* Dividir por zero daria Infinity, e "margem: Infinity%" e pior que "—". */
  it('sem receita a margem e nula, nao zero nem Infinity', () => {
    const d = calcularDre([l('expense', 50_000)])

    expect(d.margemBrutaPontos).toBeNull()
  })

  it('margem negativa aparece negativa', () => {
    const d = calcularDre([l('revenue', 100_000), l('cost', 120_000)])

    expect(d.margemBrutaPontos).toBe(-20)
  })

  it('a deducao entra na margem — ela e sobre a receita liquida', () => {
    const semDeducao = calcularDre([l('revenue', 100_000), l('cost', 60_000)])
    const comDeducao = calcularDre([
      l('revenue', 100_000),
      l('deduction', 10_000),
      l('cost', 60_000),
    ])

    expect(semDeducao.margemBrutaPontos).toBe(40)
    expect(comDeducao.margemBrutaPontos).toBe(30)
  })
})

/**
 * O sinal vem do TIPO, nunca do valor. Um negativo aqui viraria uma despesa que
 * aumenta o lucro — e ninguem conferiria, porque o total continuaria fechando.
 */
describe('lancamento invalido', () => {
  it('recusa valor negativo', () => {
    expect(() => calcularDre([l('expense', -100)])).toThrow(DomainError)
  })

  it('recusa centavo fracionado', () => {
    expect(() => calcularDre([l('revenue', 100.5)])).toThrow(DomainError)
  })

  it('aceita zero — lancamento de valor zero existe e nao atrapalha', () => {
    expect(calcularDre([l('revenue', 0)]).receitaBruta.isZero()).toBe(true)
  })
})
