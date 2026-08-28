# domain

Regras de negócio puras.

**Estado:** 🔴 não implementado · `NR-004`, `NR-024`

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
```

**O que não faz:** ler banco, chamar API, orquestrar caso de uso, decidir
autorização. Isso é `core`.

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

## Conceitos a implementar

| Conceito            | O quê                                                 | Requisitos     |
| ------------------- | ----------------------------------------------------- | -------------- |
| `SaleTotals`        | bruto, custo, imposto, tarifa, líquido, margem        | RF-040         |
| `TaxRules`          | alíquota por regime tributário e por produto          | RF-003, RF-041 |
| `CardFeeTable`      | tarifa por bandeira e número de parcelas              | RF-007, RF-038 |
| `DiscountPolicy`    | desconto em valor ou percentual, com limite por papel | RF-030, RF-031 |
| `InstallmentPlan`   | parcelas, vencimentos e valor líquido de cada uma     | RF-038, RF-039 |
| `ChangeCalculation` | troco em pagamento em dinheiro                        | RF-035         |

### A tabela de tarifas não vem da API em tempo de venda

`CardFeeTable` é **dado configurado**, atualizado periodicamente. Não se chama
`simulate-fee` no fechamento da venda, por três motivos:

1. [RNF-003](../../docs/produto/requisitos-nao-funcionais.md) — a venda fecha em ≤ 1,5 s; chamada externa no caminho crítico é risco
2. [RNF-041](../../docs/produto/requisitos-nao-funcionais.md) — o cálculo tem que ser auditável, e não se audita resposta de terceiro cujo formato varia
3. No balcão não temos o número do cartão, que a API exige para identificar a bandeira

Detalhes em [`integracoes/pagmaxx.md`](../../docs/arquitetura/integracoes/pagmaxx.md#2-a-resposta-de-simulate-fee-não-tem-contrato-estável).

## Testes

Unidade e **propriedade**, sem banco e sem rede. Cobertura mínima: **90%**.

Onde há dinheiro, prefira invariante a exemplo: "a soma das parcelas é sempre o
total" prova mais que três casos escolhidos.

## Variáveis de ambiente

Nenhuma — por construção. Se `domain` precisar de configuração, ela entra por
parâmetro.
