---
adr: 0004
titulo: Um usuário pertence a exatamente uma empresa
status: aceita
data: 2026-09-02
decisores:
  - Produto
substitui: null
substituida_por: null
---

# ADR-0004 — Um usuário pertence a exatamente uma empresa

|                       |                                 |
| --------------------- | ------------------------------- |
| **Status**            | Aceita                          |
| **Data**              | 2026-09-02                      |
| **Decisores**         | Produto                         |
| **Decisão de origem** | [DEC-016](../README.md#dec-016) |

## Contexto

O modelo inicial copiava SaaS de escritório: `users ↔ company_users ↔ companies`,
empresa ativa no login, papel `accountant` em várias lojas. Isso inflava schema,
auth, RLS de sessão e o seletor de empresa nos wireframes. O produto real é um
lojista com **uma** empresa. O web não tem convite de funcionário nem troca de
tenant.

Staff (balcão) entra **depois**, sempre na mesma empresa: outro `User` com o
mesmo `company_id` e `role=staff`. Ninguém pertence a duas empresas.

O isolamento **entre lojas** continua RLS por `company_id`
([ADR-0001](0001-rls-por-linha.md)). Esta ADR só corta o many-to-many pessoa–
empresa.

## Opções consideradas

### Opção A — `users.company_id` obrigatório, único por usuário

| Prós                   | Contras                                     |
| ---------------------- | ------------------------------------------- |
| Sem pivot, sem seletor | Contador não entra no tenant (exportação)   |
| Casa com o web         | Staff exige novo usuário, não “trocar loja” |

### Opção B — Manter `company_users` many-to-many

| Prós                | Contras                                   |
| ------------------- | ----------------------------------------- |
| Sócio em duas lojas | Complexidade que o produto não pede agora |

### Opção C — Só o dono, jamais staff

| Prós               | Contras                              |
| ------------------ | ------------------------------------ |
| Ainda mais simples | Fecha a porta do balcão sem ADR nova |

## Decisão

**Escolhemos a opção A.** Staff é roadmap na mesma empresa. `accountant` como
usuário do sistema fica fora; o lojista exporta. `platform_admin` não é tenant.

O que foi abdicado: um login atender várias lojas. Quem tiver dois CNPJs terá
duas contas.

## Consequências

### Positivas

- `ExecutionContext.companyId` sai do usuário autenticado, sem escolha
- Convite de staff (US-003) deixa de ser MUST

### Negativas

- Migrar para multi-empresa depois exige tabela de vínculo e sessão

### Neutras

- Papéis no código: `owner`, `staff` (futuro), `platform_admin`
- `accountant` sai do enum de acesso do produto

## Impacto na documentação

- [x] `docs/arquitetura/dados.md`, `seguranca.md`
- [x] `packages/contracts` (roles)
- [x] NR-014 no ledger
- [x] `DEC-016` 🟢; [DEC-008](../README.md#dec-008) recortada (só provedor de auth)

## Quando revisitar

- Demanda real de um usuário em duas empresas (contador, rede)
- Staff em produção com necessidade de um mesmo funcionário em duas lojas
