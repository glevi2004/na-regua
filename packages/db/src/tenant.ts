import type { Sql, TransactionSql } from 'postgres'

/**
 * A ponte entre o `ExecutionContext` de `core` e a politica de RLS do banco.
 *
 * Toda leitura ou escrita de dado de negocio passa por aqui. Nao e conveniencia:
 * e o unico lugar do sistema que define `app.company_id`, e a politica
 * `tenant_isolation` nao funciona sem ela. Consulta feita fora daqui **falha**
 * em vez de devolver dados — RF-121, e de proposito.
 *
 * Ver docs/arquitetura/dados.md#multi-tenant e ADR-0001.
 */

/** O tenant vem do contexto, nunca do cliente — principio 8. */
export type TenantId = string

/**
 * Abre uma transacao com a empresa do contexto definida, roda `fn` dentro dela.
 *
 * O `true` no `set_config` e a parte que importa: ele torna o ajuste **local a
 * transacao**. Sem ele, a variavel ficaria na CONEXAO — e conexao volta para o
 * pool. A proxima requisicao, de outra empresa, pegaria a conexao com o tenant
 * anterior ainda definido e leria os dados da loja errada. Esse e o vazamento
 * mais facil de escrever e o mais dificil de notar, porque so aparece sob
 * concorrencia.
 *
 * `companyId` nao e interpolado como texto em nenhum ponto: vai como parametro,
 * e `set_config` recebe valor, nao SQL.
 */
export async function withTenant<T>(
  sql: Sql,
  companyId: TenantId,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  if (companyId.trim() === '') {
    /*
     * Empresa vazia nao e "sem empresa": seria um `set_config` bem-sucedido
     * com valor invalido, e o erro apareceria depois, no cast para uuid,
     * parecendo problema de dado em vez de contexto faltando.
     */
    throw new Error('withTenant recebeu companyId vazio. O tenant vem do ExecutionContext.')
  }

  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.company_id', ${companyId}, true)`
    return fn(tx)
  }) as Promise<T>
}

/**
 * Roda `fn` numa transacao SEM tenant definido.
 *
 * Existe para o que e legitimamente global: migrations, tarefas de plataforma,
 * e o teste que prova que consulta sem tenant falha. Nomeado assim, e nao
 * `withoutTenant`, porque quem le a chamada precisa ver que aquilo e uma
 * excecao consciente e nao um esquecimento.
 */
export async function withPlatformScope<T>(
  sql: Sql,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => fn(tx)) as Promise<T>
}
