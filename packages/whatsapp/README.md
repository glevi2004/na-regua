# whatsapp

Adapter do provedor de WhatsApp.

**Estado:** 🔴 não implementado · Cloud API oficial
([ADR-0005](../../docs/decisoes/adr/0005-whatsapp-cloud-api.md)) · `NR-045`, `NR-046`

## Responsabilidade

Enviar e receber mensagens, e verificar a assinatura dos webhooks recebidos.

**O que não faz:** decidir regra de negócio. O adapter traduz entre a porta e o
provedor — nada mais.

## Fronteiras

|                       |                                                            |
| --------------------- | ---------------------------------------------------------- |
| **Implementa**        | `MessageSender`, declarada por [`core`](../core/README.md) |
| **Depende de**        | `contracts`, `money`                                       |
| **Proibido importar** | `core`, `db`, `domain` — a seta aponta para dentro         |
| **Quem depende**      | a raiz de composição de `api` e `worker`                   |

A proibição de importar `core` é verificada na CI pela regra
`adapter-nao-importa-core`. Adapter que conhece `core` não é substituível — e
substituibilidade é a única razão de ele existir.

## O que a porta precisa cobrir

| Capacidade                                                     | Requisito                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Enviar mensagem de texto e mídia                               | [RF-015](../../docs/produto/requisitos-funcionais.md)      |
| Receber webhook com assinatura verificada                      | [RNF-028](../../docs/produto/requisitos-nao-funcionais.md) |
| Respeitar consentimento e opt-out                              | [RF-016](../../docs/produto/requisitos-funcionais.md)      |
| Vincular número à empresa                                      | [RF-094](../../docs/produto/requisitos-funcionais.md)      |
| Ignorar mensagem de número não vinculado, sem vazar informação | [RF-095](../../docs/produto/requisitos-funcionais.md)      |

## Consentimento não é opcional

Enviar mensagem a cliente final **sem consentimento registrado** é sanção da
ANPD e denúncia por spam — ameaça T3 do
[modelo de ameaças](../../docs/arquitetura/seguranca.md#modelo-de-ameaças).
A verificação acontece em `core`, antes de chegar aqui, mas o adapter não deve
oferecer caminho que a contorne.

## O vínculo do número é a credencial

Uma mensagem de texto não carrega credencial. O número vinculado faz esse papel
— com todas as consequências, inclusive a fragilidade a SIM swap. Ver
[`seguranca.md`](../../docs/arquitetura/seguranca.md#autenticação-do-canal-whatsapp).

## Modo falso

`WHATSAPP_PROVIDER=fake` responde de forma determinística, sem rede. Isso permite
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

`WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_WEBHOOK_SECRET`.

Em desenvolvimento, o webhook exige URL HTTPS pública — `localhost` é recusado.
Use um túnel e coloque a URL em `PUBLIC_WEBHOOK_URL`.

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
