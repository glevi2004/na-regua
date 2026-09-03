# banking

Adapter de extrato bancário — Open Finance e importação de arquivo.

**Estado:** 🟡 importação de OFX/CSV implementada (`NR-047`) · 🚧 Open Finance bloqueado por [DEC-005](../../docs/decisoes/README.md#dec-005) · `NR-048`

## Responsabilidade

Trazer transações bancárias para dentro do sistema, de forma que a conciliação
possa acontecer.

**O que não faz:** decidir regra de negócio. O adapter traduz entre a porta e o
provedor — nada mais.

## Fronteiras

|                       |                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Implementa**        | `StatementParser`, declarada por [`core`](../core/README.md) — e `BankStatementProvider` quando a DEC-005 fechar |
| **Depende de**        | `contracts`, `money`                                                                                             |
| **Proibido importar** | `core`, `db`, `domain` — a seta aponta para dentro                                                               |
| **Quem depende**      | a raiz de composição de `api` e `worker`                                                                         |

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

## Importação de arquivo — RF-076, RF-077

A DEC-005 **não** bloqueia isto. A própria decisão recomenda começar por
OFX/CSV, porque já entrega conciliação sem depender de fornecedor nem de
certificação — e a tabela de bloqueios dizia "RF-074 a RF-077", larga demais.
Corrigida.

### O que a realidade dos bancos impõe

| Decisão                                | Por quê                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Leitura de OFX por expressão regular   | OFX 1.x **não é XML**: é SGML com fechamento de tag opcional. Um parser de XML recusa a maioria dos extratos reais como mal formados                         |
| A direção vem do **sinal do `TRNAMT`** | `TRNTYPE` varia demais entre bancos — alguns mandam `OTHER` para tudo. O sinal é o que todos preenchem certo, porque o saldo do próprio extrato depende dele |
| `DTPOSTED` truncado em 8 caracteres    | Converter para instante e formatar no fuso mudaria o dia. Data de lançamento é **dia**, e conciliação compara dias                                           |
| Codificação detectada, não assumida    | Extrato antigo vem em latin1; CSV do Excel vem em UTF-8 com BOM. Errar não falha — devolve acento trocado, e esse texto vai para a tela                      |
| Formato detectado pelo **conteúdo**    | Extrato chega como `extrato.txt`, `Extrato(1).ofx`, `download.csv` com OFX dentro. A extensão é o que menos se pode confiar                                  |
| PDF tem recusa própria                 | É o erro mais comum de verdade: o banco oferece PDF primeiro. Sem esse caso, o lojista recebe "não reconhecemos as colunas", que não diz o que fazer         |
| CSV sintetiza `externalId`             | CSV de extrato quase nunca traz identificador, e importar duas vezes é a forma normal de conferir se funcionou. Ver abaixo                                   |

### O id sintetizado do CSV

Hash de data + valor + descrição + **posição entre as iguais daquele dia**.

As três primeiras partes fazem a mesma transação gerar o mesmo id em duas
importações do mesmo arquivo, que é o que a deduplicação precisa. A quarta
resolve o caso que sem ela quebraria: dois cafés de R$ 8,00 na mesma padaria no
mesmo dia teriam o mesmo hash, e o segundo seria descartado como duplicata — o
extrato ficaria com uma transação a menos e nada explicando.

O prefixo `csv:` marca o id como sintetizado. Quem for depurar uma duplicata
precisa saber que ele não veio do banco.

### Arquivo inválido não importa nada — RF-077

O arquivo é lido **por completo** antes de qualquer escrita, e a leitura
devolve uma união (`parsed` | `rejected`) em vez de lançar. A união é o que
torna a garantia estrutural: não existe caminho em que metade das transações já
entrou quando o problema aparece.

Uma transação ilegível recusa o arquivo inteiro, apontando a linha. Importar as
outras 44 daria um extrato pela metade dentro do sistema, e a conciliação
passaria a não fechar por um motivo que ninguém consegue ver: o lojista
procuraria no banco a transação que falta, e ela estaria lá.

**A exceção é a linha de saldo.** Extrato em CSV termina com "SALDO DO DIA" sem
valor, e recusar por causa dela obrigaria a editar o arquivo à mão — e ninguém
edita, desiste da conciliação. Linha sem valor passa batido; linha com valor
ilegível recusa.
