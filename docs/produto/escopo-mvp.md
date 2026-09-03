# Escopo do MVP

> Recorte alinhado ao fluxo **A–J** e às telas de [`apps/web`](../../apps/web).
> A pergunta é: **o lojista opera o negócio nele, sem planilha paralela?**

Critério de corte: a Cláudia ([P1](personas.md#p1--cláudia-a-lojista)) registra
vendas, emite NFC-e ou NFS-e Nacional pela Focus quando for MEI/Simples sem
Híbrido e estiver configurado, vê a receber/a pagar, cobra,
abre chamado e fala com o assistente.

Wireframes da apresentação (Bancos, seletor de empresa) **não** são fonte de
verdade. O menu real está em
[`AppShell.tsx`](../../apps/web/src/components/app/AppShell.tsx).

---

## Jornadas A–J

| #     | Jornada         | No primeiro recorte                                                                                                     | Fora / depois                                 |
| ----- | --------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **A** | Cadastro        | Pessoa no signup (nome, e-mail, telefone, senha); cupom e Pix da assinatura; empresa (CNPJ) em `/app/empresa`           | Preencher empresa no mesmo passo do signup    |
| **B** | Estoque         | Produto plano: código, EAN, NCM, custo, venda, saldo, mínimo, movimentações                                             | Variação, kit, depósito, lote                 |
| **C** | Vendas          | Carrinho, clientes, PagMaxx (Pix/link/cartão online), registro de dinheiro/maquininha, NFC-e e NFS-e Nacional via Focus | TEF, orçamento/delivery                       |
| **D** | Financeiro      | Contas a pagar, a receber, plano de contas                                                                              | Bancos, Open Finance, conciliação             |
| **E** | CRM e agenda    | Quadro (a fazer / andamento / concluído); compromissos                                                                  | Funil de marketing, agendamento pelo cliente  |
| **F** | Dashboard       | KPIs em `/app` (faturamento, ticket, a receber, a pagar)                                                                | DRE completo como produto separado            |
| **G** | Conta e empresa | Editar dados pessoais e da empresa; regime + declaração Híbrido; A1+CSC só se elegível                                  | Cofre nosso de certificado; multi-empresa     |
| **H** | Assinatura      | Planos, trial, PagMaxx `/subscriptions`, estado Restrita                                                                | —                                             |
| **I** | Suporte         | Chamados com mensagens e anexo                                                                                          | —                                             |
| **J** | Assistente      | Mesmos casos de uso no web, app e WhatsApp Cloud API                                                                    | Lib não oficial; atendimento ao cliente final |

Épicos antigos (E1–E13) continuam nos IDs `US-*` para rastreio. Prioridade
**MUST** segue esta tabela, não o ranking original da apresentação.

---

## Fluxo de venda — o caminho crítico

Detalhe em [`fluxos.md`](../arquitetura/fluxos.md#venda-completa).

```
selecionar cliente → montar carrinho → pagamento
   (PagMaxx: Pix · link · cartão online  |  registro: dinheiro · maquininha)
   → emissão NFC-e ou NFS-e Nacional na Focus (se elegível e habilitada)
```

Ao fechar a venda o sistema calcula, sem intervenção:

| Cálculo                                                                   | Onde                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Custo dos itens                                                           | [`packages/domain`](../../packages/domain/README.md) |
| Imposto conforme regime (estimativa / Simples)                            | [`packages/domain`](../../packages/domain/README.md) |
| Tarifa de cartão (tabela; PagMaxx `simulate-fee` fora do caminho crítico) | [`packages/domain`](../../packages/domain/README.md) |
| Líquido → recebível                                                       | [`packages/core`](../../packages/core/README.md)     |

A nota **não** fala com a SEFAZ nem com o Ambiente Nacional. A Focus autoriza ou rejeita;
a venda já existe. NFC-e costuma voltar na hora; NFS-e Nacional fica
`processing` até o webhook. Qual tipo emitir no passo fiscal **entra no
recorte**; o layout da tela ainda será definido. Sem elegibilidade
([DEC-017](../decisoes/README.md#dec-017)) a venda fecha e a nota não entra na
fila.

PagMaxx só processa se o credenciamento do lojista estiver aprovado
([ADR-0006](../decisoes/adr/0006-conta-pagmaxx-por-lojista.md)). Sem isso,
dinheiro/maquininha ainda registram.

---

## Escopo do assistente

Prioridade no que a lojista faz várias vezes ao dia. Vale **web, app e WhatsApp**.

| Prioridade | Capacidade                                                               |
| ---------- | ------------------------------------------------------------------------ |
| **MUST**   | Consultar (vendas do dia, a receber, a pagar, estoque, saldo de cliente) |
| **MUST**   | Cadastrar cliente                                                        |
| **MUST**   | Lançar venda simples                                                     |
| **MUST**   | Enviar cobrança (link PagMaxx quando habilitado)                         |
| **SHOULD** | Lançar conta a pagar/receber                                             |
| **SHOULD** | Cadastrar produto                                                        |
| **SHOULD** | Resumo de período                                                        |
| **COULD**  | Enviar catálogo                                                          |
| **WON'T**  | Emitir nota por mensagem; conciliar banco; alterar preço em lote         |

Ações com valor exigem confirmação — princípio 3 da [visão](visao.md#princípios-de-produto).

---

## Fora do recorte

| Item                                          | Por que fica fora                                                   |
| --------------------------------------------- | ------------------------------------------------------------------- |
| Open Finance / conciliação bancária           | Fora de A–J; [DEC-005](../decisoes/README.md#dec-005) adiada        |
| Um usuário em várias empresas                 | [ADR-0004](../decisoes/adr/0004-usuario-uma-empresa.md)             |
| Integração direta com a SEFAZ                 | [ADR-0002](../decisoes/adr/0002-focus-nfe.md)                       |
| Guardar A1 no nosso banco                     | A1 só transita para a Focus                                         |
| CT-e, MDF-e, NF-e modelo 55, NFS-e municipal  | Recorte = NFC-e + NFS-e Nacional                                    |
| Payload IBS/CBS do Simples Híbrido (2027)     | ERP ok; emissão recusada ([DEC-017](../decisoes/README.md#dec-017)) |
| Staff no MUST                                 | Convite depois; schema já admite `role=staff`                       |
| Portal do contador                            | Exportação manual                                                   |
| Marketplace, vitrine, propaganda, gamificação | Apresentação comercial, sem RF                                      |
| Atendimento ao cliente final pelo assistente  | LGPD e custo de IA                                                  |
| Múltiplas filiais / depósitos                 | Fora do público                                                     |
| App para o cliente final                      | Sem demanda                                                         |
| Integração e-commerce / ERP terceiro          | Sem demanda                                                         |
| WhatsApp não oficial                          | [ADR-0005](../decisoes/adr/0005-whatsapp-cloud-api.md)              |

---

## Roadmap depois deste recorte

Ordem de intenção, não compromisso de data.

### Em seguida

Staff na mesma empresa · OFX/conciliação · mais cobertura de escrita no
assistente.

### Depois

IA proativa · atendimento ao cliente final · portal do contador · marketplace.

> [!NOTE]
> Fases longas da apresentação comercial ainda não têm `RF-xxx` até entrarem
> em planejamento.

---

## Critérios de saída deste recorte

- [ ] Lojista real opera um mês sem planilha paralela
- [ ] Jornadas A–J cobertas no web (e o que for MUST no mobile)
- [ ] NFC-e e NFS-e Nacional autorizadas em homologação Focus, incluindo rejeição visível
- [ ] Pix ou link PagMaxx dá baixa por webhook em homologação
- [ ] Assistente cobre MUST acima no WhatsApp Cloud API (ou adapter falso + contrato)
- [ ] Assinatura: trial, pagamento, estado Restrita
- [ ] Chamado de suporte ida e volta
- [ ] Exportação de dados disponível
- [ ] DEC-008 e DEC-009 fechadas (auth e hospedagem)

## Documentos relacionados

- [Visão](visao.md)
- [User Stories](user-stories.md)
- [Task Ledger](../processo/task-ledger.md)
- [Focus](../arquitetura/integracoes/focusnfe.md) · [PagMaxx](../arquitetura/integracoes/pagmaxx.md)
