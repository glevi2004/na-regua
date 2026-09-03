import { describe, expect, it } from 'vitest'
import { DomainError } from './domain-error.js'
import {
  diasEntre,
  diasNoMes,
  estaVencida,
  faixaDeVencimento,
  ocorrenciasDaRecorrencia,
} from './due-date.js'

describe('dias no mes', () => {
  it.each([
    [2026, 1, 31],
    [2026, 4, 30],
    [2026, 2, 28],
  ])('%i-%i tem %i dias', (ano, mes, esperado) => {
    expect(diasNoMes(ano, mes)).toBe(esperado)
  })

  it('fevereiro de ano bissexto tem 29', () => {
    expect(diasNoMes(2028, 2)).toBe(29)
  })

  /* 1900 nao foi bissexto e 2000 foi — a regra dos 400 anos. */
  it('respeita a regra dos 400 anos', () => {
    expect(diasNoMes(1900, 2)).toBe(28)
    expect(diasNoMes(2000, 2)).toBe(29)
  })
})

describe('dias entre datas', () => {
  it('conta os dias corridos', () => {
    expect(diasEntre('2026-09-02', '2026-09-12')).toBe(10)
  })

  it('e negativo quando a data ja passou', () => {
    expect(diasEntre('2026-09-02', '2026-08-30')).toBe(-3)
  })

  it('atravessa a virada do mes', () => {
    expect(diasEntre('2026-01-31', '2026-02-01')).toBe(1)
  })

  /* Nao passa por Date local em nenhum ponto: se passasse, o horario de verao
     de algum fuso faria um dos dias ter 23 ou 25 horas e a conta quebraria. */
  it('atravessa a virada do ano', () => {
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('recusa data mal formada', () => {
    expect(() => diasEntre('02/09/2026', '2026-09-03')).toThrow(DomainError)
  })

  it('recusa dia que nao existe no mes', () => {
    expect(() => diasEntre('2026-02-30', '2026-03-01')).toThrow(DomainError)
  })
})

describe('faixa de vencimento — RF-056, RF-061', () => {
  const hoje = '2026-09-02'

  /* Conta que vence hoje NAO esta vencida. Marca-la em vermelho na abertura do
     sistema faria o lojista achar que perdeu um prazo que ele tem o dia
     inteiro para cumprir. */
  it('hoje nao e vencida', () => {
    expect(faixaDeVencimento(hoje, hoje)).toBe('today')
    expect(estaVencida(hoje, hoje)).toBe(false)
  })

  it('ontem esta vencida', () => {
    expect(estaVencida('2026-09-01', hoje)).toBe(true)
  })

  it.each([
    ['2026-09-03', 'week'],
    ['2026-09-09', 'week'],
    ['2026-09-10', 'month'],
    ['2026-10-02', 'month'],
    ['2026-10-03', 'later'],
  ] as const)('%s cai em %s', (vencimento, esperado) => {
    expect(faixaDeVencimento(vencimento, hoje)).toBe(esperado)
  })

  it('as faixas nao se sobrepoem', () => {
    const datas = ['2026-08-01', '2026-09-02', '2026-09-05', '2026-09-20', '2027-01-01']
    const faixas = datas.map((d) => faixaDeVencimento(d, hoje))
    expect(new Set(faixas).size).toBe(faixas.length)
  })
})

/**
 * O nucleo da RF-057, e onde a implementacao ingenua erra.
 *
 * Somar "um mes" a cada passo encaixa 31/jan em 28/fev e segue dali — a conta
 * migra para o dia 28 e nunca mais volta. Derivar sempre do dia ORIGINAL e o
 * que "mantendo o dia de vencimento" quer dizer.
 */
describe('recorrencia mensal — RF-057', () => {
  it('mantem o dia quando ele existe em todos os meses', () => {
    expect(ocorrenciasDaRecorrencia('2026-09-10', 'monthly', 4)).toEqual([
      '2026-09-10',
      '2026-10-10',
      '2026-11-10',
      '2026-12-10',
    ])
  })

  it('dia 31 encaixa no mes curto e VOLTA para 31 no mes seguinte', () => {
    expect(ocorrenciasDaRecorrencia('2026-01-31', 'monthly', 5)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ])
  })

  it('dia 30 em fevereiro bissexto vira 29, nao 28', () => {
    expect(ocorrenciasDaRecorrencia('2028-01-30', 'monthly', 2)).toEqual([
      '2028-01-30',
      '2028-02-29',
    ])
  })

  it('atravessa a virada do ano', () => {
    expect(ocorrenciasDaRecorrencia('2026-11-15', 'monthly', 3)).toEqual([
      '2026-11-15',
      '2026-12-15',
      '2027-01-15',
    ])
  })

  it('uma ocorrencia devolve so o primeiro vencimento', () => {
    expect(ocorrenciasDaRecorrencia('2026-09-10', 'monthly', 1)).toEqual(['2026-09-10'])
  })
})

describe('recorrencia semanal — RF-057', () => {
  it('soma sete dias corridos', () => {
    expect(ocorrenciasDaRecorrencia('2026-09-02', 'weekly', 3)).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
    ])
  })

  it('atravessa a virada do mes', () => {
    expect(ocorrenciasDaRecorrencia('2026-09-28', 'weekly', 2)).toEqual([
      '2026-09-28',
      '2026-10-05',
    ])
  })
})

describe('recorrencia recusada', () => {
  it.each([0, -1, 2.5])('recusa quantidade %s', (q) => {
    expect(() => ocorrenciasDaRecorrencia('2026-09-10', 'monthly', q)).toThrow(DomainError)
  })

  /* Gerar mil linhas por engano de digitacao e mais caro de desfazer que de
     recusar. Dez anos de conta mensal e o teto. */
  it('recusa acima de 120 ocorrencias', () => {
    expect(() => ocorrenciasDaRecorrencia('2026-09-10', 'monthly', 121)).toThrow(DomainError)
    expect(ocorrenciasDaRecorrencia('2026-09-10', 'monthly', 120)).toHaveLength(120)
  })
})
