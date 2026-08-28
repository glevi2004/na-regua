# payments

Adapter de PSP — o dinheiro do **lojista**.

**Estado:** 🔴 não implementado · 🚧 [DEC-006](../../docs/decisoes/README.md#dec-006) e [DEC-015](../../docs/decisoes/README.md#dec-015) · `NR-043`, `NR-044`

## Responsabilidade

Gerar cobrança Pix, criar link de pagamento, estornar, e manter a tabela de
tarifas atualizada.

**O que não faz:** decidir regra de negócio. O adapter traduz entre a porta e o
provedor — nada mais.

## Fronteiras

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| **Implementa**        | `PaymentGateway`, declarada por [`core`](../core/README.md) |
| **Depende de**        | `contracts`, `money`                                        |
| **Proibido importar** | `core`, `db`, `domain` — a seta aponta para dentro          |
| **Quem depende**      | a raiz de composição de `api` e `worker`                    |

A proibição de importar `core` é verificada na CI pela regra
`adapter-nao-importa-core`. Adapter que conhece `core` não é substituível — e
substituibilidade é a única razão de ele existir.

## Candidato: PagMaxx

Avaliação completa em
[`integracoes/pagmaxx.md`](../../docs/arquitetura/integracoes/pagmaxx.md).

**Cobre:** Pix, link de pagamento, cartão online, tokenização, 3DS, estorno,
simulação de taxa e webhooks bem projetados (HMAC-SHA256 sobre corpo bruto, id
de evento para idempotência, reentrega 5×).

**Não cobre:** captura presencial. O cartão do balcão continua na maquininha da
lojista; o sistema registra a venda e calcula a tarifa por tabela configurada.

## Três armadilhas conhecidas

1. **Dinheiro vem como decimal** — `100.50`, `"100.00"` e `129.9` na mesma API.
   A conversão acontece **na borda deste pacote**, com `Money.parse`, nunca com
   `parseFloat` seguido de aritmética.
2. **A resposta de `simulate-fee` não tem contrato estável** — é repassada da
   adquirente. Não chame no fechamento da venda: alimente a `CardFeeTable` de
   [`domain`](../domain/README.md) periodicamente.
3. **`payment.approved` nunca é disparado** — quem confirma pagamento é
   `payment.authorized`. E `type` pode vir nulo; nesse caso ignore o evento.

## Webhook

Valide o HMAC sobre o **corpo bruto**, antes de qualquer `JSON.parse` —
reserializar muda os bytes e a verificação falha. Responda 200 rápido e
processe na fila `webhook-process`.

## Modo falso

`PAYMENTS_PROVIDER=fake` responde de forma determinística, sem rede. Isso permite
que o sistema suba local sem credencial nenhuma e que o trabalho não espere a
decisão do fornecedor.

**O adapter falso implementa a mesma porta, inclusive os caminhos de erro.**
Falso que só devolve sucesso esconde exatamente o que precisa ser testado.

## Testes

| Camada                     | Onde roda                                      |
| -------------------------- | ---------------------------------------------- |
| Contrato da porta          | CI — falso e real satisfazem a **mesma** suíte |
| Contra sandbox do provedor | manual ou agendado, fora do PR                 |
| Corpo de webhook gravado   | CI — inclusive os casos estranhos documentados |

## Variáveis de ambiente

`PAYMENTS_PROVIDER`, `PAGMAXX_BASE_URL`, `PAGMAXX_API_KEY`,
`PAGMAXX_ACCOUNT_EMAIL`, `PAGMAXX_ACCOUNT_PASSWORD`, `PAGMAXX_WEBHOOK_SECRET`.

⚠️ `PAGMAXX_ACCOUNT_PASSWORD` é **senha de conta**, não chave com escopo
restrito — a API exige isso para Pix, links e assinaturas
([QST-009](../../docs/decisoes/README.md#qst-009)).

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
