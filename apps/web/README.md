# web

Next.js — backoffice das jornadas A–J e landing.

**Estado:** 🟡 scaffold do Next.js com telas de referência do recorte · `NR-013`,
`NR-072`, `NR-074`, `NR-075`, `NR-077`, `NR-082`

O menu em [`AppShell.tsx`](src/components/app/AppShell.tsx) é a fonte de verdade
de tela: painel, vendas, clientes, produtos, financeiro (plano / a pagar / a
receber), CRM, agenda, empresa, assistente, assinatura, suporte.

## Responsabilidade

O que é melhor em tela grande: cadastros, financeiro, CRM, empresa (Focus),
assinatura, chamados e painel. Landing do produto.

**O que não faz:** regra de negócio; catálogo público / marketplace (roadmap);
módulo Bancos / Open Finance (adiado). Fala com a API por HTTP.

## Fronteiras

|                       |                                             |
| --------------------- | ------------------------------------------- |
| **Depende de**        | `ui`, `contracts`, `money` + a API por HTTP |
| **Proibido importar** | `core`, `db`, `domain`                      |

## Superfícies

| Superfície | Público           | Autenticação |
| ---------- | ----------------- | ------------ |
| Backoffice | lojista (`owner`) | ✅           |
| Landing    | visitante         | ❌           |

Um usuário vê uma empresa. Sem seletor de tenant. Staff entra depois, na mesma
empresa ([ADR-0004](../../docs/decisoes/adr/0004-usuario-uma-empresa.md)).

## Pacotes internos precisam de transpilação

Os pacotes do workspace exportam TypeScript direto de `src/` (padrão _internal
packages_), então o `next.config.ts` declara:

```ts
transpilePackages: ['@na-regua/ui', '@na-regua/contracts', '@na-regua/money']
```

Sem isso o build quebra. O ganho: não existe passo de build entre editar um
pacote e ver a mudança no aplicativo.

## Tipos de rota

O Next 16 gera `LayoutProps` e `PageProps` em `.next/types`. Num checkout limpo
esses tipos não existem ainda, e `tsc --noEmit` falha. Por isso o script de
typecheck roda `next typegen` antes:

```json
"typecheck": "next typegen && tsc --noEmit"
```

## Variáveis de ambiente

`API_URL`, `WEB_PORT`. Nada com prefixo público pode conter segredo.

## Desenvolvimento

```bash
pnpm --filter @na-regua/web dev    # http://localhost:3000
```
