# banking

Adapter de extrato bancário — Open Finance e importação de arquivo.

**Estado:** 🔴 não implementado · **fora do recorte A–J**
([DEC-005](../../docs/decisoes/README.md#dec-005) adiada) · NR-047/048 no backlog

## Responsabilidade

Trazer transações bancárias para dentro do sistema, de forma que a conciliação
possa acontecer.

**O que não faz:** decidir regra de negócio. O adapter traduz entre a porta e o
provedor — nada mais.

## Fronteiras

|                       |                                                                    |
| --------------------- | ------------------------------------------------------------------ |
| **Implementa**        | `BankStatementProvider`, declarada por [`core`](../core/README.md) |
| **Depende de**        | `contracts`, `money`                                               |
| **Proibido importar** | `core`, `db`, `domain` — a seta aponta para dentro                 |
| **Quem depende**      | a raiz de composição de `api` e `worker`                           |

A proibição de importar `core` é verificada na CI pela regra
`adapter-nao-importa-core`. Adapter que conhece `core` não é substituível — e
substituibilidade é a única razão de ele existir.

## O que a porta precisa cobrir

| Capacidade                                                          | Requisito                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| Importar OFX/CSV, informando o que entrou e o que foi ignorado      | [RF-076](../../docs/produto/requisitos-funcionais.md) |
| Rejeitar arquivo inválido **sem importação parcial**                | [RF-077](../../docs/produto/requisitos-funcionais.md) |
| Buscar transações via Open Finance periodicamente                   | [RF-074](../../docs/produto/requisitos-funcionais.md) |
| Detectar consentimento expirado e preservar conciliações anteriores | [RF-075](../../docs/produto/requisitos-funcionais.md) |
| Nunca duplicar transação já importada                               | chave única por hash externo                          |

## Comece por OFX

Recomendação de [DEC-005](../../docs/decisoes/README.md#dec-005): implementar
importação de arquivo primeiro. Já entrega a conciliação inteira, não depende de
fornecedor nem de certificação, e satisfaz a mesma porta — Open Finance entra
depois sem tocar em `core`.

## Modo falso

`BANKING_PROVIDER=fake` responde de forma determinística, sem rede. Isso permite
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

`BANKING_PROVIDER`, `BANKING_CLIENT_ID`, `BANKING_CLIENT_SECRET`.

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
