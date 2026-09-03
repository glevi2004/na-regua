---
adr: 0002
titulo: Emissão fiscal via Focus NFe
status: aceita
data: 2026-09-02
decisores:
  - Produto
  - Trilha 2 — Plataforma & Integrações
substitui: null
substituida_por: null
---

# ADR-0002 — Emissão fiscal via Focus NFe

|                       |                                 |
| --------------------- | ------------------------------- |
| **Status**            | Aceita                          |
| **Data**              | 2026-09-02                      |
| **Decisores**         | Produto + Trilha 2              |
| **Decisão de origem** | [DEC-004](../README.md#dec-004) |

## Contexto

O sistema precisa emitir **NFC-e** (produto) e **NFS-e Nacional** (serviço) no
fechamento da venda. Integração direta com a SEFAZ ou com o Ambiente Nacional
(certificado, schema XML, contingência, fila) é um produto à parte e não cabe
em um time pequeno. A documentação de arquitetura descrevia a SEFAZ como
sistema externo **nosso**; isso está errado: não há contato direto com a SEFAZ
nem com o emissor nacional.

A Focus NFe recebe JSON, assina, fala com a SEFAZ (NFC-e) ou com o Ambiente
Nacional (NFS-e) e devolve status, chave/número, XML e DANFE/DANFSe. Também
cadastra a empresa emitente (`POST /v2/empresas`) e valida o certificado A1.

O recorte é **NFC-e + NFS-e Nacional** (`/v2/nfsen`). CT-e, MDF-e, NF-e
(modelo 55), NFS-e municipal (`/v2/nfse`) e demais documentos da API Focus
ficam fora. Serviço no nosso modelo continua `kind=nfse` — a rota Focus é
sempre a DPS nacional. Não é um segundo produto.

**Quem emite** ([DEC-017](../README.md#dec-017)): CNPJ **MEI** ou **Simples
Nacional** que **não** optou pelo Híbrido (IBS/CBS pelo regime regular,
LC 214/2025, vigência 2027). Lucro presumido/real e Simples híbrido **usam o
ERP**; não enviamos A1/CSC/`habilita_*` à Focus e não enfileiramos nota.
Não montamos payload IBS/CBS do Híbrido.

O **layout** do passo fiscal no web/app (quando oferecer NFC-e, NFS-e ou sem
nota) ainda será definido; o tipo `nfce | nfse | sem_nota` já existe nas telas.

## Opções consideradas

### Opção A — Focus NFe

API REST, empresas multi-CNPJ, NFC-e síncrona, NFS-e Nacional assíncrona
(Ambiente Nacional), webhooks, guarda de XML.

| Prós                                        | Contras                                           |
| ------------------------------------------- | ------------------------------------------------- |
| Não operamos SEFAZ nem o emissor nacional   | Custo por nota e dependência de terceiro          |
| A1 fica na Focus, não no nosso cofre        | Payload NFC-e precisa de NCM/CFOP/CSOSN           |
| Homologação e produção com o mesmo contrato | Município aderente pode exigir campo extra na DPS |

### Opção B — Integração direta com a SEFAZ

| Prós              | Contras                                                |
| ----------------- | ------------------------------------------------------ |
| Sem intermediário | Projeto inteiro de certificado, XML, UF e contingência |
|                   | Inviável para o tamanho do time                        |

### Opção C — Outro provedor (NFe.io, PlugNotas, eNotas, Tecnospeed)

| Prós                    | Contras                                      |
| ----------------------- | -------------------------------------------- |
| Mesma classe de solução | Sem contrato nem avaliação tão avançada aqui |

## Decisão

**Escolhemos a opção A — Focus NFe.**

O que foi abdicado: controle direto do XML e da conversa com a SEFAZ. Em troca,
o nosso sistema persiste só o que a Focus devolve e o que precisa para montar
o JSON.

O certificado A1 **transita** pelo nosso backend (upload HTTPS) e segue para a
Focus em `arquivo_certificado_base64`. **Não** é armazenado em disco nem no
Postgres. Persistimos metadados: validade, status da validação, id da empresa
na Focus. CSC e id_token NFC-e são cadastrados na Focus e guardados por nós
apenas como “configurado / não configurado” na resposta ao cliente; o segredo
não volta na API.

Contrato send/receive: [`integracoes/focusnfe.md`](../../arquitetura/integracoes/focusnfe.md).
Fluxo e mapa de rotas: [`integracoes/fluxo-focus.md`](../../arquitetura/integracoes/fluxo-focus.md).

## Consequências

### Positivas

- Diagrama de contexto deixa de mostrar SEFAZ como nosso parceiro
- Schema fiscal cabe numa tabela `invoices` espelho da resposta Focus
- Emissão NFC-e pode ser síncrona na Focus; NFS-e Nacional é aceita na
  pré-validação e autorizada depois (consulta/webhook). A venda não espera
  SEFAZ nem o Ambiente Nacional
- Empresa inelegível continua no ERP; a porta fiscal recusa cedo (RF-146)

### Negativas

- Sem Focus, não há nota. Contingência é a da Focus (`forma_emissao=offline`),
  não um comunicador nosso
- CSC/token NFC-e o lojista obtém no portal da SEFAZ; nós só encaminhamos
- NFS-e Nacional exige código de tributação nacional (e NBS quando o município
  pedir); IM só se estiver cadastrada no emissor nacional. Tomador identificado
  é opcional no schema nacional.
- Sem payload IBS/CBS do Híbrido até haver demanda real (2027+)

### Neutras

- `packages/fiscal` continua adapter atrás de `InvoiceIssuer`
- XML continua em object storage (URL/caminho devolvido pela Focus + cópia nossa
  pelo prazo legal)

## Impacto na documentação

Atualizados **no mesmo PR** desta ADR:

- [x] `docs/arquitetura/integracoes/focusnfe.md`
- [x] `docs/arquitetura/integracoes/fluxo-focus.md`
- [x] `docs/arquitetura/visao-geral.md`, `fluxos.md`, `dados.md`, `seguranca.md`
- [x] `packages/fiscal/README.md`
- [x] `DEC-004` marcada como 🟢
- [x] `DEC-017` (elegibilidade MEI/Simples sem Híbrido)

## Quando revisitar

- Focus encerrar NFC-e/NFS-e Nacional ou mudar o contrato de empresas de forma incompatível
- Município aderente exigir campos incompatíveis com o núcleo da DPS que persistimos
- Demanda real de NF-e modelo 55 (fora deste recorte)
- Demanda real de Simples **Híbrido** / IBS-CBS (LC 214/2025, 2027)
- Custo por nota inviabilizar a margem
