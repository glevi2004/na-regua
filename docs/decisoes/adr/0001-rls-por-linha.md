---
adr: 0001
titulo: Isolamento multi-tenant por RLS por linha
status: aceita
data: 2026-09-01
decisores:
  - Trilha 1 — Núcleo & Dados
substitui: null
substituida_por: null
---

# ADR-0001 — Isolamento multi-tenant por RLS por linha

|                       |                                 |
| --------------------- | ------------------------------- |
| **Status**            | Aceita                          |
| **Data**              | 2026-09-01                      |
| **Decisores**         | Trilha 1 — Núcleo & Dados       |
| **Decisão de origem** | [DEC-002](../README.md#dec-002) |

## Contexto

O produto serve muitas lojas no mesmo sistema. Uma loja enxergar dados de outra
é o risco T1 — quebra de confiança irrecuperável. [RNF-021](../../produto/requisitos-nao-funcionais.md)
exige isolamento **imposto pelo banco**, não pela disciplina de quem escreve o
`WHERE`. [RNF-016](../../produto/requisitos-nao-funcionais.md) pede 1.000
empresas ativas sem mudar a arquitetura.

A apresentação comercial falava em "estrutura do banco de dados por
login/empresa". Essa frase cabe em schema por empresa, banco por empresa ou
filtro por `company_id`. A escolha muda toda tabela, todo repositório e o
contexto de execução — é a decisão mais cara de reverter do projeto.

Enquanto estava em aberto, nada em `packages/db` podia nascer: o schema inteiro
depende dela.

## Opções consideradas

### Opção A — RLS por linha

`company_id` em toda tabela de negócio + política no PostgreSQL. Um banco, um
schema, migrations uma vez.

| Prós                                       | Contras                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Isolamento imposto pelo Postgres           | Toda consulta depende de `app.company_id` na sessão                          |
| Uma migration serve a todos os tenants     | Índice de tabela de negócio precisa começar por `company_id`                 |
| Opera 1.000 empresas sem proliferar schema | RLS mal configurado (sem `FORCE`) é isolamento de fachada                    |
| Atende RNF-021 e RNF-016 ao mesmo tempo    | Papel de migration precisa de `BYPASSRLS`, senão o migrator não enxerga nada |

### Opção B — Schema por empresa

Um schema PostgreSQL por tenant.

| Prós                      | Contras                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Isolamento muito alto     | N execuções de cada migration; uma pode falhar e deixar o parque partido |
| Backup/restore por tenant | Custo operacional alto; inviável em 1.000 tenants (RNF-016)              |

### Opção C — Banco por empresa

Um cluster/database por tenant.

| Prós                        | Contras                                  |
| --------------------------- | ---------------------------------------- |
| Isolamento máximo           | Fora de escala para o público-alvo       |
| Falha de um não afeta outro | Custo e operação incompatíveis com o MVP |

### Opção D — Filtro só na aplicação

`WHERE company_id = ?` em cada consulta, sem política no banco.

| Prós                | Contras                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| Simples de escrever | **Nenhum isolamento de verdade** — um `WHERE` esquecido vaza dados     |
| Sem RLS para operar | Não atende RNF-021; é o que acontece por omissão quando ninguém decide |

## Decisão

**Escolhemos a opção A — RLS por linha.**

É o único caminho que atende isolamento no banco (RNF-021) e escala a 1.000
empresas (RNF-016) ao mesmo tempo. Schema por empresa não escala para
migrations; banco por empresa não escala para o público-alvo; filtro só na
aplicação não é isolamento.

O que foi abdicado: isolamento físico entre tenants e a simplicidade de um
`WHERE` que a aplicação controla sozinha. Em troca, o Postgres recusa a leitura
cruzada mesmo quando a aplicação erra.

Consequências que valem para todo o código estão em
[`dados.md`](../../arquitetura/dados.md#multi-tenant). Materialização em
`packages/db` (`NR-007`).

## Consequências

### Positivas

- Isolamento não depende de o desenvolvedor lembrar do `WHERE`
- Uma migration, um schema, um backup — operação cabível em time pequeno
- Teste de isolamento na CI é possível e obrigatório (RNF-021)

### Negativas

- Toda tabela de negócio nasce com `company_id NOT NULL` e `FORCE ROW LEVEL SECURITY`
- Dois papéis de banco: aplicação sob RLS, migrator com `BYPASSRLS`
- Consulta sem `app.company_id` na sessão **falha** — não retorna tudo
- `companyId` nunca vem do cliente; vem do contexto de execução
- Recurso de outro tenant responde **404**, não 403

### Neutras

- Drizzle e SQL explícito já estavam escolhidos; RLS reforça essa escolha
- O modelo lógico (companies, customers, products, sales) não muda — só a forma de isolá-lo

## Impacto na documentação

Atualizados **no mesmo PR** desta ADR:

- [x] `docs/arquitetura/dados.md`
- [x] `docs/arquitetura/visao-geral.md`
- [x] `packages/db/README.md`
- [x] `docs/engenharia/setup.md`
- [x] `docs/processo/task-ledger.md`
- [x] `docs/produto/requisitos-funcionais.md`
- [x] `DEC-002` marcada como 🟢 e removida da lista de abertas

## Quando revisitar

- Carga real se aproximando de 1.000 empresas com degradação atribuível a RLS
- Exigência regulatória ou de cliente enterprise por isolamento físico (schema ou banco próprio)
- Falha de isolamento em produção — aí a ADR não se reescreve; escreve-se outra que a substitui
