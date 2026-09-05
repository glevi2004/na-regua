import { describe, expect, it } from 'vitest'
import { ultimosMeses } from './periodo'

/**
 * O periodo dos relatorios — NR-077, US-041.
 *
 * Aritmetica de mes tem um jeito conhecido de dar errado neste projeto: recuar
 * um mes a partir do dia 31 cai no mes errado, e converter para ISO em fuso
 * negativo recua um dia. As duas ja custaram correcao. Este arquivo existe para
 * que a terceira vez nao chegue ao lojista.
 *
 * `new Date(ano, mes, dia)` usa campos LOCAIS, entao os casos abaixo dao o
 * mesmo resultado em qualquer fuso.
 */

describe('ultimosMeses', () => {
  it('doze meses terminam no fim do mes de hoje', () => {
    /* 5 de setembro de 2026. */
    expect(ultimosMeses(12, new Date(2026, 8, 5))).toEqual({
      de: '2025-10-01',
      ate: '2026-09-30',
    })
  })

  it('atravessa a virada do ano', () => {
    /* 15 de janeiro de 2026, seis meses: comeca em agosto do ano anterior. */
    expect(ultimosMeses(6, new Date(2026, 0, 15))).toEqual({
      de: '2025-08-01',
      ate: '2026-01-31',
    })
  })

  it('recua a partir do dia 31 sem pular fevereiro', () => {
    /*
     * O caso que quebra a versao ingenua: em 31 de marco, `setMonth(mes - 1)`
     * sobre o dia 31 daria 3 de marco, porque fevereiro nao tem 31. Voltar o
     * mes a partir do dia 1 e o que evita isso.
     */
    expect(ultimosMeses(2, new Date(2026, 2, 31))).toEqual({
      de: '2026-02-01',
      ate: '2026-03-31',
    })
  })

  it('fecha fevereiro bissexto no dia 29', () => {
    expect(ultimosMeses(1, new Date(2028, 1, 10))).toEqual({
      de: '2028-02-01',
      ate: '2028-02-29',
    })
  })

  it('um mes so devolve o mes corrente inteiro', () => {
    expect(ultimosMeses(1, new Date(2026, 6, 14))).toEqual({
      de: '2026-07-01',
      ate: '2026-07-31',
    })
  })
})
