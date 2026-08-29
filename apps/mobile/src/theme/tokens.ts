/**
 * Adaptador dos tokens compartilhados para o vocabulario deste app.
 *
 * A fonte de verdade e `@na-regua/ui` (NR-011). Este arquivo existe por dois
 * motivos:
 *
 * 1. O app usa o tema escuro em todas as telas, entao `cores` achata
 *    `dark` + `brand` num objeto so — em vez de espalhar `dark.feedback.danger`
 *    por 25 arquivos.
 * 2. Os nomes em portugues sao ponte, nao escolha. O code-style do repo pede
 *    identificador em ingles; renomear as 667 ocorrencias vira um diff mecanico
 *    que enterraria a revisao deste PR. Fica como tarefa propria.
 *
 * Cor nova entra em `packages/ui`, nunca aqui.
 */
import { brand, dark, fontSize, fontWeight, radius, spacing } from '@na-regua/ui'

export const cores = {
  /* --- Marca --- */
  primaria: brand.primary,
  primariaEscura: brand.primaryDark,
  acento: brand.accent,
  acentoEscuro: brand.accentDark,
  destaque: brand.highlight,

  /* --- Superficies --- */
  fundo: dark.bg,
  superficie: dark.surface,
  superficieAlta: dark.surfaceRaised,
  borda: dark.border,
  campo: dark.field,

  /* --- Texto --- */
  texto: dark.text,
  textoFraco: dark.textMuted,
  textoSobreAcento: dark.textOnAccent,

  /* --- Estados --- */
  atencao: dark.feedback.warning,
  atencaoFundo: dark.feedback.warningBg,
  erro: dark.feedback.danger,
  erroFundo: dark.feedback.dangerBg,
  sucesso: dark.feedback.success,
  sucessoFundo: dark.feedback.successBg,
} as const

export const espaco = spacing

export const raio = {
  ...radius,
  pill: radius.pill,
} as const

export const fonte = {
  micro: fontSize.micro,
  pequeno: fontSize.small,
  corpo: fontSize.body,
  medio: fontSize.medium,
  titulo: fontSize.title,
  display: fontSize.display,
} as const

export const peso = {
  normal: fontWeight.regular,
  medio: fontWeight.medium,
  forte: fontWeight.semibold,
  pesado: fontWeight.bold,
} as const
