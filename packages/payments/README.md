# payments

Adapter de PSP — o dinheiro do **lojista**.

**Estado:** 🔴 não implementado · Asaas escolhida
([ADR-0007](../../docs/decisoes/adr/0007-asaas.md),
[ADR-0008](../../docs/decisoes/adr/0008-subconta-asaas-nao-baas.md)) ·
`NR-043`, `NR-044`

## Responsabilidade

Gerar cobrança Pix, boleto, link de pagamento e cartão online, estornar, e
manter a tabela de tarifas atualizada.

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

**Provedor: Asaas.** Contrato em
[`integracoes/asaas.md`](../../docs/arquitetura/integracoes/asaas.md).
Subconta não-BaaS por lojista: [ADR-0008](../../docs/decisoes/adr/0008-subconta-asaas-nao-baas.md).
Split: [DEC-018](../../docs/decisoes/README.md#dec-018) — a porta pode aceitar
`split` opcional; o adapter real só envia o array quando a DEC fechar.

**Cobre:** Pix, boleto, link de pagamento, cartão online, estorno, webhooks.

**Não cobre:** captura presencial. Dinheiro e maquininha só registram. Documentos
de KYC pela API (isso é BaaS).

## Três armadilhas conhecidas

1. **Dinheiro vem como decimal** — `value` / `netValue` como `129.9`. A
   conversão acontece **na borda deste pacote**, com `Money.parse`, nunca com
   `parseFloat` seguido de aritmética.
2. **Não chamar simulação no fechamento da venda** — `GET /v3/myAccount/fees/`
   na subconta alimenta a `CardFeeTable` de [`domain`](../domain/README.md)
   periodicamente. `POST /v3/payments/simulate` fica fora do caminho crítico.
3. **Liquidação não é um único evento** — Pix liquida em `PAYMENT_RECEIVED`;
   boleto e cartão liquidam a venda em `PAYMENT_CONFIRMED`. `PAYMENT_RECEIVED`
   em boleto/cartão é crédito na conta Asaas (D+), não o sinal para baixar a
   venda.

## Webhook

Valide o header `asaas-access-token` contra o `authToken` cadastrado (32–255
caracteres, **não** é a API Key), antes de qualquer processamento. Idempotência:
`id` do evento (`evt_…`). Responda 200 rápido e processe na fila
`webhook-process`. Após 15 falhas consecutivas o Asaas pausa a fila.

## Modo falso

`PAYMENTS_PROVIDER=fake` responde de forma determinística, sem rede. Isso permite
que o sistema suba local sem credencial nenhuma.

**O adapter falso implementa a mesma porta, inclusive os caminhos de erro.**
Falso que só devolve sucesso esconde exatamente o que precisa ser testado.

## Testes

| Camada                     | Onde roda                                      |
| -------------------------- | ---------------------------------------------- |
| Contrato da porta          | CI — falso e real satisfazem a **mesma** suíte |
| Contra sandbox do provedor | manual ou agendado, fora do PR                 |
| Corpo de webhook gravado   | CI — inclusive os casos estranhos documentados |

## Variáveis de ambiente

`PAYMENTS_PROVIDER`, `ASAAS_BASE_URL`, `ASAAS_API_KEY` (conta-pai; a chave da
subconta vai ao cofre), `ASAAS_USER_AGENT`, `ASAAS_WEBHOOK_AUTH_TOKEN`.
`ASAAS_WALLET_ID` só se [DEC-018](../../docs/decisoes/README.md#dec-018)
escolher Split.

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
