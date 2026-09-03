---
adr: 0006
titulo: Conta PagMaxx por lojista, KYC fora do caminho crítico
status: aceita
data: 2026-09-02
decisores:
  - Produto
substitui: null
substituida_por: null
---

# ADR-0006 — Conta PagMaxx por lojista, KYC fora do caminho crítico

|                       |                                 |
| --------------------- | ------------------------------- |
| **Status**            | Aceita                          |
| **Data**              | 2026-09-02                      |
| **Decisores**         | Produto                         |
| **Decisão de origem** | [DEC-015](../README.md#dec-015) |

## Contexto

A PagMaxx opera um estabelecimento por credencial, com envio de documentos e
aprovação. Split na conta da plataforma faria o dinheiro do lojista passar por
nós e mudaria o enquadramento regulatório.

O onboarding do produto (pessoa + plano + cadastro da empresa) não pode esperar
KYC de pagamento. Venda em dinheiro e registro de maquininha existem sem PagMaxx.
Pix, link e cartão online ficam pendentes até a conta PagMaxx do lojista estar
aprovada.

Documentos da **Focus** (A1, CSC) habilitam nota fiscal. Documentos da
**PagMaxx** habilitam processar pagamento. São fluxos distintos na tela Empresa
/ Assinatura.

## Opções consideradas

### Opção A — Conta por lojista

| Prós                          | Contras               |
| ----------------------------- | --------------------- |
| Dinheiro não transita por nós | KYC humano no lojista |

### Opção B — Split na conta da plataforma

| Prós              | Contras                           |
| ----------------- | --------------------------------- |
| Onboarding rápido | Risco de instituição de pagamento |

## Decisão

**Escolhemos a opção A.** Credenciamento PagMaxx fora do caminho crítico:
cadastrar, estoque, venda registrada e NFC-e (se Focus ok) funcionam antes.
Meios PagMaxx exigem status de credenciamento aprovado.

## Consequências

### Positivas

- [M3](../../produto/visao.md#métricas-de-sucesso) não depende do KYC PagMaxx

### Negativas

- Lojista vê Pix/link desabilitados até aprovação
- Duas esteiras de documento (Focus vs PagMaxx)

## Impacto na documentação

- [x] `docs/arquitetura/integracoes/pagmaxx.md`
- [x] `DEC-015` 🟢

## Quando revisitar

- Parecer jurídico contrário à conta por lojista
- PagMaxx deixar de oferecer EC por estabelecimento
