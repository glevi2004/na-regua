import { describe, expect, it } from 'vitest'
import { dateSchema } from './primitives.js'

/**
 * Data de calendario — o formato nao basta.
 *
 * `2026-13-40` casava com a expressao regular e nao existe. `new Date` sobre ela
 * da `Invalid Date`, e toda comparacao com `Invalid Date` e falsa: a agenda do
 * dia respondia 200 com lista VAZIA em vez de recusar. Resposta errada com cara
 * de certa.
 */
describe('data de calendario', () => {
  it.each(['2026-09-10', '2026-02-28', '2028-02-29', '2000-02-29', '2026-12-31'])(
    'aceita %s',
    (d) => {
      expect(dateSchema.safeParse(d).success).toBe(true)
    },
  )

  it.each([
    ['2026-13-40', 'mes 13 e dia 40'],
    ['2026-13-01', 'mes 13'],
    ['2026-00-10', 'mes zero'],
    ['2026-09-31', 'setembro nao tem 31'],
    ['2026-02-30', 'fevereiro nao tem 30'],
    ['2026-02-29', 'fevereiro de ano comum nao tem 29'],
    ['1900-02-29', '1900 nao foi bissexto — a regra dos 400 anos'],
    ['2026-09-00', 'dia zero'],
  ])('recusa %s (%s)', (d) => {
    expect(dateSchema.safeParse(d).success).toBe(false)
  })

  it.each(['10/09/2026', '2026-9-10', '2026-09', 'amanha', ''])('recusa formato "%s"', (d) => {
    expect(dateSchema.safeParse(d).success).toBe(false)
  })
})
