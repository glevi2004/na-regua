# na-regua

ERP para PMEs brasileiras, operável tanto por aplicativo quanto por um assistente
de IA no WhatsApp. Nome de trabalho no material de produto: **ZapGestor**
(ainda não definido — ver decisão 1 do documento de arquitetura).

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/PRODUTO-E-ARQUITETURA.md](docs/PRODUTO-E-ARQUITETURA.md) | **Comece por aqui.** Requisitos, arquitetura, análise de stack, estrutura de repositório, faseamento e decisões em aberto |
| [docs/ZapGestor_Apresentacao.md](docs/ZapGestor_Apresentacao.md) | Deck de produto original, extraído para markdown |
| [docs/ZapGestor_Apresentacao.pdf](docs/ZapGestor_Apresentacao.pdf) | Deck original |

> O documento de arquitetura é uma **proposta para discussão em time**. Nada está fechado.

## Ferramentas

Conversão do deck para markdown:

```bash
pip install pymupdf
python scripts/pdf_to_md.py docs/ZapGestor_Apresentacao.pdf \
  -o docs/ZapGestor_Apresentacao.md \
  --images docs/slides
```
