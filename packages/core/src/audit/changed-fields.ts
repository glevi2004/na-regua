import type { AuditValues } from '@na-regua/contracts'

/**
 * Campos que mudaram, e so eles — RF-123.
 *
 * A trilha responde "o que mudou". Guardar o registro inteiro obrigaria quem le
 * a comparar dois JSONs grandes para achar o campo que interessa — e quem esta
 * resolvendo divergencia com um funcionario nao quer diff, quer resposta.
 *
 * Devolve `null` quando nada mudou. Registrar alteracao que nao alterou nada
 * enche a trilha de linha que nao explica coisa alguma, e trilha longa demais
 * deixa de ser lida, que e o mesmo que nao existir.
 */
export type Alteracao = {
  readonly before: AuditValues
  readonly after: AuditValues
}

export function camposAlterados(
  antes: Readonly<Record<string, unknown>>,
  depois: Readonly<Record<string, unknown>>,
): Alteracao | null {
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  let mudou = false

  /* A uniao das chaves, e nao so as de `depois`: campo que sumiu tambem e
     mudanca, e olhar so um dos lados o esconderia. */
  for (const chave of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    const a = antes[chave]
    const d = depois[chave]
    if (saoIguais(a, d)) continue
    before[chave] = normalizar(a)
    after[chave] = normalizar(d)
    mudou = true
  }

  return mudou ? { before, after } : null
}

/**
 * Comparacao rasa, de proposito.
 *
 * Profunda exigiria percorrer estrutura arbitraria a cada gravacao, e o que
 * entra na trilha sao campos de registro — texto, numero, data, booleano. Se um
 * dia um campo virar objeto, e melhor que a trilha o marque como alterado a
 * mais do que a menos: perder mudanca e o defeito caro.
 */
function saoIguais(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  /* `Object.is` e nao `===` por causa de NaN, que nao e igual a si mesmo — e
     `NaN !== NaN` faria um campo intocado aparecer como alterado toda vez. */
  return Object.is(a, b)
}

/**
 * `undefined` vira `null` para sobreviver a serializacao.
 *
 * `JSON.stringify` APAGA a chave cujo valor e `undefined`. Sem isto, "o campo
 * passou a nao existir" chegaria ao banco como "o campo nunca esteve aqui" — e
 * a trilha perderia exatamente a metade que explica o que aconteceu.
 */
function normalizar(v: unknown): unknown {
  if (v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  return v
}
