# ZapGestor — Produto e Arquitetura

> Fonte do produto: [ZapGestor_Apresentacao.pdf](./ZapGestor_Apresentacao.pdf)

## Visão geral

ERP completo para pequenos e médios negócios, com duas formas de uso sobre o mesmo
banco de dados:

- **App** — cadastros, vendas, financeiro, relatórios, leitor de código de barras,
  emissão de NFC-e/NFS-e, conciliação bancária (Open Finance).
- **Assistente de IA no WhatsApp** — qualquer funcionalidade do ERP também pode ser
  acionada por mensagem (cadastrar cliente, lançar venda, consultar contas,
  gerar relatórios, enviar cobranças/catálogos), mantendo contexto da conversa.

## Módulos de negócio

Empresa · Clientes/CRM · Produtos · Vendas · Contas a Pagar · Contas a Receber ·
Bancos · Plano de Contas · Agenda.

Fluxo de venda: selecionar cliente → montar carrinho (com leitor de código de
barras) → ajustar itens → pagamento (débito, crédito, Pix, dinheiro, carteira) →
emissão fiscal. O sistema calcula automaticamente custo, imposto e tarifa de
cartão, gerando o valor líquido em contas a receber.

## Roadmap (pós-MVP)

Marketplace de lojas · vitrine de especialidades · espaço para propaganda ·
gamificação · IA mais avançada (recomendações proativas) · parcerias por
elegibilidade (alto faturamento, CNPJ limpo).

## Decisões em aberto (produto)

- Mecanismo de busca/recuperação de informação por trás da IA
- Criação de usuário e cupons
- Estrutura do banco de dados por login/empresa
- Vínculo do número de WhatsApp do cliente ao sistema
- Manutenção de contexto da conversa com a IA e aprendizado contínuo
- Cobrança de mensalidade, aviso de inadimplência, regra de bloqueio

---

## Arquitetura do monorepo

```
na-regua/
├── apps/
│   ├── api/        # Fastify — REST + webhooks + runtime do agente
│   ├── worker/      # BullMQ — filas e jobs agendados
│   ├── mobile/       # Expo — app do lojista (leitor de código de barras)
│   └── web/           # Next.js — backoffice, catálogo público, landing
├── packages/
│   ├── core/           # NÚCLEO — casos de uso (handlers)
│   ├── domain/          # regras puras: precificação, impostos, tarifas, comissão
│   ├── contracts/         # schemas zod — validação HTTP + tipos + tools da IA
│   ├── db/                 # schema Drizzle, migrations, políticas RLS
│   ├── agent/                # runtime do agente: tools, memória, confirmações
│   ├── fiscal/                 # adapter NFC-e/NFS-e (provedor plugável)
│   ├── whatsapp/                 # adapter do provedor de WhatsApp
│   ├── banking/                     # adapter Open Finance
│   ├── billing/                       # adapter de assinatura SaaS
│   ├── money/                           # tipo Money — centavos, sem float
│   └── ui/                                # tokens e componentes compartilhados
├── docs/
├── scripts/
│   └── pdf_to_md.py    # converte docs/*.pdf em Markdown
└── infra/               # IaC, docker-compose, migrations de deploy
```

### Princípios

- **`core` é o núcleo**: casos de uso vivem aqui e dependem apenas de `domain`,
  `contracts` e `db`. Nada de lógica de negócio dentro de `apps/*`.
- **`domain` é puro**: sem I/O, sem framework — só regras (precificação,
  impostos, tarifas, comissão) e testes unitários simples.
- **Adapters plugáveis** (`fiscal`, `whatsapp`, `banking`, `billing`) isolam
  provedores externos atrás de uma interface própria, para trocar de provedor
  sem tocar em `core`/`domain`.
- **`agent`** conecta o assistente de WhatsApp aos mesmos casos de uso de
  `core` via `contracts` (tools tipadas com Zod) — o app e o WhatsApp acionam
  exatamente as mesmas regras de negócio.
- **`money`** evita erro de ponto flutuante em valores monetários — tudo em
  centavos.

### Status

Estrutura de pastas criada; implementação de cada `package`/`app` ainda por
fazer. Ver decisões em aberto acima antes de iniciar `agent`, `fiscal`,
`whatsapp` e `banking`.
