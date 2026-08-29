/**
 * Espacamento, raio e elevacao.
 *
 * Numeros crus, sem unidade: o React Native so aceita numero, e o web
 * acrescenta `px` ao gerar as variaveis CSS. Guardar '16px' aqui obrigaria o
 * mobile a fatiar string.
 */

/** Escala de espacamento. Multiplos de 4 — fora dela, nao existe. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  /** Circulo. Valor alto em vez de 50% para funcionar tambem no RN. */
  pill: 999,
} as const

/**
 * Sombras so existem no tema claro.
 *
 * No escuro elas somem contra o fundo; a separacao entre superficies vem da
 * borda e da diferenca de luminancia, nao de sombra.
 */
export const shadow = {
  sm: '0 1px 2px rgba(19, 23, 52, 0.06)',
  md: '0 8px 24px -12px rgba(19, 23, 52, 0.18)',
  lg: '0 28px 60px -28px rgba(19, 23, 52, 0.32)',
} as const

/** Medidas de pagina, so do web. */
export const layout = {
  container: 1180,
  headerHeight: 72,
} as const
