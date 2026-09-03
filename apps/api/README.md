# api

Fastify — REST, webhooks e runtime do agente.

**Estado:** 🟡 base pronta (contexto, erro padronizado, validação,
observabilidade); sem rotas de negócio · `NR-014`, `NR-026`, `NR-027`

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

## Formato de erro

Um envelope só, para todo erro — cliente que trata um trata todos:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Confira os campos indicados e tente de novo.",
    "fields": [{ "path": "items.0.quantity", "message": "Quantidade minima e 1." }]
  },
  "requestId": "req-42"
}
```

| `code`              | Status | Quando                                                      |
| ------------------- | -----: | ----------------------------------------------------------- |
| `VALIDATION_FAILED` |    400 | entrada não passou no schema de `contracts`                 |
| `UNAUTHORIZED`      |    401 | sem credencial ou credencial inválida                       |
| `FORBIDDEN`         |    403 | papel não permite — **nunca** para recurso de outra empresa |
| `NOT_FOUND`         |    404 | não existe, ou é de outra empresa                           |
| `CONFLICT`          |    409 | conflita com o estado atual                                 |
| `RATE_LIMITED`      |    429 | limite estourado                                            |
| `INTERNAL`          |    500 | inesperado — mensagem genérica                              |

`fields` só vem preenchido em `VALIDATION_FAILED`; nos demais é `[]`.

**Erro inesperado nunca vaza detalhe.** O 500 responde texto genérico e o erro
real vai para o log. `requestId` correlaciona os dois — é o que o suporte pede
em vez de "deu erro".

## Contexto de execução

`buildExecutionContext` monta `(empresa, usuário, papel, canal, requestId,
idempotencyKey, now)` a partir do principal autenticado. É função pura, então
testa sem servidor.

**`companyId` vem do principal, nunca do corpo** — [princípio 8](../../docs/arquitetura/principios.md).
Quem resolve o principal é a autenticação (`NR-014`); até ela existir,
`requireContext` responde 401, que é melhor que inventar um contexto.

A DEC-008 fechou pela
[ADR-0002](../../docs/decisoes/adr/0002-autenticacao-identidade-propria.md): o
papel e a sessão são **nossos**, e o provedor externo só prova identidade, por
trás da porta `IdentityProvider`. Consequência para este app: o principal sai
de `company_users`, e não de um _claim_ de token de terceiro — trocar de
provedor não toca em rota nenhuma.

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

Log estruturado em JSON — [RNF-058](../../docs/produto/requisitos-nao-funcionais.md).

**`requestId`** vem do cabeçalho `x-request-id` quando o chamador manda um, e é
gerado quando não manda. Volta sempre na resposta, no mesmo cabeçalho — é o que
o suporte pede em vez de "deu erro".

O id que chega de fora é **sanitizado**: no máximo 64 caracteres, sem espaço
nem quebra de linha. Aceitar o valor cru deixaria qualquer cliente escrever no
nosso log, e uma quebra de linha forja uma entrada inteira.

**`companyId` e `userId`** entram no logger da requisição em `preHandler`,
depois que a autenticação resolve o principal. Enquanto `NR-014` não existe,
nada popula `request.principal` e o bind não acontece — log sem `companyId` é
melhor que log com um `companyId` inventado.

### O que nunca entra no log

O Fastify não serializa cabeçalho nem corpo por padrão: registra só
`method`, `url`, `host` e `remoteAddress`. Essa é a primeira barreira, e é a
que de fato impede o `Authorization` de vazar.

A segunda é a lista de `redact` do pino, para quando algum log passar um
objeto adiante: senha, token, CPF, CNPJ, e-mail e telefone viram `[oculto]` —
[RNF-034](../../docs/produto/requisitos-nao-funcionais.md).

### Chamada a provedor externo

`withExternalCallLogging` mede a duração e, na falha, registra requisição e
resposta **mascaradas** — [RNF-059](../../docs/produto/requisitos-nao-funcionais.md).
Quando a integração quebra, a pergunta é sempre a mesma: o que mandamos, o que
voltou, quanto demorou.

O mascaramento decide pelo **nome da chave**, não pelo formato do valor: um CPF
sem pontuação é indistinguível de um número de pedido.

```ts
const cobranca = await withExternalCallLogging(request.log, {
  operation: 'pagmaxx.criarCobranca',
  request: entrada,
  run: () => gateway.criar(entrada),
})
```

> Hoje vive em `apps/api`. Quando o primeiro adapter existir, ele também vai
> precisar — e aí o mascaramento se muda para um pacote compartilhado, em vez
> de ser copiado.

## Variáveis de ambiente

`API_PORT`, `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` e as dos
adapters. Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).

## Desenvolvimento

```bash
pnpm infra:up
pnpm --filter @na-regua/api dev
```
