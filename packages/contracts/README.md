# contracts

Schemas Zod — o contrato único do sistema.

**Estado:** 🟢 schemas base (Company 1:1 com usuário, User, Customer, Product, Sale) · `financial`,
`fiscal` e `agent` ainda não · `NR-005`

> ⚠️ **O pacote mais sensível do repositório.** Mudança aqui exige revisão das
> três trilhas ([git-workflow](../../docs/engenharia/git-workflow.md#pull-requests)).

## Responsabilidade

Um schema por operação, servindo **três** consumidores:

```
CreateSaleInput ──┬─→ validação do corpo HTTP        (apps/api)
                  ├─→ tipo TypeScript                 (todo o monorepo)
                  └─→ definição da tool do agente     (packages/agent)
```

É aqui que a promessa "app e WhatsApp fazem a mesma coisa" deixa de depender de
disciplina e vira propriedade estrutural: **a tool do agente é gerada do mesmo
schema que valida a rota HTTP.** Não existe forma de o agente aceitar um campo
que a API recusa, nem de os dois divergirem com o tempo.

**O que não faz:** regra de negócio, acesso a dados, formatação de tela.
Validação de _forma_, não de _regra_ — "o CPF tem 11 dígitos" é aqui; "este
cliente pode comprar fiado" é `core`.

## Fronteiras

|                       |                                        |
| --------------------- | -------------------------------------- |
| **Expõe**             | schemas Zod e os tipos inferidos deles |
| **Depende de**        | `money`, `zod`                         |
| **Proibido importar** | `db`, `core`, `domain`, adapters       |
| **Quem depende**      | todos — apps, core, agent, ui          |

## Organização

```
src/
├── index.ts          API pública
├── common/           tipos compartilhados: Money, CPF, CNPJ, telefone
├── company/          empresa e usuários
├── customer/
├── product/
├── sale/
├── financial/        contas a pagar e a receber      (ainda não)
├── fiscal/                                            (ainda não)
└── agent/            metadados de tool derivados dos schemas acima (ainda não)
```

## Entrada é `.strict()`

Todo schema de entrada recusa chave desconhecida em vez de descartá-la. É o que
faz a regra do `companyId` valer na prática: sem `.strict()`, um `companyId` no
corpo seria silenciosamente ignorado — e ninguém descobriria que alguém tentou.
Com ele, a requisição falha alto.

O preço é que renomear um campo quebra o cliente antigo de imediato, em vez de
degradar em silêncio. Para este pacote isso é o comportamento desejado.

## Convenções

| Regra                                                    | Motivo                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sufixo `Input` para entrada, `Output` para saída         | `CreateSaleInput`, `SaleOutput`                                                                     |
| Tipos inferidos, nunca escritos à mão                    | `type X = z.infer<typeof XSchema>` — duas fontes divergem                                           |
| Toda mensagem de erro em PT-BR                           | vai direto para o usuário ([RNF-054](../../docs/produto/requisitos-nao-funcionais.md))              |
| Dinheiro validado como string ou centavos, nunca decimal | [RNF-044](../../docs/produto/requisitos-nao-funcionais.md)                                          |
| **Nenhum schema aceita `companyId`**                     | vem do contexto de execução, nunca do cliente ([princípio 8](../../docs/arquitetura/principios.md)) |

A última é fácil de violar por conveniência e cara de descobrir: um `companyId`
no corpo é uma porta para acessar dados de outra empresa.

## Mudança quebra-contrato

`contracts` é consumido por api, agent, mobile, web e core. Mudar um campo
quebra as três trilhas ao mesmo tempo — e em silêncio, se o tipo ainda compilar.

Antes de mudar:

1. Dá para adicionar campo opcional em vez de alterar o existente?
2. Se não, `refactor(contracts)!:` com `BREAKING CHANGE:` no rodapé
3. Avise as três trilhas **antes** de abrir o PR
4. Atualize todos os consumidores no mesmo PR

## Testes

Cobertura mínima: **80%**. Teste principalmente as **rejeições** — schema que
aceita o que deveria recusar é o modo de falha que importa.

## Variáveis de ambiente

Nenhuma.
