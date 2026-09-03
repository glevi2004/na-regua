import { describe, expect, it } from 'vitest'
import {
  ehPermanente,
  ehUltimaTentativa,
  esperaDaTentativa,
  FalhaPermanente,
  nivelDaFalha,
} from './retry.js'

describe('falha permanente', () => {
  it('reconhece a falha permanente', () => {
    expect(ehPermanente(new FalhaPermanente('payload invalido'))).toBe(true)
  })

  it('erro comum nao e permanente — esse merece nova tentativa', () => {
    expect(ehPermanente(new Error('ECONNRESET'))).toBe(false)
  })

  it('nao confunde qualquer coisa lancada com falha permanente', () => {
    expect(ehPermanente('texto solto')).toBe(false)
    expect(ehPermanente(undefined)).toBe(false)
  })
})

describe('ultima tentativa — RNF-062', () => {
  it.each([
    [1, 5, false],
    [4, 5, false],
    [5, 5, true],
  ])('tentativa %i de %i e ultima? %s', (tentativa, maxTentativas, esperado) => {
    expect(ehUltimaTentativa({ tentativa, maxTentativas })).toBe(esperado)
  })

  /* Defensivo de proposito: se a contagem passar do teto por algum motivo, o
     job esta descartado — tratar como "ainda tem chance" o deixaria invisivel. */
  it('passar do teto tambem conta como ultima', () => {
    expect(ehUltimaTentativa({ tentativa: 6, maxTentativas: 5 })).toBe(true)
  })
})

/**
 * Tentativa intermediaria e `warn`: vai ser retentada, e tratar como erro
 * treina quem opera a ignorar erro. So o descarte exige acao humana.
 */
describe('nivel do log da falha', () => {
  const erro = new Error('ECONNRESET')

  it('tentativa intermediaria e aviso', () => {
    expect(nivelDaFalha({ tentativa: 2, maxTentativas: 5 }, erro)).toBe('warn')
  })

  it('a ultima tentativa e erro', () => {
    expect(nivelDaFalha({ tentativa: 5, maxTentativas: 5 }, erro)).toBe('error')
  })

  /* Falha permanente e descarte imediato: nao havera sexta chance de aparecer. */
  it('falha permanente ja e erro na primeira tentativa', () => {
    expect(nivelDaFalha({ tentativa: 1, maxTentativas: 5 }, new FalhaPermanente('x'))).toBe('error')
  })
})

describe('espera entre tentativas — RNF-011', () => {
  it.each([
    [1, 5_000],
    [2, 10_000],
    [3, 20_000],
    [4, 40_000],
  ])('tentativa %i espera %i ms', (tentativa, esperado) => {
    expect(esperaDaTentativa(tentativa)).toBe(esperado)
  })

  it('a base e configuravel', () => {
    expect(esperaDaTentativa(3, 1_000)).toBe(4_000)
  })

  it('recusa tentativa zero — a contagem comeca em 1', () => {
    expect(() => esperaDaTentativa(0)).toThrow()
  })

  /* Cinco tentativas somam pouco mais de um minuto. Se somassem uma hora, o
     lojista descobriria a nota nao emitida no dia seguinte. */
  it('as cinco tentativas cabem em pouco mais de um minuto', () => {
    const total = [1, 2, 3, 4].reduce((s, t) => s + esperaDaTentativa(t), 0)
    expect(total).toBe(75_000)
  })
})
