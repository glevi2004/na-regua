# Contribuindo

Versão de uma tela. O detalhe está em [`docs/engenharia/`](docs/engenharia/).

## Comece aqui

```bash
pnpm install && pnpm setup && pnpm dev
```

Passo a passo e problemas comuns: [`docs/engenharia/setup.md`](docs/engenharia/setup.md).

## O ciclo

```bash
git switch main && git pull --rebase
git switch -c feat/NR-042-carrinho-codigo-barras     # <tipo>/NR-<id>-<slug>
git push -u origin HEAD && gh pr create --draft

# antes de pedir revisão, rode o que a CI vai rodar:
pnpm format:check && pnpm boundaries && pnpm typecheck && pnpm lint && pnpm test
```

## Cheatsheet

### Commit

```
<tipo>(<escopo>): <descrição em pt-br, imperativo, minúscula, sem ponto final>

<corpo: o porquê, não o quê>

Refs: NR-042
```

**Tipos** `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

**Escopos** (lista fechada — o commitlint rejeita o que não estiver aqui)
`api` `worker` `mobile` `web` · `core` `domain` `contracts` `db` `money` ·
`agent` `fiscal` `whatsapp` `banking` `billing` `payments` · `ui` · `infra` `docs` `repo`

### Branch

`<tipo>/NR-<número>-<slug-kebab>` → `fix/NR-118-arredondamento-tarifa-cartao`

### PR

O **título do PR** segue o formato de commit — usamos squash merge, então é ele
que vira o commit na `main`. Uma aprovação. Alvo de ≤ 400 linhas de diff.

## As cinco regras que mais importam

1. **Regra de negócio vive em `core` ou `domain`, nunca em `apps/*`.**
   Se o código precisa rodar igual pelo app **e** pelo WhatsApp, ele não pertence a uma rota.

2. **Dinheiro é `Money` em centavos.** Nunca `number` com decimal. Nunca.

3. **Nenhum handler importa `db`.** Só a raiz de composição (`composition.ts`).

4. **`companyId` vem do contexto de execução, nunca do cliente.**

5. **Nada é apagado.** Venda se cancela ou se devolve; auditoria é somente-inserção.

As cinco são verificadas na CI ou em revisão. O raciocínio por trás delas:
[`docs/arquitetura/principios.md`](docs/arquitetura/principios.md).

## Onde escrever cada coisa

| Escrevendo…                                 | Vai em                    |
| ------------------------------------------- | ------------------------- |
| Cálculo de imposto, tarifa, margem, parcela | `packages/domain`         |
| "Registrar venda" ponta a ponta             | `packages/core`           |
| Validação de entrada                        | `packages/contracts`      |
| SQL, migration                              | `packages/db`             |
| Chamada a provedor externo                  | o adapter dele            |
| Rota HTTP, autenticação                     | `apps/api`                |
| Job, consumidor de fila                     | `apps/worker`             |
| Tela                                        | `apps/mobile`, `apps/web` |

Tabela completa: [`docs/arquitetura/modulos.md`](docs/arquitetura/modulos.md#onde-escrever-cada-tipo-de-código).

## Antes de começar uma tarefa

Confira a [Definition of Ready](docs/engenharia/fluxo-de-trabalho.md#definition-of-ready):
requisito vinculado, critério de aceite com caminho de erro, sem
[decisão bloqueante](docs/decisoes/README.md) em aberto, cabe em 2 dias.

## Quando você trava

1. Está na [documentação](docs/README.md)?
2. É [decisão em aberto](docs/decisoes/README.md)?
3. É dúvida de fronteira? [princípios](docs/arquitetura/principios.md) + `pnpm boundaries`
4. **Travado há mais de 2 horas? Chame alguém.** Depois disso é orgulho, não trabalho.

## Idioma

Prosa em **PT-BR**. Código em **inglês** — identificador, arquivo, tabela,
endpoint, variável de ambiente. O
[glossário](docs/produto/glossario.md) mapeia um para o outro: um termo de
negócio, um identificador.

## Leitura obrigatória antes do primeiro commit

1. [`git-workflow.md`](docs/engenharia/git-workflow.md)
2. [`code-style.md`](docs/engenharia/code-style.md)
3. [`principios.md`](docs/arquitetura/principios.md)
