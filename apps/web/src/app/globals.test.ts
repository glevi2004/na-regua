import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brand, dark, light, radius, spacing } from '@na-regua/ui'

/**
 * Guarda contra deriva entre `globals.css` e `@na-regua/ui`.
 *
 * O Next precisa das cores como variaveis CSS, e o React Native nao le CSS —
 * entao o valor aparece nos dois lugares. Gerar o CSS a partir dos tokens em
 * tempo de build resolveria, mas custa uma etapa de build para um arquivo que
 * muda de mes em mes. Este teste compra a mesma garantia mais barato: se
 * alguem trocar uma cor so de um lado, a CI reprova.
 */

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8')

/** Le uma custom property do bloco `:root`. */
function cssVar(nome: string): string | undefined {
  const achado = css.match(new RegExp(`^\\s*--${nome}:\\s*([^;]+);`, 'm'))
  return achado?.[1].trim()
}

const cores: ReadonlyArray<readonly [string, string]> = [
  ['brand-primary', brand.primary],
  ['brand-primary-dark', brand.primaryDark],
  ['brand-primary-soft', brand.primarySoft],
  ['brand-accent', brand.accent],
  ['brand-accent-dark', brand.accentDark],
  ['brand-accent-soft', brand.accentSoft],
  ['brand-highlight', brand.highlight],
  ['brand-highlight-soft', brand.highlightSoft],

  ['bg', light.bg],
  ['bg-muted', light.bgMuted],
  ['surface', light.surface],
  ['border', light.border],
  ['border-strong', light.borderStrong],
  ['text', light.text],
  ['text-secondary', light.textSecondary],
  ['text-muted', light.textMuted],

  ['danger', light.feedback.danger],
  ['danger-text', light.feedback.dangerText],
  ['danger-bg', light.feedback.dangerBg],
  ['warning', light.feedback.warning],
  ['warning-text', light.feedback.warningText],
  ['success', light.feedback.success],
  ['success-text', light.feedback.successText],

  ['dark-bg', dark.bg],
  ['dark-surface', dark.surface],
  ['dark-surface-raised', dark.surfaceRaised],
  ['dark-border', dark.border],
  ['dark-text', dark.text],
  ['dark-text-muted', dark.textMuted],
]

describe('globals.css nao deriva dos tokens compartilhados', () => {
  it.each(cores)('--%s', (nome, esperado) => {
    expect(cssVar(nome)).toBe(esperado)
  })

  it.each([
    ['radius-sm', radius.sm],
    ['radius', radius.md],
    ['radius-lg', radius.lg],
    ['radius-full', radius.pill],
  ])('--%s vale %ipx', (nome, esperado) => {
    expect(cssVar(nome)).toBe(`${esperado}px`)
  })
})

describe('o leitor de variaveis', () => {
  it('devolve undefined para uma propriedade que nao existe', () => {
    expect(cssVar('nao-existe-mesmo')).toBeUndefined()
  })

  /* Se o seletor :root sumir, o teste acima passaria por engano ao achar tudo
     undefined — esta assercao garante que estamos lendo o arquivo certo. */
  it('encontrou o bloco :root', () => {
    expect(css).toContain(':root {')
    expect(spacing.lg).toBe(16)
  })
})
