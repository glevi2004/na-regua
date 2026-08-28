# fiscal

Adapter de emissão fiscal — NFC-e e NFS-e.

**Estado:** 🔴 não implementado · 🚧 bloqueado por [DEC-004](../../docs/decisoes/README.md#dec-004) · `NR-040`, `NR-042`

## Responsabilidade

Emitir e cancelar nota fiscal, tratar contingência quando a SEFAZ cai, e guardar
o XML pelo prazo legal.

**O que não faz:** decidir regra de negócio. O adapter traduz entre a porta e o
provedor — nada mais.

## Fronteiras

|                       |                                                            |
| --------------------- | ---------------------------------------------------------- |
| **Implementa**        | `InvoiceIssuer`, declarada por [`core`](../core/README.md) |
| **Depende de**        | `contracts`, `money`                                       |
| **Proibido importar** | `core`, `db`, `domain` — a seta aponta para dentro         |
| **Quem depende**      | a raiz de composição de `api` e `worker`                   |

A proibição de importar `core` é verificada na CI pela regra
`adapter-nao-importa-core`. Adapter que conhece `core` não é substituível — e
substituibilidade é a única razão de ele existir.

## O que a porta precisa cobrir

| Capacidade                                              | Requisito                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Emitir NFC-e a partir de uma venda fechada              | [RF-045](../../docs/produto/requisitos-funcionais.md)                                                        |
| Validar NCM, CFOP e CST/CSOSN **antes** de transmitir   | [RF-046](../../docs/produto/requisitos-funcionais.md)                                                        |
| Traduzir rejeição da SEFAZ em mensagem compreensível    | [RF-047](../../docs/produto/requisitos-funcionais.md)                                                        |
| Cancelar dentro do prazo legal, com justificativa       | [RF-050](../../docs/produto/requisitos-funcionais.md)                                                        |
| Emitir em contingência e retransmitir em ordem          | [RF-052](../../docs/produto/requisitos-funcionais.md), [RF-053](../../docs/produto/requisitos-funcionais.md) |
| Guardar XML por ≥ 5 anos                                | [RNF-037](../../docs/produto/requisitos-nao-funcionais.md)                                                   |
| Numeração sequencial sem lacuna, mesmo sob concorrência | [RNF-039](../../docs/produto/requisitos-nao-funcionais.md)                                                   |

## Certificado digital A1

O segredo mais perigoso do sistema. Cifrado em repouso com chave **fora** do
banco, decifrado só em memória no momento da emissão, senha nunca registrada em
log — nem mascarada, simplesmente não é registrada. Acesso auditado. Alerta 30
dias antes do vencimento. Ver
[`seguranca.md`](../../docs/arquitetura/seguranca.md#certificado-digital-a1--tratamento-especial).

## Emissão é assíncrona

A venda **fecha antes da nota**. A SEFAZ é instável e o balcão não pode parar
por causa disso — [RNF-004](../../docs/produto/requisitos-nao-funcionais.md).
A emissão vai para a fila `invoice-issue`.

## Modo falso

`FISCAL_PROVIDER=fake` responde de forma determinística, sem rede. Isso permite
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

`FISCAL_PROVIDER`, `FISCAL_API_TOKEN`, `FISCAL_ENVIRONMENT`.
O certificado A1 **não** é variável de ambiente: é dado por empresa, cifrado.

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
