# fiscal

Adapter de emissão fiscal — **Focus NFe**, NFC-e e NFS-e Nacional.

**Estado:** 🔴 não implementado · provedor escolhido
([ADR-0002](../../docs/decisoes/adr/0002-focus-nfe.md)) · `NR-040`, `NR-042`

## Responsabilidade

Cadastrar o emitente na Focus, encaminhar o A1 (sem persistir o PFX), emitir e
cancelar NFC-e e NFS-e Nacional, tratar contingência da Focus (NFC-e) e
autorização assíncrona do Ambiente Nacional (NFS-e), guardar XML pelo prazo
legal (cópia a partir do caminho devolvido). Recusar Focus e a fila de nota se
a empresa não for MEI/Simples sem Híbrido (RF-146).

**O que não faz:** falar com a SEFAZ ou com o Ambiente Nacional; emitir NF-e
(modelo 55); payload IBS/CBS do Híbrido; regra de preço; cofre de certificado.

## Fronteiras

|                       |                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Implementa**        | `InvoiceIssuer` (+ upsert de empresa Focus), declarada por [`core`](../core/README.md) |
| **Depende de**        | `contracts`, `money`                                                                   |
| **Proibido importar** | `core`, `db`, `domain`                                                                 |
| **Quem depende**      | composição de `api` e `worker`                                                         |

Contrato send/receive:
[`integracoes/focusnfe.md`](../../docs/arquitetura/integracoes/focusnfe.md).
Fluxo no tempo:
[`fluxo-focus.md`](../../docs/arquitetura/integracoes/fluxo-focus.md).

## O que a porta precisa cobrir

| Capacidade                                            | Requisito              |
| ----------------------------------------------------- | ---------------------- |
| Emitir NFC-e a partir de venda fechada                | RF-045                 |
| Validar NCM; CFOP/CSOSN padrão MEI/Simples            | RF-046                 |
| Emitir NFS-e Nacional (assíncrona, `/v2/nfsen`)       | RF-143                 |
| Validar código de tributação nacional (e NBS)         | RF-144                 |
| Traduzir rejeição Focus / Ambiente Nacional           | RF-047                 |
| Cancelar na Focus no prazo                            | RF-050                 |
| Contingência NFC-e e reenvio                          | RF-052, RF-053         |
| Encaminhar A1, CSC e `habilita_nfsen_*`               | RF-133, RF-134, RF-145 |
| Recusar Focus se inelegível (MEI/Simples sem Híbrido) | RF-146                 |
| XML ≥ 5 anos                                          | RNF-037                |

## Certificado A1

Transita no HTTPS da nossa API e vai para a Focus em base64. **Não** gravamos
o arquivo nem a senha. Persistimos `certificate_status` e `certificate_expires_at`.

## Emissão na fila

A venda **fecha antes da nota**. Timeout na Focus não desfaz a venda. NFS-e
Nacional autorizada depois não muda isso.

## Modo falso

`FISCAL_PROVIDER=fake` — autorização, rejeição, A1 inválido, timeout, NFS-e
Nacional em processamento.

## Variáveis de ambiente

`FISCAL_PROVIDER`, `FOCUSNFE_BASE_URL`, `FOCUSNFE_PLATFORM_TOKEN`,
`FISCAL_ENVIRONMENT`. Token do emitente é segredo por empresa.

Ver [`ambientes.md`](../../docs/engenharia/ambientes.md).
