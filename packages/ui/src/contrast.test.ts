import { describe, expect, it } from 'vitest'
import { AA_NORMAL_TEXT, contrastRatio, meetsAA } from './contrast.js'

describe('contrastRatio', () => {
  it.each([
    ['#000000', '#ffffff', 21],
    ['#ffffff', '#ffffff', 1],
    ['#000000', '#000000', 1],
  ])('%s sobre %s da %s:1', (a, b, esperado) => {
    expect(contrastRatio(a, b)).toBeCloseTo(esperado, 2)
  })

  it('nao depende da ordem dos argumentos', () => {
    expect(contrastRatio('#1e2a78', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#1e2a78'), 10)
  })

  it('trata a forma curta como a longa', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#ffffff', '#000000'), 10)
  })

  it('recusa cor invalida', () => {
    expect(() => contrastRatio('vermelho', '#fff')).toThrow(RangeError)
    expect(() => contrastRatio('#ff', '#fff')).toThrow(RangeError)
    expect(() => contrastRatio('#gggggg', '#fff')).toThrow(RangeError)
    expect(() => contrastRatio('', '#fff')).toThrow(RangeError)
    /* Sem o `#` tambem e invalido — evita aceitar 'ffffff' por engano. */
    expect(() => contrastRatio('ffffff', '#000')).toThrow(RangeError)
  })
})

describe('meetsAA', () => {
  it('aceita no piso e recusa abaixo dele', () => {
    /* #767c9b sobre branco da 4.10:1 — era o textMuted antigo. */
    expect(meetsAA('#767c9b', '#ffffff')).toBe(false)
    expect(meetsAA('#6a708c', '#ffffff')).toBe(true)
    expect(contrastRatio('#6a708c', '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
})
