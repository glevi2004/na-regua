# ZapGestor

> ERP para pequenos e médios negócios, operável tanto por aplicativo quanto por
> um assistente de IA no WhatsApp — os dois sobre o mesmo banco de dados e as
> mesmas regras de negócio.

> [!NOTE]
> **Nome do produto ainda não é definitivo.** O repositório se chama `na-regua`
> e a apresentação comercial usa `ZapGestor`. A documentação usa **ZapGestor**
> provisoriamente. Ver [DEC-001](docs/decisoes/README.md#dec-001).

**Status:** pré-MVP. Estrutura do monorepo criada; implementação dos módulos
ainda por fazer. Consulte o [Task Ledger](docs/processo/task-ledger.md) para o
que está em andamento e as [Decisões em aberto](docs/decisoes/README.md) para o
que ainda bloqueia trabalho.

---

## O que é

Duas formas de uso sobre a mesma base:

- **Aplicativo** — cadastros, vendas com leitor de código de barras, financeiro,
  relatórios, emissão de NFC-e/NFS-e e conciliação bancária via Open Finance.
- **Assistente de IA no WhatsApp** — qualquer funcionalidade do ERP também pode
  ser acionada por mensagem (cadastrar cliente, lançar venda, consultar contas,
  gerar relatórios, enviar cobranças e catálogos), mantendo o contexto da conversa.

O ponto central da arquitetura: **app e WhatsApp acionam exatamente os mesmos
casos de uso**. Não existe regra de negócio duplicada entre os dois canais.

Detalhes em [Visão do produto](docs/produto/visao.md) e
[Escopo do MVP](docs/produto/escopo-mvp.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | Node.js + TypeScript + Fastify |
| Filas / jobs | BullMQ + Redis |
| Banco | PostgreSQL + Drizzle ORM (com RLS) |
| Validação / contratos | Zod |
| Mobile | Expo / React Native |
| Web | Next.js |
| CI/CD | GitHub Actions |

## Estrutura do monorepo

```
na-regua/
├── apps/
│   ├── api/          Fastify — REST, webhooks e runtime do agente
│   ├── worker/       BullMQ — filas e jobs agendados
│   ├── mobile/       Expo — app do lojista (leitor de código de barras)
│   └── web/          Next.js — backoffice, catálogo público, landing
├── packages/
│   ├── core/         NÚCLEO — casos de uso
│   ├── domain/       regras puras: precificação, impostos, tarifas, comissão
│   ├── contracts/    schemas Zod — validação HTTP, tipos e tools da IA
│   ├── db/           schema Drizzle, migrations, políticas RLS
│   ├── agent/        runtime do agente: tools, memória, confirmações
│   ├── fiscal/       adapter NFC-e/NFS-e
│   ├── whatsapp/     adapter do provedor de WhatsApp
│   ├── banking/      adapter Open Finance
│   ├── billing/      adapter de assinatura SaaS
│   ├── money/        tipo Money — centavos, sem float
│   └── ui/           tokens e componentes compartilhados
├── docs/             documentação (ver índice abaixo)
├── infra/            IaC, docker-compose, deploy
└── scripts/          utilitários de repositório
```

Cada módulo documenta a si mesmo no próprio README:

| Módulo | Responsabilidade | Doc |
|---|---|---|
| `apps/api` | REST, webhooks, runtime do agente | [README](apps/api/README.md) |
| `apps/worker` | filas e jobs agendados | [README](apps/worker/README.md) |
| `apps/mobile` | app do lojista | [README](apps/mobile/README.md) |
| `apps/web` | backoffice, catálogo, landing | [README](apps/web/README.md) |
| `packages/core` | casos de uso | [README](packages/core/README.md) |
| `packages/domain` | regras de negócio puras | [README](packages/domain/README.md) |
| `packages/contracts` | schemas e tipos compartilhados | [README](packages/contracts/README.md) |
| `packages/db` | schema, migrations, RLS | [README](packages/db/README.md) |
| `packages/agent` | runtime do assistente | [README](packages/agent/README.md) |
| `packages/fiscal` | adapter fiscal | [README](packages/fiscal/README.md) |
| `packages/whatsapp` | adapter de mensageria | [README](packages/whatsapp/README.md) |
| `packages/banking` | adapter Open Finance | [README](packages/banking/README.md) |
| `packages/billing` | adapter de assinatura | [README](packages/billing/README.md) |
| `packages/money` | valores monetários | [README](packages/money/README.md) |
| `packages/ui` | design system | [README](packages/ui/README.md) |
| `infra` | infraestrutura e deploy | [README](infra/README.md) |

Visão geral em [Arquitetura › Módulos](docs/arquitetura/modulos.md).

## Começando

```bash
pnpm install          # instala todo o workspace
pnpm dev              # sobe api, worker, web e mobile
pnpm test             # testes dos pacotes afetados
```

> [!WARNING]
> **O workspace da raiz ainda não foi configurado** (tarefa `NR-001`). Hoje cada
> app roda isoladamente com `npm` dentro da própria pasta. Ver
> [Setup do ambiente](docs/engenharia/setup.md) para o procedimento atual.

## Documentação

### Produto
| Doc | Para quê |
|---|---|
| [Visão](docs/produto/visao.md) | problema, público, proposta de valor e métricas de sucesso |
| [Personas](docs/produto/personas.md) | quem usa o sistema e o que cada um espera |
| [User Stories](docs/produto/user-stories.md) | épicos e histórias com critérios de aceite |
| [Requisitos Funcionais](docs/produto/requisitos-funcionais.md) | o que o sistema faz (RF-xxx) |
| [Requisitos Não Funcionais](docs/produto/requisitos-nao-funcionais.md) | como o sistema se comporta (RNF-xxx) |
| [Escopo do MVP](docs/produto/escopo-mvp.md) | dentro/fora do MVP e roadmap |
| [Glossário](docs/produto/glossario.md) | linguagem ubíqua PT-BR ↔ termos de código |

### Arquitetura
| Doc | Para quê |
|---|---|
| [Visão geral](docs/arquitetura/visao-geral.md) | contexto e containers (C4 níveis 1 e 2) |
| [Princípios](docs/arquitetura/principios.md) | regra de dependência e arquitetura hexagonal |
| [Fluxos](docs/arquitetura/fluxos.md) | sequências de venda, cobrança, WhatsApp e conciliação |
| [Dados](docs/arquitetura/dados.md) | modelo, multi-tenant, RLS e migrations |
| [Segurança](docs/arquitetura/seguranca.md) | autenticação, autorização, segredos e LGPD |
| [Módulos](docs/arquitetura/modulos.md) | índice de todos os módulos e suas fronteiras |

### Engenharia
| Doc | Para quê |
|---|---|
| [Setup](docs/engenharia/setup.md) | do zero até rodar o projeto |
| [Git workflow](docs/engenharia/git-workflow.md) | branches, commits, PR, merge e release |
| [Code style](docs/engenharia/code-style.md) | lint, formatação, nomenclatura e fronteiras |
| [Fluxo de trabalho](docs/engenharia/fluxo-de-trabalho.md) | ciclo diário, review, DoR/DoD |
| [Ambientes](docs/engenharia/ambientes.md) | dev/staging/prod e variáveis de ambiente |
| [Testes](docs/engenharia/testes.md) | estratégia de testes por camada |
| [CI/CD](docs/engenharia/ci-cd.md) | pipelines, gates e deploy |

### Processo
| Doc | Para quê |
|---|---|
| [Task Ledger](docs/processo/task-ledger.md) | backlog dos 3 desenvolvedores |
| [Importação Monday](docs/processo/monday-import.csv) | CSV para importar o ledger no Monday |
| [Rituais](docs/processo/rituais.md) | cerimônias, Definition of Ready e Done |

### Decisões
| Doc | Para quê |
|---|---|
| [Decisões e perguntas em aberto](docs/decisoes/README.md) | o que ainda bloqueia trabalho |
| [ADRs](docs/decisoes/adr/) | decisões já tomadas e seu porquê |

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
