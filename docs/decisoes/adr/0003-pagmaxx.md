---
adr: 0003
titulo: PagMaxx como PSP das vendas e da assinatura SaaS
status: substituida
data: 2026-09-02
decisores:
  - Produto
  - Trilha 2 — Plataforma & Integrações
substitui: null
substituida_por: 0007
---

# ADR-0003 — PagMaxx como PSP das vendas e da assinatura SaaS

|                       |                                                                  |
| --------------------- | ---------------------------------------------------------------- |
| **Status**            | Substituída por [ADR-0007](0007-asaas.md)                        |
| **Data**              | 2026-09-02                                                       |
| **Decisores**         | Produto + Trilha 2                                               |
| **Decisão de origem** | [DEC-006](../README.md#dec-006), [DEC-010](../README.md#dec-010) |

## Contexto

Havia dois problemas de cobrança: o dinheiro do lojista (venda, Pix, link) e a
nossa mensalidade. Candidatos distintos aumentariam operação e contrato. A
PagMaxx cobre Pix, link de pagamento, cartão _card-not-present_, tokenização,
3DS, estorno, webhooks e `/subscriptions/*`.

Não há API de maquininha/TEF. Venda presencial em cartão, se existir, só é
**registrada**. Dinheiro em espécie também só é registrado.

## Opções consideradas

### Opção A — PagMaxx para vendas online e para SaaS

Um fornecedor, dois adapters (`payments` e `billing`).

| Prós                                          | Contras                                           |
| --------------------------------------------- | ------------------------------------------------- |
| Um contrato, um sandbox, um padrão de webhook | Autenticação JWT com e-mail/senha em várias rotas |
| `/subscriptions/*` cobre o épico de plano     | Sem captura presencial                            |

### Opção B — PSP nas vendas e outro provedor na mensalidade

| Prós                            | Contras                     |
| ------------------------------- | --------------------------- |
| Falha de um não derruba o outro | Dois KYC, duas conciliações |

### Opção C — Só registrar pagamento, sem processar

| Prós    | Contras                                           |
| ------- | ------------------------------------------------- |
| Sem PCI | Não há Pix/link que dê baixa sozinho — fura o CRM |

## Decisão

**Escolhemos a opção A.** Vendas cobradas pelo sistema passam pela PagMaxx
(Pix, link, cartão online). Assinatura da plataforma também. Dinheiro e
maquininha, se o lojista usar, são lançamentos locais.

O que foi abdicado: um segundo fornecedor de billing e a pretensão de TEF no
MVP. `payments` e `billing` continuam pacotes separados: são dois problemas de
negócio; o fornecedor hoje é o mesmo.

Contrato send/receive: [`integracoes/pagmaxx.md`](../../arquitetura/integracoes/pagmaxx.md).
Modelo de conta no PSP: [ADR-0006](0006-conta-pagmaxx-por-lojista.md).

## Consequências

### Positivas

- Um desenho de webhook, HMAC e `external_reference`
- `simulate-fee` alimenta tabela de tarifa **fora** do fechamento da venda

### Negativas

- Converter decimal da API para `Money` na borda, sempre
- Guardar senha de conta PagMaxx até [QST-009](../README.md#qst-009) resolver
  escopo da API Key

### Neutras

- Adapters falsos (`PAYMENTS_PROVIDER=fake`, `BILLING_PROVIDER=fake`) seguem
  obrigatórios no local

## Impacto na documentação

- [x] `docs/arquitetura/integracoes/pagmaxx.md`
- [x] `packages/payments/README.md`, `packages/billing/README.md`
- [x] `DEC-006` e `DEC-010` marcadas como 🟢 (regras de trial/preço de produto
      em [DEC-010](../README.md#dec-010) ainda têm perguntas de preço — o
      **provedor** está fechado)

## Quando revisitar

- PagMaxx entregar captura presencial (mudaria o PDV)
- QST-009 recusar API Key para Pix/assinatura de forma permanente
- Custo ou estabilidade inviáveis
