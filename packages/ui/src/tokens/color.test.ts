import { describe, expect, it } from 'vitest'
import { AA_NORMAL_TEXT, contrastRatio } from '../contrast.js'
import { brand, dark, light } from './color.js'

/**
 * RNF-055 executavel.
 *
 * Cada par aqui e uma combinacao que aparece de verdade nas telas. O teste
 * existe para que trocar um token — o que vai acontecer quando a DEC-001
 * fechar — nao consiga degradar o contraste em silencio.
 */

const paresClaro: ReadonlyArray<readonly [string, string, string]> = [
  ['texto sobre fundo', light.text, light.bg],
  ['texto secundario sobre fundo', light.textSecondary, light.bg],
  ['texto de apoio sobre fundo', light.textMuted, light.bg],
  ['texto de apoio sobre fundo suave', light.textMuted, light.bgMuted],
  ['texto sobre a cor primaria', light.textOnBrand, brand.primary],
  ['erro sobre fundo de erro', light.feedback.dangerText, light.feedback.dangerBg],
  ['alerta sobre fundo de alerta', light.feedback.warningText, light.feedback.warningBg],
  ['sucesso sobre fundo de sucesso', light.feedback.successText, light.feedback.successBg],
]

const paresEscuro: ReadonlyArray<readonly [string, string, string]> = [
  ['texto sobre fundo', dark.text, dark.bg],
  ['texto de apoio sobre fundo', dark.textMuted, dark.bg],
  ['texto de apoio sobre superficie', dark.textMuted, dark.surface],
  ['texto de apoio sobre superficie alta', dark.textMuted, dark.surfaceRaised],
  ['texto sobre o accent', dark.textOnAccent, brand.accent],
  ['erro sobre fundo', dark.feedback.danger, dark.bg],
  ['alerta sobre superficie', dark.feedback.warning, dark.surface],
  ['sucesso sobre superficie', dark.feedback.success, dark.surface],
]

describe('tema claro atende ao WCAG AA', () => {
  it.each(paresClaro)('%s', (_nome, frente, fundo) => {
    expect(contrastRatio(frente, fundo)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
})

describe('tema escuro atende ao WCAG AA', () => {
  it.each(paresEscuro)('%s', (_nome, frente, fundo) => {
    expect(contrastRatio(frente, fundo)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
})

describe('a paleta da marca nao se confunde com feedback', () => {
  it('nenhuma cor de feedback repete uma cor institucional', () => {
    const institucionais = new Set<string>(Object.values(brand))
    const feedbackClaro = Object.values(light.feedback)

    for (const cor of feedbackClaro) {
      expect(institucionais.has(cor)).toBe(false)
    }
  })
})
