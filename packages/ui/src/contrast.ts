/**
 * Razao de contraste da WCAG 2.1.
 *
 * Existe aqui, e nao num teste, porque a RNF-055 e um requisito do produto e
 * nao uma checagem pontual: qualquer par de cores novo passa por esta funcao
 * antes de virar token. Sem isto o "contraste >= 4.5:1" vira intencao.
 */

/** Componentes RGB em 0–255. */
type Rgb = readonly [number, number, number]

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function toRgb(hex: string): Rgb {
  if (!HEX.test(hex)) {
    throw new RangeError(`cor invalida: ${hex} — esperado #rgb ou #rrggbb`)
  }

  const raw = hex.slice(1)
  /* #abc e a forma curta de #aabbcc. */
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ] as const
}

/**
 * Luminancia relativa — a formula da WCAG, que nao e a media dos canais: o
 * olho enxerga verde muito mais que azul, e os pesos refletem isso.
 */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as unknown as Rgb

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Razao entre duas cores, de 1 (identicas) a 21 (preto sobre branco).
 *
 * A ordem dos argumentos nao importa — a formula normaliza qual e a mais
 * clara, entao `contrastRatio(a, b) === contrastRatio(b, a)`.
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(toRgb(a))
  const lb = luminance(toRgb(b))
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)

  return (lighter + 0.05) / (darker + 0.05)
}

/** Piso da WCAG 2.1 AA para texto normal — RNF-055. */
export const AA_NORMAL_TEXT = 4.5

/** Piso para texto grande (>= 18.66px negrito ou >= 24px). */
export const AA_LARGE_TEXT = 3

/** Atende ao AA para texto normal? */
export function meetsAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= AA_NORMAL_TEXT
}
