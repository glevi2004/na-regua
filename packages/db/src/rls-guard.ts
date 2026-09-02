import type { Sql } from 'postgres'

/**
 * Verifica que a conexao da aplicacao esta MESMO sujeita a RLS.
 *
 * Existe por causa de uma falha real, encontrada pela CI: o isolamento passou a
 * ser um no-op sem que nada avisasse, porque a aplicacao conectava com um papel
 * superusuario.
 *
 * `dados.md` manda usar `FORCE ROW LEVEL SECURITY`, e manda com razao — mas
 * FORCE resolve **um** dos tres jeitos de escapar da politica, e nao os tres:
 *
 * | Quem escapa                | FORCE resolve? |
 * | -------------------------- | -------------- |
 * | dono da tabela             | **sim**        |
 * | papel com `BYPASSRLS`      | nao            |
 * | **superusuario**           | nao            |
 *
 * Superusuario ignora RLS inteiramente. E o pior caso possivel porque nao da
 * erro nenhum: a politica existe, o `pg_class` mostra `relforcerowsecurity`
 * ligado, o teste que le metadado passa — e toda consulta devolve as linhas de
 * todas as empresas. Foi exatamente o que aconteceu na CI, onde a aplicacao
 * usava o `POSTGRES_USER` do contedor.
 *
 * Por isso esta verificacao roda na subida, e nao em teste: um ambiente mal
 * configurado tem de derrubar o processo, nao vazar dado em silencio.
 */

export type RlsStatus = {
  readonly role: string
  readonly isSuperuser: boolean
  readonly bypassesRls: boolean
  /** `true` so quando o papel nao consegue escapar da politica de jeito nenhum. */
  readonly enforced: boolean
}

export async function checkRlsEnforcement(sql: Sql): Promise<RlsStatus> {
  const [linha] = await sql<{ role: string; super: boolean; bypass: boolean }[]>`
    SELECT rolname AS role, rolsuper AS super, rolbypassrls AS bypass
      FROM pg_roles
     WHERE rolname = current_user
  `

  if (!linha) {
    throw new Error(
      `Nao foi possivel ler os atributos do papel atual. ` +
        `Sem isso nao se sabe se o isolamento entre empresas esta em vigor.`,
    )
  }

  return {
    role: linha.role,
    isSuperuser: linha.super,
    bypassesRls: linha.bypass,
    enforced: !linha.super && !linha.bypass,
  }
}

/**
 * Derruba a subida quando a conexao da aplicacao pode ignorar RLS.
 *
 * Chame na raiz de composicao, junto do `checkConnection`. Falhar aqui e
 * barato; descobrir em producao que uma loja lia os dados da outra nao e.
 */
export async function assertRlsEnforced(sql: Sql): Promise<RlsStatus> {
  const status = await checkRlsEnforcement(sql)
  if (status.enforced) return status

  const motivo = status.isSuperuser ? 'e superusuario' : 'tem BYPASSRLS'

  throw new Error(
    `A conexao da aplicacao usa o papel "${status.role}", que ${motivo} — e por isso ` +
      `IGNORA as politicas de RLS. O isolamento entre empresas nao estaria em vigor.\n\n` +
      `Use um papel sem superusuario e sem BYPASSRLS em DATABASE_URL. ` +
      `O papel com BYPASSRLS existe so para migrations, em DATABASE_MIGRATION_URL ` +
      `(ver docs/arquitetura/dados.md#multi-tenant e packages/db/README.md).`,
  )
}
