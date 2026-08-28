# ui

Tokens de design e componentes compartilhados entre web e mobile.

**Estado:** 🔴 não implementado · 🚧 paleta bloqueada por
[DEC-001](../../docs/decisoes/README.md#dec-001) / [QST-011](../../docs/decisoes/README.md#qst-011) · `NR-011`

## Responsabilidade

Tokens (cor, tipografia, espaçamento, raio, elevação) e os componentes que
aparecem nos dois clientes.

**O que não faz:** lógica de negócio, chamada de API, navegação.

## Fronteiras

|                       |                           |
| --------------------- | ------------------------- |
| **Depende de**        | `contracts`, `money`      |
| **Proibido importar** | `core`, `db`, `domain`    |
| **Quem depende**      | `apps/web`, `apps/mobile` |

`money` está aí por um motivo específico: formatar dinheiro é responsabilidade
de apresentação, e `Money.format()` é a única forma correta de fazê-lo.

## Bloqueio de marca

O [material de rebranding](../../docs/assets/pro-comercio-rebranding.md) traz a
paleta ProComércio (`#1E2A78` `#39C8BD` `#6D33DD`), as fontes (BC Alphapipe,
BD Colonius) e **cinco paletas de marcas derivadas**. Ainda não se sabe se este
produto é uma dessas marcas derivadas e, se for, qual — [QST-011](../../docs/decisoes/README.md#qst-011).

**Mitigação:** comece com paleta provisória e troque os tokens quando a marca
fechar. Tokens existem exatamente para que essa troca seja um arquivo, não uma
refatoração. Não bloqueie a trilha 3 por causa disso.

## Restrições que vêm dos requisitos

| Restrição                                             | Requisito                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Contraste ≥ 4.5:1 (WCAG 2.1 AA)                       | [RNF-055](../../docs/produto/requisitos-nao-funcionais.md) |
| Toda tela tem estado vazio, de carregamento e de erro | [RNF-056](../../docs/produto/requisitos-nao-funcionais.md) |
| Ações principais na metade inferior — uso com uma mão | [RNF-053](../../docs/produto/requisitos-nao-funcionais.md) |
| Mensagem de erro sem jargão nem código cru            | [RNF-054](../../docs/produto/requisitos-nao-funcionais.md) |
| Texto em PT-BR, tom direto                            | [RNF-057](../../docs/produto/requisitos-nao-funcionais.md) |

A terceira vem da persona: a Cláudia usa o sistema **em pé, atrás do balcão, com
cliente esperando**. Botão no topo da tela é botão que ela não alcança.

## Web e mobile

Tokens são compartilhados; componentes primitivos são por plataforma
(React DOM × React Native). Não force um sistema de componentes único entre os
dois — o custo dessa abstração costuma superar o ganho.

## Variáveis de ambiente

Nenhuma.
