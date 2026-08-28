# api

Fastify — REST, webhooks e runtime do agente.

**Estado:** 🟡 sobe com `/health` real; sem rotas de negócio · `NR-009`, `NR-014`,
`NR-026`, `NR-027`, `NR-030`

## Responsabilidade

Ser a porta de entrada única: autenticar, montar o contexto de execução, validar
a entrada e **chamar o caso de uso**.

**O que não faz:** decidir regra de negócio. Um handler faz exatamente três
coisas.

```ts
app.post('/v1/sales', async (req, reply) => {
  const input = CreateSaleInput.parse(req.body) // contracts
  const ctx = buildContext(req) // quem, qual empresa, qual canal
  const sale = await registerSale(deps, ctx, input) // core decide tudo
  return reply.code(201).send(sale)
})
```

Se um handler tem `if` de regra de negócio, a regra está no lugar errado — e o
canal WhatsApp deixou de aplicá-la.

## Fronteiras

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| **Depende de**        | `core`, `contracts`, `money`                              |
| **Composição apenas** | `db` e os adapters, **só** em `src/composition.ts`        |
| **Proibido**          | importar `domain`; importar `db` fora de `composition.ts` |

A regra `handler-nao-importa-db` da CI barra a violação. Foi verificada com um
arquivo que a viola de propósito.

## Estrutura

```
src/
├── index.ts          servidor, sinais de encerramento
├── composition.ts    RAIZ DE COMPOSICAO — o unico lugar que vê db e adapters
├── routes/           handlers por recurso
├── webhooks/         entrada de provedores externos
├── plugins/          autenticação, contexto, tratamento de erro
└── agent/            entrada do runtime do assistente
```

## Health check

```bash
curl -s localhost:3333/health | jq
```

```json
{
  "status": "ok",
  "uptimeSeconds": 8,
  "checks": {
    "database": { "ok": true, "latencyMs": 24, "version": "PostgreSQL 17.11" },
    "redis": { "ok": true, "latencyMs": 11 }
  }
}
```

| Rota           | O quê                                                            |
| -------------- | ---------------------------------------------------------------- |
| `/health`      | dependências de verdade; responde **503** se qualquer uma falhar |
| `/health/live` | só o processo; não toca em dependência externa                   |

`/health` responder 200 sempre não serve para nada.

## Webhooks

| Regra                                                        | Requisito                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| Verificar assinatura sobre o **corpo bruto**, antes do parse | [RNF-028](../../docs/produto/requisitos-nao-funcionais.md) |
| Responder 200 rápido e processar na fila                     | evita reentrega por timeout                                |
| Descartar entrega repetida pelo id do evento                 | [RNF-043](../../docs/produto/requisitos-nao-funcionais.md) |
| Nunca confiar no corpo sem assinatura válida                 | webhook forjado = estado inconsistente                     |

Reserializar o corpo antes de validar muda os bytes e a verificação falha —
use um parser que preserve o corpo bruto.

## Segurança

| Controle                                        | Requisito                                                  |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Toda entrada validada por schema de `contracts` | [RNF-027](../../docs/produto/requisitos-nao-funcionais.md) |
| **Nenhuma rota aceita `companyId`** do cliente  | [princípio 8](../../docs/arquitetura/principios.md)        |
| Limite de requisições em autenticação e escrita | [RNF-026](../../docs/produto/requisitos-nao-funcionais.md) |
| Falha de login não revela se o usuário existe   | [RF-120](../../docs/produto/requisitos-funcionais.md)      |
| Erro nunca expõe stack, SQL ou dado interno     | [RNF-054](../../docs/produto/requisitos-nao-funcionais.md) |
| Recurso de outra empresa responde 404, não 403  | 403 confirma que existe                                    |

## Observabilidade

Log estruturado em JSON com `requestId`, `companyId` e `userId` em toda
requisição — [RNF-058](../../docs/produto/requisitos-nao-funcionais.md). Hoje só
o nível básico existe; o contexto completo entra com `NR-030`.

## Variáveis de ambiente

`API_PORT`, `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` e as dos
adapters. Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).

## Desenvolvimento

```bash
pnpm infra:up
pnpm --filter @na-regua/api dev
```
