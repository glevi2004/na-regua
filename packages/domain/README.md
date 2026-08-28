# domain

Regras de negócio puras.

**Estado:** 🟡 NR-004 implementado · 31 testes · NR-024 pendente (desconto, limite por papel, troco)

## Responsabilidade

Precificação, imposto, tarifa de cartão, parcelamento, margem, desconto, limite
por papel.

Entra dado, sai dado. **Sem I/O, sem framework, sem relógio, sem
aleatoriedade.**

```ts
export function calculateSaleTotals(
  items: SaleItemInput[],
  payments: PaymentInput[],
  taxRules: TaxRules,
  cardFees: CardFeeTable,
  at: Date, // injetado — nunca `new Date()` aqui dentro
): SaleTotals

export function calculateInstallmentPlan(
  payment: PaymentInput,
  cardFees: CardFeeTable,
  at: Date,
): InstallmentPlan
```

**O que não faz:** ler banco, chamar API, orquestrar caso de uso, decidir
autorização. Isso é `core`. Também **não** chama Focus (NFC-e) nem PagMaxx no
fechamento: a nota é assíncrona (NR-042) e a tarifa vem de tabela local
(NR-044 alimenta a tabela depois; aqui só consulta).

## Fronteiras

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| **Expõe**             | funções puras de cálculo e os tipos que elas usam           |
| **Depende de**        | `money` — e só                                              |
| **Proibido importar** | `db`, `core`, `contracts`, adapters, qualquer coisa com I/O |
| **Quem depende**      | `core`                                                      |

A proibição é verificada na CI pela regra `domain-sem-io`
([`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)).

## Por que puro

Não é purismo: é o que permite testar a regra de tarifa de cartão em 200 casos
em menos de um segundo. Regra que toca banco não é testável em milissegundos —
e o que não é barato de testar deixa de ser testado.

E é o que sustenta [RF-101](../../docs/produto/requisitos-funcionais.md): quando
o assistente responde um valor pelo WhatsApp, esse número veio daqui, calculado
por código determinístico e testado. **O LLM interpreta linguagem; nunca decide
dinheiro.**

## API — NR-004

### Fórmulas (D1–D10)

| Campo           | Fórmula                                                         |
| --------------- | --------------------------------------------------------------- |
| `grossAmount`   | soma de `unitPrice * quantity`                                  |
| `costAmount`    | soma de `unitCost * quantity`                                   |
| `taxAmount`     | aliquota sobre o **bruto de cada item** (D2)                    |
| `cardFeeAmount` | tarifa de `debit`/`credit`; `cash`, `pix`, `wallet` = zero (D9) |
| `netAmount`     | bruto − imposto − tarifa                                        |
| `marginAmount`  | líquido − custo (D1)                                            |
| `marginRate`    | `marginAmount / grossAmount * 100` (quatro casas, truncado)     |

Aliquota do item: `item.taxRate` → taxa do produto em `TaxRules` → `defaultRate`
do regime (D3). Os três regimes do glossário usam a mesma interface; não há
lógica fiscal complexa no MVP (D4).

Parcelas de `credit` (RF-038): `Money.allocate` (resto nas primeiras — RNF-045),
tarifa **sobre o bruto de cada parcela** (D8), `netAmount` da parcela é o
recebível (D7). Vencimento: `at + N * settlementDays` em UTC, padrão 30 dias
(D6). Máximo 21x (PagMaxx).

Bandeira ausente no balcão: entrada `unknown` ou a **pior** taxa daquele
número de parcelas (D5). Persistência/UI da tabela é de `core`/web (D10).

### Conceitos

| Conceito            | O quê                                                 | Requisitos     |
| ------------------- | ----------------------------------------------------- | -------------- |
| `SaleTotals`        | bruto, custo, imposto, tarifa, líquido, margem        | RF-040         |
| `TaxRules`          | alíquota por regime tributário e por produto          | RF-003, RF-041 |
| `CardFeeTable`      | tarifa por bandeira e número de parcelas              | RF-007, RF-038 |
| `InstallmentPlan`   | parcelas, vencimentos e valor líquido de cada uma     | RF-038, RF-039 |
| `DiscountPolicy`    | desconto em valor ou percentual, com limite por papel | RF-030, RF-031 |
| `ChangeCalculation` | troco em pagamento em dinheiro                        | RF-035         |

`DiscountPolicy` e `ChangeCalculation` ficam para a [NR-024](../../docs/processo/task-ledger.md).

### A tabela de tarifas não vem da API em tempo de venda

`CardFeeTable` é **dado configurado**, atualizado periodicamente. Não se chama
`simulate-fee` no fechamento da venda, por três motivos:

1. [RNF-003](../../docs/produto/requisitos-nao-funcionais.md) — a venda fecha em ≤ 1,5 s; chamada externa no caminho crítico é risco
2. [RNF-041](../../docs/produto/requisitos-nao-funcionais.md) — o cálculo tem que ser auditável, e não se audita resposta de terceiro cujo formato varia
3. No balcão não temos o número do cartão, que a API exige para identificar a bandeira

Detalhes em [`integracoes/pagmaxx.md`](../../docs/arquitetura/integracoes/pagmaxx.md#2-a-resposta-de-simulate-fee-não-tem-contrato-estável).

## Testes

```bash
pnpm --filter @na-regua/domain test
```

Unidade e **propriedade**, sem banco e sem rede. Cobertura mínima: **90%**.

Onde há dinheiro, prefira invariante a exemplo: "a soma das parcelas é sempre o
total" prova mais que três casos escolhidos.

## Variáveis de ambiente

Nenhuma — por construção. Se `domain` precisar de configuração, ela entra por
parâmetro.
