# Task Ledger

Backlog completo dividido em três trilhas. **Fonte da verdade versionada** — o
Monday é a visualização; divergiu, o ledger ganha.

Importação: [`monday-import.csv`](monday-import.csv).

---

## Como ler

| Coluna     | Significado                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| **ID**     | `NR-xxx`, permanente. Aparece na branch, no título do PR, no rodapé do commit e no Monday |
| **Trilha** | 🔵 1 Núcleo & Dados · 🟠 2 Plataforma & Integrações · 🟢 3 Clientes                       |
| **Est**    | estimativa em dias. **Acima de 2 dias, a tarefa deve ser quebrada**                       |
| **Dep**    | tarefas que precisam estar concluídas antes                                               |
| **Bloq**   | decisão em aberto que impede _terminar_ — nem sempre impede _começar_                     |
| **Status** | ⬜ a fazer · 🟨 em andamento · ✅ concluída · 🚧 bloqueada                                |

**Bloqueado ≠ parado.** Quando o bloqueio é escolha de provedor, a porta e os
testes com adapter falso podem ser escritos antes — é exatamente para isso que
os adapters existem
([princípios](../arquitetura/principios.md#3-adapters-isolam-provedores)).

## As trilhas

| Trilha                              | Módulos                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| 🔵 **1 — Núcleo & Dados**           | `money` `domain` `contracts` `db` `core`                                             |
| 🟠 **2 — Plataforma & Integrações** | `api` `worker` `agent` `whatsapp` `fiscal` `banking` `billing` `payments` `infra` CI |
| 🟢 **3 — Clientes**                 | `mobile` `web` `ui`                                                                  |

> **A trilha 1 é o gargalo até a Sprint 2.** `money` e `domain` já existem;
> `contracts` precisa existir antes das outras duas avançarem de verdade. Se a
> trilha 1 atrasar, as outras duas param — priorize desbloqueá-la sobre qualquer
> outra coisa.

## Painel

|                           |                                     |
| ------------------------- | ----------------------------------- |
| Total                     | 54 tarefas · 152 dias-desenvolvedor |
| ✅ Concluídas             | 4 (11 dias)                         |
| 🚧 Bloqueadas por decisão | 15 (51 dias)                        |
| Por trilha                | 🔵 17 · 🟠 24 · 🟢 12               |

---

## Sprint 0 — Fundação ✅

| ID     | Tarefa                                                                | Trilha | Módulo         | Est | Dep | Status |
| ------ | --------------------------------------------------------------------- | :----: | -------------- | --: | --- | :----: |
| NR-001 | Workspace pnpm + Turborepo, Docker Compose local, CI, hooks, ESLint   |   🟠   | `repo` `infra` |   3 | —   |   ✅   |
| NR-002 | Base de documentação: produto, arquitetura, engenharia, decisões      |   —    | `docs`         |   4 | —   |   ✅   |
| NR-003 | `packages/money` — centavos, `allocate` sem perda de resto, 21 testes |   🔵   | `money`        |   1 | —   |   ✅   |

## Sprint 1 — Núcleo mínimo

Objetivo: as três trilhas conseguem trabalhar em paralelo sem esperar uma à outra.

| ID     | Tarefa                                                                          | Trilha | Módulo       | Est | Dep    | Bloq                | US/RF                   | Status |
| ------ | ------------------------------------------------------------------------------- | :----: | ------------ | --: | ------ | ------------------- | ----------------------- | :----: |
| NR-004 | `domain`: cálculo de venda — custo, imposto, tarifa de cartão, parcelas         |   🔵   | `domain`     |   3 | NR-003 | —                   | RF-040, RF-041, RF-038  |   ✅   |
| NR-005 | `contracts`: schemas base (Company, Customer, Product, Sale)                    |   🔵   | `contracts`  |   2 | NR-003 | —                   | RNF-027                 |   ⬜   |
| NR-006 | Configuração tipada: validar variáveis de ambiente na inicialização             |   🟠   | `repo`       |   1 | NR-001 | —                   | —                       |   ⬜   |
| NR-007 | `db`: estratégia multi-tenant, RLS e teste de isolamento                        |   🔵   | `db`         |   3 | NR-005 | **DEC-002**         | RF-121, RF-122, RNF-021 |   🚧   |
| NR-008 | `db`: schema de cadastros (companies, users, customers, products)               |   🔵   | `db`         |   2 | NR-007 | DEC-002             | RF-001, RF-009, RF-017  |   🚧   |
| NR-009 | `api`: base — contexto de execução, erro padronizado, validação por `contracts` |   🟠   | `api`        |   2 | NR-005 | —                   | RNF-027, RNF-054        |   ⬜   |
| NR-010 | Qualidade: lint com type-checking e piso de cobertura na CI                     |   🟠   | `repo`       |   1 | NR-001 | —                   | RNF-068                 |   ⬜   |
| NR-011 | `ui`: tokens de design (cor, tipografia, espaçamento)                           |   🟢   | `ui`         |   2 | —      | **DEC-001**/QST-011 | RNF-055                 |   🚧   |
| NR-012 | `mobile`: shell de navegação e sessão                                           |   🟢   | `mobile`     |   3 | NR-011 | DEC-008             | US-059                  |   🚧   |
| NR-013 | `web`: shell de layout e sessão                                                 |   🟢   | `web`        |   2 | NR-011 | DEC-008             | US-059                  |   🚧   |
| NR-014 | Autenticação: login, papéis, usuário em várias empresas                         |   🟠   | `api` `core` |   4 | NR-009 | **DEC-008**         | RF-119, RF-120, RF-005  |   🚧   |
| NR-015 | `infra`: definir hospedagem e preencher os workflows de deploy                  |   🟠   | `infra`      |   3 | —      | **DEC-009**         | RNF-064, RNF-013        |   🚧   |

## Sprint 2 — Cadastros e venda

Objetivo: registrar uma venda de ponta a ponta pelo aplicativo.

| ID     | Tarefa                                                                      | Trilha | Módulo         | Est | Dep            | Bloq | US/RF                  | Status |
| ------ | --------------------------------------------------------------------------- | :----: | -------------- | --: | -------------- | ---- | ---------------------- | :----: |
| NR-020 | `db`: schema de vendas e financeiro                                         |   🔵   | `db`           |   3 | NR-008         | —    | RF-027–044, RF-063     |   ⬜   |
| NR-021 | `core`: casos de uso de cadastro (empresa, cliente, produto)                |   🔵   | `core`         |   3 | NR-008         | —    | RF-001–019             |   ⬜   |
| NR-022 | `core`: `registerSale` — transação única com estoque, recebível e auditoria |   🔵   | `core`         |   4 | NR-020, NR-004 | —    | RF-034–039, RNF-046    |   ⬜   |
| NR-023 | `core`: movimentação de estoque e ajuste com autoria                        |   🔵   | `core`         |   2 | NR-021         | —    | RF-022–024             |   ⬜   |
| NR-024 | `domain`: desconto, limite por papel, troco                                 |   🔵   | `domain`       |   2 | NR-004         | —    | RF-030, RF-031, RF-035 |   ⬜   |
| NR-025 | `core`: trilha de auditoria somente-inserção                                |   🔵   | `core`         |   2 | NR-020         | —    | RF-123, RF-124         |   ⬜   |
| NR-026 | `api`: rotas de cadastro                                                    |   🟠   | `api`          |   2 | NR-021, NR-009 | —    | RF-001–019             |   ⬜   |
| NR-027 | `api`: rota de venda com chave de idempotência                              |   🟠   | `api`          |   2 | NR-022         | —    | RF-036, RNF-043        |   ⬜   |
| NR-030 | `api`: observabilidade — `requestId`, log estruturado, rastreamento         |   🟠   | `api` `worker` |   2 | NR-009         | —    | RNF-058, RNF-059       |   ⬜   |
| NR-070 | `mobile`: cadastro de produto com leitor de código de barras                |   🟢   | `mobile`       |   3 | NR-026         | —    | US-009, RF-017         |   ⬜   |
| NR-071 | `mobile`: carrinho, seleção de cliente e fechamento de venda                |   🟢   | `mobile`       |   5 | NR-027         | —    | US-014–019             |   ⬜   |
| NR-072 | `web`: backoffice de cadastros                                              |   🟢   | `web`          |   3 | NR-026         | —    | E1, E2, E3             |   ⬜   |

## Sprint 3 — Fiscal e financeiro

Objetivo: emitir NFC-e e controlar contas a pagar e receber.

| ID     | Tarefa                                                                 | Trilha | Módulo            | Est | Dep    | Bloq             | US/RF                  | Status |
| ------ | ---------------------------------------------------------------------- | :----: | ----------------- | --: | ------ | ---------------- | ---------------------- | :----: |
| NR-028 | `core`: contas a pagar e a receber, com recorrência                    |   🔵   | `core`            |   3 | NR-020 | —                | RF-055–067             |   ⬜   |
| NR-029 | `core`: baixa, baixa parcial e estorno                                 |   🔵   | `core`            |   2 | NR-028 | —                | RF-059, RF-066, RF-067 |   ⬜   |
| NR-040 | `fiscal`: porta `InvoiceIssuer` + adapter falso                        |   🟠   | `fiscal` `core`   |   2 | NR-022 | —                | RF-045                 |   ⬜   |
| NR-041 | `worker`: consumidores de fila (emissão, mensagem, cobrança)           |   🟠   | `worker`          |   3 | NR-040 | —                | RNF-004, RF-130        |   ⬜   |
| NR-042 | `fiscal`: adapter real, contingência e guarda de XML                   |   🟠   | `fiscal`          |   5 | NR-040 | **DEC-004**      | RF-045–054             |   🚧   |
| NR-043 | `payments`: porta `PaymentGateway` + adapter falso                     |   🟠   | `payments` `core` |   2 | NR-022 | —                | RF-063                 |   ⬜   |
| NR-044 | `payments`: adapter PagMaxx — Pix, link de pagamento, webhook com HMAC |   🟠   | `payments`        |   4 | NR-043 | DEC-006, DEC-015 | RF-034, RF-068         |   🚧   |
| NR-073 | `mobile`: pagamento, resumo com líquido e margem                       |   🟢   | `mobile`          |   3 | NR-071 | —                | US-018–020             |   ⬜   |
| NR-074 | `web`: contas a pagar e a receber                                      |   🟢   | `web`             |   4 | NR-029 | —                | E6, E7                 |   ⬜   |

## Sprint 4 — WhatsApp e assinatura

Objetivo: operar o ERP por mensagem e cobrar a mensalidade.

| ID     | Tarefa                                                        | Trilha | Módulo            | Est | Dep            | Bloq        | US/RF                  | Status |
| ------ | ------------------------------------------------------------- | :----: | ----------------- | --: | -------------- | ----------- | ---------------------- | :----: |
| NR-031 | `core`: exportação completa e anonimização (LGPD)             |   🔵   | `core`            |   3 | NR-028         | —           | RF-125–128             |   ⬜   |
| NR-045 | `whatsapp`: porta `MessageSender` + adapter falso             |   🟠   | `whatsapp` `core` |   2 | NR-041         | —           | RF-015                 |   ⬜   |
| NR-046 | `whatsapp`: adapter real, webhook e consentimento             |   🟠   | `whatsapp`        |   4 | NR-045         | **DEC-003** | RF-016, RF-094, RF-095 |   🚧   |
| NR-060 | `agent`: runtime com tools geradas de `contracts`             |   🟠   | `agent`           |   5 | NR-046, NR-005 | **DEC-007** | RF-096–102             |   🚧   |
| NR-061 | `agent`: confirmação de ação sensível, com expiração          |   🟠   | `agent`           |   2 | NR-060         | —           | RF-103, RF-104         |   ⬜   |
| NR-062 | `agent`: contexto de conversa isolado por empresa             |   🟠   | `agent`           |   3 | NR-060         | **DEC-011** | RF-105, RF-106         |   🚧   |
| NR-063 | `billing`: assinatura, trial, inadimplência e estado restrito |   🟠   | `billing`         |   4 | NR-044         | **DEC-010** | RF-110–118             |   🚧   |
| NR-075 | `web`: planos, assinatura e cupom                             |   🟢   | `web`             |   3 | NR-063         | DEC-012     | E12                    |   🚧   |

## Sprint 5 — Bancos e relatórios

| ID     | Tarefa                                                         | Trilha | Módulo         | Est | Dep    | Bloq        | US/RF          | Status |
| ------ | -------------------------------------------------------------- | :----: | -------------- | --: | ------ | ----------- | -------------- | :----: |
| NR-032 | `core`: plano de contas, classificação e DRE simplificado      |   🔵   | `core`         |   4 | NR-028 | —           | RF-081–088     |   ⬜   |
| NR-033 | `core`: conciliação com sugestão por valor e data              |   🔵   | `core`         |   3 | NR-032 | —           | RF-078–080     |   ⬜   |
| NR-047 | `banking`: importação de OFX/CSV                               |   🟠   | `banking`      |   3 | NR-033 | —           | RF-076, RF-077 |   ⬜   |
| NR-048 | `banking`: Open Finance                                        |   🟠   | `banking`      |   4 | NR-047 | **DEC-005** | RF-074, RF-075 |   🚧   |
| NR-076 | `web`: conciliação bancária                                    |   🟢   | `web`          |   3 | NR-033 | —           | US-038         |   ⬜   |
| NR-077 | Relatórios: DRE, ranking e faturamento, no app e no assistente |   🟢   | `web` `mobile` |   4 | NR-032 | —           | US-041, US-053 |   ⬜   |

## Backlog

| ID     | Tarefa                                               | Trilha | Módulo   | Est | Bloq |
| ------ | ---------------------------------------------------- | :----: | -------- | --: | ---- |
| NR-034 | `core`: agenda e lembretes                           |   🔵   | `core`   |   2 | —    |
| NR-049 | E2E do caminho crítico (3 fluxos)                    |   🟠   | `repo`   |   3 | —    |
| NR-016 | `CHANGELOG` gerado dos commits + processo de release |   🟠   | `repo`   |   1 | —    |
| NR-078 | `mobile`: agenda                                     |   🟢   | `mobile` |   2 | —    |

---

## Caminho crítico

O que atrasa o MVP inteiro se atrasar:

```mermaid
flowchart LR
    N3["NR-003<br/>money ✅"] --> N4["NR-004<br/>domain ✅"]
    N3 --> N5["NR-005<br/>contracts"]
    N5 --> N7["NR-007<br/>db + RLS<br/>🚧 DEC-002"]
    N7 --> N8["NR-008<br/>cadastros"]
    N8 --> N20["NR-020<br/>vendas"]
    N4 --> N22
    N20 --> N22["NR-022<br/>registerSale"]
    N22 --> N27["NR-027<br/>rota de venda"]
    N27 --> N71["NR-071<br/>PDV mobile"]
    N22 --> N40["NR-040<br/>porta fiscal"]
    N40 --> N42["NR-042<br/>NFC-e<br/>🚧 DEC-004"]

    style N7 fill:#7c2d12,color:#fff
    style N42 fill:#7c2d12,color:#fff
    style N3 fill:#14532d,color:#fff
    style N4 fill:#14532d,color:#fff
```

**NR-007 é o nó mais crítico do projeto.** Ele bloqueia todo o schema, e está
travado por [DEC-002](../decisoes/README.md#dec-002). Enquanto essa decisão não
fechar, a trilha 1 só consegue avançar em `contracts` (NR-005) — cerca de 2 dias
de trabalho. `domain` (NR-004) já está feito. Depois disso ela para.

**Prazo real para DEC-002: 5 dias úteis a partir do início da Sprint 1.**

## Bloqueios por decisão

| Decisão                                                                           | Tarefas travadas       | Dias parados |
| --------------------------------------------------------------------------------- | ---------------------- | -----------: |
| [DEC-002](../decisoes/README.md#dec-002) multi-tenant                             | NR-007, NR-008         |            5 |
| [DEC-008](../decisoes/README.md#dec-008) autenticação                             | NR-012, NR-013, NR-014 |            9 |
| [DEC-009](../decisoes/README.md#dec-009) hospedagem                               | NR-015                 |            3 |
| [DEC-004](../decisoes/README.md#dec-004) fiscal                                   | NR-042                 |            5 |
| [DEC-003](../decisoes/README.md#dec-003) WhatsApp                                 | NR-046                 |            4 |
| [DEC-007](../decisoes/README.md#dec-007) LLM                                      | NR-060                 |            5 |
| [DEC-010](../decisoes/README.md#dec-010) cobrança                                 | NR-063                 |            4 |
| [DEC-006](../decisoes/README.md#dec-006)/[015](../decisoes/README.md#dec-015) PSP | NR-044                 |            4 |
| [DEC-005](../decisoes/README.md#dec-005) Open Finance                             | NR-048                 |            4 |
| [DEC-001](../decisoes/README.md#dec-001) nome/marca                               | NR-011                 |            2 |

**51 dos 152 dias-desenvolvedor estão bloqueados por 10 decisões** — 34% do
backlog. Decidir é, hoje, a atividade de maior retorno do projeto, mais do que
escrever código.

## Carga por trilha

| Trilha                          | Tarefas | Dias | Observação                                        |
| ------------------------------- | ------: | ---: | ------------------------------------------------- |
| 🔵 1 — Núcleo & Dados           |      17 |   44 | é o gargalo inicial: as outras duas dependem dela |
| 🟠 2 — Plataforma & Integrações |      24 |   67 | a mais carregada e a mais bloqueada (7 decisões)  |
| 🟢 3 — Clientes                 |      12 |   37 | ociosa na Sprint 1 se DEC-001 não fechar          |
| Compartilhadas                  |       2 |    4 | documentação e release                            |

Somando: **152 dias-desenvolvedor**. Com 3 pessoas, isso é cerca de
10 semanas de trabalho — desde que nada fique bloqueado, o que não é
o caso hoje.

A trilha 3 fica ociosa na Sprint 1 se `ui` estiver bloqueado por
[DEC-001](../decisoes/README.md#dec-001). Mitigação: começar `ui` com paleta
provisória e trocar os tokens quando a marca fechar — tokens existem exatamente
para isso.

## Convenções

| Regra                                           | Motivo                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| Tarefa acima de 2 dias é quebrada               | estimativa grande é estimativa errada                    |
| Toda tarefa tem `US-xxx` ou `RF-xxx`            | trabalho sem requisito é trabalho sem critério de pronto |
| Tarefa bloqueada referencia a `DEC-xxx`         | e a `DEC` referencia a tarefa de volta                   |
| ID nunca é reaproveitado                        | tarefa cancelada fica como cancelada; o número queima    |
| Este arquivo é atualizado **no PR**, não depois | ledger desatualizado é pior que ledger nenhum            |

## Documentos relacionados

- [`monday-import.csv`](monday-import.csv) — o mesmo ledger, para importar
- [Rituais](rituais.md) — DoR, DoD, cerimônias
- [Fluxo de trabalho](../engenharia/fluxo-de-trabalho.md) — o ciclo de uma tarefa
- [Decisões](../decisoes/README.md) — o que está bloqueando
