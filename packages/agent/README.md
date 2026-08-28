# agent

Runtime do assistente: tools, memória e confirmações.

**Estado:** 🔴 não implementado · 🚧 bloqueado por
[DEC-007](../../docs/decisoes/README.md#dec-007) · `NR-060`, `NR-061`, `NR-062`

## Responsabilidade

Interpretar mensagem em linguagem natural, resolver a intenção para uma chamada
tipada, confirmar quando a ação mexe em valor, e transportar para um caso de uso
de `core`.

**O que não faz — e isto é a regra mais importante do pacote:**

> **O agente nunca calcula.** Total, imposto, tarifa, parcela e margem vêm de
> `domain`, através de `core`. Se um número aparece numa mensagem, ele foi
> calculado por código determinístico e testado.

O LLM interpreta linguagem; nunca decide dinheiro. É isso que impede a classe
inteira de erro em que o número da conversa não bate com o número do relatório.

## Fronteiras

|                       |                                       |
| --------------------- | ------------------------------------- |
| **Expõe**             | `processMessage()`, registro de tools |
| **Depende de**        | `core`, `contracts`, `money`          |
| **Proibido importar** | `db`, `domain` diretamente            |
| **Quem depende**      | `apps/api`                            |

Roda **dentro** de `apps/api`, não como serviço separado: precisa do mesmo
contexto de execução, da mesma autenticação e das mesmas portas. Separá-lo
criaria uma segunda composição de dependências — e é assim que os dois canais
começam a divergir. Ver
[`visao-geral.md`](../../docs/arquitetura/visao-geral.md#o-runtime-do-agente-mora-na-api).

## Tools são geradas de `contracts`

```
CreateSaleInput (Zod)  ──→  schema da tool do agente
                       ──→  validação da rota HTTP
```

Uma fonte, dois consumidores. Não existe forma de o agente aceitar um campo que
a API recusa. **Não escreva definição de tool à mão.**

## Confirmação de ação sensível

| Tipo de intenção  | Confirma? | Exemplo                    |
| ----------------- | :-------: | -------------------------- |
| Leitura           |    ❌     | "quanto vendi hoje?"       |
| Cria valor        |    ✅     | lançar venda, lançar conta |
| Altera valor      |    ✅     | mudar preço                |
| Exclui ou estorna |    ✅     | cancelar venda             |
| Envia a terceiro  |    ✅     | enviar cobrança ao cliente |

Confirmação pendente **expira**. Resposta ambígua conta como **não**: o custo de
errar para o lado do "não" é uma pergunta repetida; para o lado do "sim" é um
lançamento financeiro errado. [RF-103](../../docs/produto/requisitos-funcionais.md),
[RF-104](../../docs/produto/requisitos-funcionais.md).

É também controle de **segurança**, não só de usabilidade: quem obtiver acesso
ao aparelho ainda precisa confirmar cada lançamento.

## Riscos específicos de ter um LLM no caminho

| Risco                                  | Controle                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Injeção de prompt                      | só executa via tool call tipada; texto nunca vira chamada arbitrária                   |
| Escalada de privilégio                 | chama `core` com o mesmo `ExecutionContext`; papel verificado no caso de uso           |
| Ação não intencionada                  | confirmação explícita                                                                  |
| Vazamento entre conversas              | contexto isolado por empresa ([RF-106](../../docs/produto/requisitos-funcionais.md))   |
| Dado sensível ao provedor              | envia o mínimo necessário ([RNF-075](../../docs/produto/requisitos-nao-funcionais.md)) |
| Alucinação com consequência financeira | o agente não calcula                                                                   |

## Não haverá busca semântica sobre o banco de negócio

"Quanto vendi hoje?" vira consulta SQL determinística via `core`, não busca
vetorial. Recomendação registrada em
[DEC-007](../../docs/decisoes/README.md#dec-007).

## Custo

Consumo medido por empresa desde o primeiro dia. Teto configurável, com
degradação avisada em vez de conta surpresa —
[RNF-072](../../docs/produto/requisitos-nao-funcionais.md),
[RNF-073](../../docs/produto/requisitos-nao-funcionais.md).

## Variáveis de ambiente

`AGENT_PROVIDER`, `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `AGENT_MONTHLY_BUDGET_CENTS`.
