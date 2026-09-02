# db

Schema Drizzle, migrations, políticas RLS e repositórios.

**Estado:** 🟢 isolamento (`NR-007`), cadastros (`NR-008`), vendas e financeiro (`NR-020`)

Isolamento entre empresas é **RLS por linha** (`company_id` + política no
PostgreSQL). Ver [`dados.md`](../../docs/arquitetura/dados.md#multi-tenant).

## Responsabilidade

Persistência: schema, migrations, políticas de isolamento e repositórios
tipados.

**O que não faz:** regra de negócio, controle de transação (quem abre e fecha a
transação é o caso de uso em `core` — repositório que gerencia a própria
transação impossibilita compor operações atomicamente).

## Fronteiras

|                       |                                                                  |
| --------------------- | ---------------------------------------------------------------- |
| **Expõe hoje**        | `getClient()`, `checkConnection()`, `closeConnection()`          |
| **Vai expor**         | schema, repositórios, `withTenant()`                             |
| **Depende de**        | `contracts`, `money`, `postgres`                                 |
| **Proibido importar** | `core`, `domain`, adapters                                       |
| **Quem depende**      | `core` — e a **raiz de composição** de `api`/`worker`, nada mais |

A regra `handler-nao-importa-db` da CI barra qualquer import de `db` em
`apps/api` ou `apps/worker` fora de `composition.ts`. Foi verificada com uma
violação real.

## Isolamento multi-tenant

Decisão: **RLS por linha** ([ADR-0001](../../docs/decisoes/adr/0001-rls-por-linha.md)).

Toda tabela de negócio chama uma função, em vez de repetir o bloco de política:

```sql
CREATE TABLE sales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  -- ...
);

SELECT enable_tenant_isolation('sales');
```

**Por que uma função e não o SQL repetido:** política escrita à mão em trinta
lugares é política escrita errado em um deles — e o único jeito de descobrir
qual é vazando dado entre lojas. Com a função existe uma definição só, e mudar
a regra é mudar um lugar.

A função ([`0001_tenant_isolation.sql`](src/migrations/0001_tenant_isolation.sql))
faz três coisas, e **recusa** a tabela que não tenha `company_id` — ligar RLS
numa tabela sem a coluna passaria, e a política falharia só na primeira consulta
em produção:

```sql
ALTER TABLE %s ENABLE ROW LEVEL SECURITY;
ALTER TABLE %s FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON %s
  USING      (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
```

**`WITH CHECK` é a metade que costuma faltar.** `USING` filtra o que se lê,
atualiza e apaga; `WITH CHECK` filtra o que se **grava**. Sem ele, um `INSERT`
com o `company_id` do vizinho entra, e um `UPDATE` consegue mover a linha para
outra empresa. Ler errado é vazamento; gravar errado é vazamento que fica.

`current_company_id()` usa `current_setting('app.company_id')` **sem**
`missing_ok`. Com ele, a variável ausente viraria `NULL`, a comparação daria
`NULL` e a consulta devolveria zero linhas em silêncio — e vazio parece
resposta: alguém conclui que a loja não vendeu nada hoje.

| Regra                                            | Motivo                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Toda tabela de negócio tem `company_id NOT NULL` | sem ela a política não se aplica                                                          |
| `FORCE ROW LEVEL SECURITY` obrigatório           | sem ele o dono da tabela ignora a política                                                |
| Consulta sem `app.company_id` **falha**          | [RF-121](../../docs/produto/requisitos-funcionais.md) — falhar é melhor que retornar tudo |
| `company_id` vem do contexto, nunca do cliente   | [princípio 8](../../docs/arquitetura/principios.md)                                       |
| Recurso de outro tenant responde 404, não 403    | 403 confirma que o recurso existe                                                         |

### Três jeitos de escapar da política, e o `FORCE` cobre um

Descoberto pela CI, do jeito caro: oito testes vermelhos mostrando linhas de
duas empresas onde deveria haver uma.

| Quem escapa           | `FORCE` resolve? |
| --------------------- | ---------------- |
| dono da tabela        | **sim**          |
| papel com `BYPASSRLS` | não              |
| **superusuário**      | não              |

Superusuário ignora RLS inteiramente — e é o pior caso possível porque **não dá
erro nenhum**: a política existe, `pg_class` mostra `relforcerowsecurity`
ligado, o teste que lê metadado passa, e toda consulta devolve as linhas de
todas as empresas. Era o caso da CI, onde a aplicação usava o `POSTGRES_USER`
do contêiner.

Por isso existe `assertRlsEnforced`, que a raiz de composição chama na subida:

```ts
import { assertRlsEnforced, getClient } from '@na-regua/db'

await assertRlsEnforced(getClient())
```

Ambiente mal configurado tem de **derrubar o processo**, não vazar dado em
silêncio. E é por isso que os testes de isolamento criam um papel comum e
conectam com ele: com a conexão de administrador, eles mediriam o vazio.

## Como o tenant chega ao banco

`withTenant` é o único lugar do sistema que define `app.company_id`:

```ts
import { withTenant } from '@na-regua/db'

const vendas = await withTenant(sql, ctx.companyId, (tx) => tx`SELECT * FROM sales`)
```

O terceiro argumento do `set_config` é `true`, e é ele que importa: torna o
ajuste **local à transação**. Sem ele a variável ficaria na _conexão_ — e
conexão volta para o pool. A requisição seguinte, de outra empresa, pegaria a
conexão com o tenant anterior ainda definido e leria os dados da loja errada.
É o vazamento mais fácil de escrever e o mais difícil de notar, porque só
aparece sob concorrência. Há um teste dedicado a ele.

Para o que é legitimamente global — migrations, tarefas de plataforma — existe
`withPlatformScope`. Nomeado assim, e não `withoutTenant`, para que quem lê a
chamada veja uma exceção consciente e não um esquecimento.

## Tabelas

| Tabela              | Tenant                | Migration                  |
| ------------------- | --------------------- | -------------------------- |
| `companies`         | **é** o tenant (`id`) | `0002_cadastros`           |
| `users`             | via `company_users`   | `0002_cadastros`           |
| `company_users`     | `company_id`          | `0002_cadastros`           |
| `categories`        | `company_id`          | `0002_cadastros`           |
| `customers`         | `company_id`          | `0002_cadastros`           |
| `products`          | `company_id`          | `0002_cadastros`           |
| `company_counters`  | `company_id`          | `0003_vendas_e_financeiro` |
| `sales`             | `company_id`          | `0003_vendas_e_financeiro` |
| `sale_items`        | `company_id`          | `0003_vendas_e_financeiro` |
| `payments`          | `company_id`          | `0003_vendas_e_financeiro` |
| `receivables`       | `company_id`          | `0003_vendas_e_financeiro` |
| `settlements`       | `company_id`          | `0003_vendas_e_financeiro` |
| `sale_returns`      | `company_id`          | `0003_vendas_e_financeiro` |
| `sale_return_items` | `company_id`          | `0003_vendas_e_financeiro` |
| `appointments`      | `company_id`          | `0006_agenda`              |

Dois casos fogem do `company_id`, e os dois de propósito:

**`companies` é o próprio tenant.** A coluna que a identifica é o `id`, então
ela usa `enable_root_tenant_isolation`. Consequência prática: **a empresa nasce
sob o próprio tenant** — o `id` é gerado na aplicação e o contexto já é ele:

```ts
const id = randomUUID()
await withTenant(sql, id, (tx) => tx`INSERT INTO companies (id, ...) VALUES (${id}, ...)`)
```

Parece incômodo e é a propriedade que se quer. A alternativa seria uma política
de INSERT com `WITH CHECK (true)`, que abriria exatamente o buraco que o resto
fecha: qualquer contexto gravando linha de qualquer empresa.

**`users` não tem `company_id`** porque a mesma pessoa opera mais de uma loja —
uma identidade por empresa duplicaria a pessoa e as credenciais dela. Mas não
ter `company_id` não pode significar ser visível a todos: e-mail e telefone são
dado pessoal. A política passa por `company_users`, então só se enxerga quem tem
vínculo com a empresa do contexto.

Isso tem uma consequência que morde: **`INSERT INTO users ... RETURNING` volta
vazio.** O `RETURNING` aplica a política de `SELECT`, e no instante do insert o
vínculo em `company_users` ainda não existe. Gere o `id` na aplicação e insira
os dois na mesma transação.

## Dois papéis de banco

| Papel              | Uso        | RLS                     |
| ------------------ | ---------- | ----------------------- |
| `naregua`          | aplicação  | ✅ sujeito às políticas |
| `naregua_migrator` | migrations | ❌ `BYPASSRLS`          |

Um papel só significaria abrir mão do isolamento: migration precisa enxergar
tudo; aplicação não pode. Ambos são criados por
[`infra/postgres/init/01-extensions.sql`](../../infra/postgres/init/01-extensions.sql)
no ambiente local.

## Convenções de schema

Tabela `snake_case` plural · coluna `snake_case` · `id uuid` · FK `<singular>_id`
· **dinheiro em `bigint` de centavos** · percentual `numeric(7,4)` · data/hora
`timestamptz` em UTC com sufixo `_at` · sem `enum` nativo (migrar dói).

Todo índice de tabela de negócio **começa por `company_id`** — com RLS, toda
consulta filtra por ele, e índice que não o tem na frente quase nunca é usado.

Detalhes em [`dados.md`](../../docs/arquitetura/dados.md#convenções-de-schema).

## Migrations

| Regra                                                   | Requisito                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Reversível ou com plano de reversão no PR               | [RNF-048](../../docs/produto/requisitos-nao-funcionais.md) |
| Sem bloquear escrita por mais de 30 s                   | [RNF-049](../../docs/produto/requisitos-nao-funcionais.md) |
| Destrutiva em duas etapas: expandir → migrar → contrair | permite reverter o deploy                                  |
| Tabela nova já nasce com RLS habilitado                 | esquecer é vazamento entre tenants                         |
| Sem regra de negócio dentro                             | regra vive em `domain`                                     |

## Testes

Contra **Postgres de verdade**, nunca banco fingido — transação, RLS e restrição
de integridade são metade do que precisamos testar e não existem num fake.

Os testes de isolamento são obrigatórios: um que tenta ler dado de outro
`company_id` e **precisa falhar**, e outro que consulta sem tenant no contexto e
**precisa falhar**. Sem eles, "temos RLS" é fé, não fato.

## Variáveis de ambiente

| Variável                 | Uso                                  |
| ------------------------ | ------------------------------------ |
| `DATABASE_URL`           | conexão da aplicação — sujeita a RLS |
| `DATABASE_MIGRATION_URL` | papel com `BYPASSRLS`, só migrations |

## Desenvolvimento

```bash
pnpm infra:up      # sobe o Postgres
pnpm infra:psql    # abre o psql
pnpm infra:reset   # apaga os volumes e recria (perde os dados locais)
```
