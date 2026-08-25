# db

Schema Drizzle, migrations, políticas RLS e repositórios.

**Estado:** 🟡 só conexão e verificação de saúde · 🚧 schema bloqueado por
[DEC-002](../../docs/decisoes/README.md#dec-002) · `NR-007`, `NR-008`, `NR-020`

> [!WARNING]
> **Não implemente schema antes de DEC-002.** A estratégia multi-tenant define
> se existe `company_id` em toda tabela, e é a decisão mais cara de reverter do
> projeto. Ver [`dados.md`](../../docs/arquitetura/dados.md#multi-tenant).

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

Recomendação: **RLS por linha**.

```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sales
  USING (company_id = current_setting('app.company_id')::uuid);
```

| Regra                                            | Motivo                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Toda tabela de negócio tem `company_id NOT NULL` | sem ela a política não se aplica                                                          |
| `FORCE ROW LEVEL SECURITY` obrigatório           | sem ele o dono da tabela ignora a política                                                |
| Consulta sem `app.company_id` **falha**          | [RF-121](../../docs/produto/requisitos-funcionais.md) — falhar é melhor que retornar tudo |
| `company_id` vem do contexto, nunca do cliente   | [princípio 8](../../docs/arquitetura/principios.md)                                       |
| Recurso de outro tenant responde 404, não 403    | 403 confirma que o recurso existe                                                         |

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
