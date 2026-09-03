# EI BUDDY

> ERP para pequenos e médios negócios, operável tanto por aplicativo quanto por
> um assistente de IA no WhatsApp — os dois sobre o mesmo banco de dados e as
> mesmas regras de negócio.

> [!NOTE]
> **O nome do produto ainda não está definido.** Circulam três: `na-regua`
> (repositório), **ZapGestor** (apresentação comercial, que a própria
> apresentação declara ser nome de trabalho) e **ProComércio** (material de
> rebranding, com identidade visual completa e cinco marcas derivadas).
> A documentação usa **ZapGestor** provisoriamente, e o escopo dos pacotes é
> `@na-regua/*` — atrelado ao repositório, que não muda com a marca, para que a
> decisão não force renomear pacote nenhum. Ver
> [DEC-001](docs/decisoes/README.md#dec-001) e [QST-011](docs/decisoes/README.md#qst-011).

**Status:** pré-MVP.

|                |                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| ✅ Funcionando | workspace, ambiente local (Postgres + Redis), CI, hooks, [`packages/money`](packages/money/README.md) |
| 🟡 Scaffold    | `api` (com `/health` real), `worker` (filas registradas), `web`, `mobile`                             |
| 🔴 A fazer     | todos os demais módulos — **o banco ainda não tem schema**                                            |

**24 dos 157 dias-desenvolvedor do backlog ativo estão bloqueados por 6 decisões
em aberto** (marca, auth, LLM, memória do agente, hospedagem, cupons). Focus,
PagMaxx e WhatsApp Cloud API já têm ADR. Ver
[Decisões](docs/decisoes/README.md) e [Task Ledger](docs/processo/task-ledger.md).

---

## O que é

Duas formas de uso sobre a mesma base:

- **Aplicativo (web e mobile)** — jornadas A–J: cadastro, estoque, vendas com
  NFC-e e NFS-e Nacional via Focus NFe, financeiro, CRM, agenda, empresa, assinatura PagMaxx,
  chamados e assistente. Pix, link e cartão online passam pela PagMaxx;
  dinheiro e maquininha só são registrados.
- **Assistente de IA no WhatsApp (Cloud API oficial)** — as mesmas operações
  do ERP por mensagem, sobre os mesmos casos de uso.

O ponto central da arquitetura: **app e WhatsApp acionam exatamente os mesmos
casos de uso**. Não existe regra de negócio duplicada entre os dois canais.

Detalhes em [Visão do produto](docs/produto/visao.md) e
[Escopo do MVP](docs/produto/escopo-mvp.md).

## Stack

| Camada                | Tecnologia                         |
| --------------------- | ---------------------------------- |
| Monorepo              | pnpm workspaces + Turborepo        |
| API                   | Node.js + TypeScript + Fastify     |
| Filas / jobs          | BullMQ + Redis                     |
| Banco                 | PostgreSQL + Drizzle ORM (com RLS) |
| Validação / contratos | Zod                                |
| Mobile                | Expo / React Native                |
| Web                   | Next.js                            |
| CI/CD                 | GitHub Actions                     |

## Estrutura do monorepo

```
na-regua/
├── apps/
│   ├── api/          Fastify — REST, webhooks e runtime do agente
│   ├── worker/       BullMQ — filas e jobs agendados
│   ├── mobile/       Expo — app do lojista (leitor de código de barras)
│   └── web/          Next.js — backoffice A–J e landing
├── packages/
│   ├── core/         NÚCLEO — casos de uso
│   ├── domain/       regras puras: precificação, impostos, tarifas, comissão
│   ├── contracts/    schemas Zod — validação HTTP, tipos e tools da IA
│   ├── db/           schema Drizzle, migrations, políticas RLS
│   ├── agent/        runtime do agente: tools, memória, confirmações
│   ├── fiscal/       adapter Focus NFe (NFC-e e NFS-e Nacional)
│   ├── whatsapp/     adapter WhatsApp Cloud API
│   ├── banking/      adapter Open Finance (adiado)
│   ├── billing/      adapter de assinatura SaaS (PagMaxx)
│   ├── payments/     adapter PagMaxx — Pix, link, cartão online
│   ├── money/        tipo Money — centavos, sem float
│   └── ui/           tokens e componentes compartilhados
├── docs/             documentação (ver índice abaixo)
├── infra/            IaC, docker-compose, deploy
└── scripts/          utilitários de repositório
```

Cada módulo documenta a si mesmo no próprio README:

| Módulo               | Responsabilidade                        | Doc                                    |
| -------------------- | --------------------------------------- | -------------------------------------- |
| `apps/api`           | REST, webhooks, runtime do agente       | [README](apps/api/README.md)           |
| `apps/worker`        | filas e jobs agendados                  | [README](apps/worker/README.md)        |
| `apps/mobile`        | app do lojista                          | [README](apps/mobile/README.md)        |
| `apps/web`           | backoffice A–J e landing                | [README](apps/web/README.md)           |
| `packages/core`      | casos de uso                            | [README](packages/core/README.md)      |
| `packages/domain`    | regras de negócio puras                 | [README](packages/domain/README.md)    |
| `packages/contracts` | schemas e tipos compartilhados          | [README](packages/contracts/README.md) |
| `packages/db`        | schema, migrations, RLS                 | [README](packages/db/README.md)        |
| `packages/agent`     | runtime do assistente                   | [README](packages/agent/README.md)     |
| `packages/fiscal`    | adapter Focus NFe                       | [README](packages/fiscal/README.md)    |
| `packages/whatsapp`  | adapter WhatsApp Cloud API              | [README](packages/whatsapp/README.md)  |
| `packages/banking`   | adapter Open Finance (adiado)           | [README](packages/banking/README.md)   |
| `packages/billing`   | adapter de assinatura                   | [README](packages/billing/README.md)   |
| `packages/payments`  | adapter de PSP (Pix, link de pagamento) | [README](packages/payments/README.md)  |
| `packages/money`     | valores monetários                      | [README](packages/money/README.md)     |
| `packages/ui`        | design system                           | [README](packages/ui/README.md)        |
| `infra`              | infraestrutura e deploy                 | [README](infra/README.md)              |

Visão geral em [Arquitetura › Módulos](docs/arquitetura/modulos.md).

## Começando

```bash
pnpm install     # instala o workspace inteiro
pnpm setup       # cria o .env e sobe Postgres + Redis, esperando ficarem saudáveis
pnpm dev         # sobe api (:3333), worker e web (:3000)
```

Confira que subiu inteiro:

```bash
curl -s localhost:3333/health | jq
# { "status": "ok", "checks": { "database": { "ok": true, ... }, "redis": { "ok": true, ... } } }
```

O aplicativo mobile roda à parte: `pnpm --filter @na-regua/mobile dev`.

| Comando            | O quê                                               |
| ------------------ | --------------------------------------------------- |
| `pnpm test`        | testes                                              |
| `pnpm typecheck`   | checagem de tipos                                   |
| `pnpm boundaries`  | **verifica a matriz de dependências entre módulos** |
| `pnpm infra:psql`  | abre o `psql` no banco local                        |
| `pnpm infra:reset` | apaga os volumes e recria o banco                   |

Passo a passo completo e problemas comuns:
[Setup do ambiente](docs/engenharia/setup.md).

> [!NOTE]
> **Nenhuma credencial é necessária para desenvolver.** Todos os provedores
> externos rodam em modo `fake` até as decisões de fornecedor fecharem — ver
> [Ambientes](docs/engenharia/ambientes.md#modo-fake).

## Documentação

### Produto

| Doc                                                                    | Para quê                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Visão](docs/produto/visao.md)                                         | problema, público, proposta de valor e métricas de sucesso |
| [Personas](docs/produto/personas.md)                                   | quem usa o sistema e o que cada um espera                  |
| [User Stories](docs/produto/user-stories.md)                           | épicos e histórias com critérios de aceite                 |
| [Requisitos Funcionais](docs/produto/requisitos-funcionais.md)         | o que o sistema faz (RF-xxx)                               |
| [Requisitos Não Funcionais](docs/produto/requisitos-nao-funcionais.md) | como o sistema se comporta (RNF-xxx)                       |
| [Escopo do MVP](docs/produto/escopo-mvp.md)                            | dentro/fora do MVP e roadmap                               |
| [Glossário](docs/produto/glossario.md)                                 | linguagem ubíqua PT-BR ↔ termos de código                  |

### Arquitetura

| Doc                                            | Para quê                                              |
| ---------------------------------------------- | ----------------------------------------------------- |
| [Visão geral](docs/arquitetura/visao-geral.md) | contexto e containers (C4 níveis 1 e 2)               |
| [Princípios](docs/arquitetura/principios.md)   | regra de dependência e arquitetura hexagonal          |
| [Fluxos](docs/arquitetura/fluxos.md)           | sequências de venda, cobrança, WhatsApp e conciliação |
| [Dados](docs/arquitetura/dados.md)             | modelo, multi-tenant, RLS e migrations                |
| [Segurança](docs/arquitetura/seguranca.md)     | autenticação, autorização, segredos e LGPD            |
| [Módulos](docs/arquitetura/modulos.md)         | índice de todos os módulos e suas fronteiras          |

### Engenharia

| Doc                                                       | Para quê                                    |
| --------------------------------------------------------- | ------------------------------------------- |
| [Setup](docs/engenharia/setup.md)                         | do zero até rodar o projeto                 |
| [Git workflow](docs/engenharia/git-workflow.md)           | branches, commits, PR, merge e release      |
| [Code style](docs/engenharia/code-style.md)               | lint, formatação, nomenclatura e fronteiras |
| [Fluxo de trabalho](docs/engenharia/fluxo-de-trabalho.md) | ciclo diário, review, DoR/DoD               |
| [Ambientes](docs/engenharia/ambientes.md)                 | dev/staging/prod e variáveis de ambiente    |
| [Testes](docs/engenharia/testes.md)                       | estratégia de testes por camada             |
| [CI/CD](docs/engenharia/ci-cd.md)                         | pipelines, gates e deploy                   |

### Processo

| Doc                                                  | Para quê                               |
| ---------------------------------------------------- | -------------------------------------- |
| [Task Ledger](docs/processo/task-ledger.md)          | backlog dos 3 desenvolvedores          |
| [Importação Monday](docs/processo/monday-import.csv) | CSV para importar o ledger no Monday   |
| [Rituais](docs/processo/rituais.md)                  | cerimônias, Definition of Ready e Done |

### Decisões

| Doc                                                       | Para quê                         |
| --------------------------------------------------------- | -------------------------------- |
| [Decisões e perguntas em aberto](docs/decisoes/README.md) | o que ainda bloqueia trabalho    |
| [ADRs](docs/decisoes/adr/)                                | decisões já tomadas e seu porquê |

## Contribuindo

Leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes do primeiro commit. Resumo:
branches curtas a partir de `main`, commits em
[Conventional Commits](docs/engenharia/git-workflow.md#commits), PR com squash
merge e CI verde.

## Convenção de idioma

- **Documentação (`docs/`, READMEs):** português (PT-BR).
- **Código:** inglês — identificadores, tipos, nomes de arquivo e de pasta,
  variáveis de ambiente, tabelas e colunas do banco, endpoints e mensagens de log.

O [Glossário](docs/produto/glossario.md) mapeia cada termo de negócio em PT-BR
para o identificador correspondente em inglês.
