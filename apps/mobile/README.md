# mobile

Expo / React Native — o PDV do lojista.

**Estado:** 🟡 scaffold do Expo · `NR-012`, `NR-070`, `NR-071`, `NR-073`

## Responsabilidade

O aplicativo que a lojista e o funcionário usam **no balcão**: leitor de código
de barras, carrinho, venda, consulta rápida.

**O que não faz:** regra de negócio. Fala com a API por HTTP.

## Fronteiras

|                       |                                             |
| --------------------- | ------------------------------------------- |
| **Depende de**        | `ui`, `contracts`, `money` + a API por HTTP |
| **Proibido importar** | `core`, `db`, `domain`                      |

A regra `cliente-nao-importa-nucleo` da CI barra a violação. Cálculo feito aqui
é cálculo que o WhatsApp não faz igual.

## O contexto de uso manda no design

A persona [P1](../../docs/produto/personas.md#p1--cláudia-a-lojista) usa o
aplicativo **em pé, atrás do balcão, com cliente esperando, em celular modesto e
internet instável.** Isso não é detalhe de UX; é restrição de arquitetura:

| Restrição                                         | Requisito                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Item entra no carrinho em ≤ 200 ms percebidos     | [RNF-005](../../docs/produto/requisitos-nao-funcionais.md)                          |
| **Carrinho é local; sincroniza depois**           | [RNF-051](../../docs/produto/requisitos-nao-funcionais.md)                          |
| App utilizável em ≤ 2 s, em Android médio de 4 GB | [RNF-008](../../docs/produto/requisitos-nao-funcionais.md)                          |
| Ações principais na metade inferior — uma mão     | [RNF-053](../../docs/produto/requisitos-nao-funcionais.md)                          |
| Fechar venda é idempotente                        | [RNF-043](../../docs/produto/requisitos-nao-funcionais.md) — rede ruim gera reenvio |

O carrinho local é a decisão mais importante: se cada leitura de código de
barras esperasse a rede, o PDV seria inutilizável na loja real.

## O que o `staff` não pode ver

Custo, margem, imposto e relatório financeiro são filtrados **no servidor**,
não escondidos na tela. Dado que chega ao aplicativo é dado que vazou —
[RF-012](../../docs/produto/requisitos-funcionais.md),
[RF-042](../../docs/produto/requisitos-funcionais.md).

## pnpm e Metro

O [`.npmrc`](../../.npmrc) fixa `node-linker=hoisted`. **Não é preferência:** o
Metro não resolve o store simbólico do pnpm, e sem essa linha o app quebra ao
importar qualquer pacote do workspace. Validado — `expo config` resolve
corretamente com essa configuração.

## Variáveis de ambiente

`API_URL`. Nunca coloque segredo aqui: tudo que vai para o aplicativo é público
para quem tiver o aparelho.

## Desenvolvimento

```bash
pnpm --filter @na-regua/mobile dev    # Expo; 'i' simulador iOS, 'a' Android
```
