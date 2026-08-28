/**
 * Tokens de design do Ei Buddy para React Native.
 *
 * Os mesmos valores do web (apps/web/src/app/globals.css), mas como
 * objeto TS: React Native nao tem CSS custom properties, entao o que la
 * e `var(--app-accent)` aqui e `cores.acento`.
 *
 * Manter os dois em sincronia e manual por enquanto. Quando existir o
 * pacote `packages/ui`, estes valores passam a morar la e os dois
 * clientes importam da mesma fonte.
 */

export const cores = {
  /* --- Marca --- */
  primaria: '#1e2a78',
  primariaEscura: '#16205c',
  acento: '#39c8bd',
  acentoEscuro: '#24a79d',
  destaque: '#6d33dd',

  /* --- Superficies (tema escuro, igual ao painel web) --- */
  fundo: '#0e1330',
  superficie: '#161c42',
  superficieAlta: '#1d2452',
  borda: '#2a3268',
  campo: 'rgba(255,255,255,0.04)',

  /* --- Texto --- */
  texto: '#eef0fb',
  textoFraco: '#9aa2ce',
  textoSobreAcento: '#06312e',

  /* --- Estados. Ambar para atencao e vermelho para erro, os mesmos
     significados do web — nunca o roxo da marca. --- */
  atencao: '#fdb022',
  atencaoFundo: 'rgba(253,176,34,0.16)',
  erro: '#ff9c9c',
  erroFundo: 'rgba(255,118,118,0.16)',
  sucesso: '#39c8bd',
  sucessoFundo: 'rgba(57,200,189,0.14)',
} as const

export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const raio = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const

export const fonte = {
  /* Tamanhos pensados para uso em pe, no balcao — nada abaixo de 12. */
  micro: 12,
  pequeno: 13,
  corpo: 15,
  medio: 17,
  titulo: 21,
  display: 28,
} as const

export const peso = {
  normal: '400',
  medio: '500',
  forte: '600',
  pesado: '700',
} as const
