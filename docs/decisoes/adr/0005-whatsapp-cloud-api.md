---
adr: 0005
titulo: WhatsApp Cloud API oficial da Meta
status: aceita
data: 2026-09-02
decisores:
  - Produto
  - Trilha 2 — Plataforma & Integrações
substitui: null
substituida_por: null
---

# ADR-0005 — WhatsApp Cloud API oficial da Meta

|                       |                                 |
| --------------------- | ------------------------------- |
| **Status**            | Aceita                          |
| **Data**              | 2026-09-02                      |
| **Decisores**         | Produto + Trilha 2              |
| **Decisão de origem** | [DEC-003](../README.md#dec-003) |

## Contexto

O assistente opera no web, no app e no WhatsApp. Biblioteca não oficial (sessão
web, “API plus”) expõe o produto a banimento sem recurso. O canal tem de ser a
**Cloud API oficial**.

BSP (360dialog, Twilio, etc.) ainda usa a API oficial por baixo. Escolher BSP
é detalhe de contratação e onboarding, não troca de protocolo.

## Opções consideradas

### Opção A — Cloud API Meta (direto ou via BSP)

| Prós                         | Contras                        |
| ---------------------------- | ------------------------------ |
| Risco de banimento aceitável | Template, janela de 24h, custo |

### Opção B — Biblioteca não oficial

| Prós        | Contras                     |
| ----------- | --------------------------- |
| Mais barato | Banimento derruba o produto |

## Decisão

**Escolhemos a opção A.** Implementação em `packages/whatsapp` contra a Cloud
API. BSP é permitido se apenas encapsular a API oficial. Cliente WhatsApp Web
não oficial é proibido.

O provedor concreto (Meta direto vs. BSP) pode ser o adapter; a porta
`MessageSender` não muda.

## Consequências

### Positivas

- DEC-003 deixa de bloquear o desenho do adapter

### Negativas

- Onboarding de número e templates oficiais no caminho do canal WhatsApp

## Impacto na documentação

- [x] `packages/whatsapp/README.md`
- [x] `docs/arquitetura/visao-geral.md`
- [x] `DEC-003` 🟢

## Quando revisitar

- Meta encerrar o produto Cloud API para o nosso caso
- BSP impor contrato incompatível com webhook/HMAC
