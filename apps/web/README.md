# web

Next.js — backoffice, catálogo público e landing.

**Estado:** 🟡 scaffold do Next.js · `NR-013`, `NR-072`, `NR-074`, `NR-075`, `NR-076`

## Responsabilidade

O que é melhor em tela grande: relatórios, conciliação bancária, cadastros em
lote, gestão de assinatura. Mais o catálogo público e a landing.

**O que não faz:** regra de negócio. Fala com a API por HTTP.

## Fronteiras

|                       |                                             |
| --------------------- | ------------------------------------------- |
| **Depende de**        | `ui`, `contracts`, `money` + a API por HTTP |
| **Proibido importar** | `core`, `db`, `domain`                      |

## Superfícies

| Superfície               | Público           | Autenticação |
| ------------------------ | ----------------- | ------------ |
| Backoffice               | lojista, contador | ✅           |
| Catálogo público da loja | cliente final     | ❌           |
| Landing                  | visitante         | ❌           |

O catálogo é público e por empresa: cuidado redobrado para não vazar dado de
outra loja nem informação interna (custo, margem, estoque exato).

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
