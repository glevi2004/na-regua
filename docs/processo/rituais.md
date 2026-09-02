# Rituais e critérios

Cerimônias do time, Definition of Ready e Definition of Done.

Com três pessoas, o risco não é falta de processo — é excesso. Cada ritual aqui
precisa se justificar; se um deles virar teatro, cortamos.

---

## Cerimônias

| Ritual                      | Quando           | Duração | Quem         | Objetivo                     |
| --------------------------- | ---------------- | ------- | ------------ | ---------------------------- |
| **Sincronia diária**        | manhã            | 10 min  | as 3 trilhas | o que travou                 |
| **Refinamento**             | quarta           | 45 min  | as 3 trilhas | deixar tarefas _Ready_       |
| **Planejamento**            | início da sprint | 1 h     | as 3 trilhas | o que entra, quem pega       |
| **Revisão + retrospectiva** | fim da sprint    | 1 h     | as 3 trilhas | o que entregamos, o que muda |
| **Revisão de decisões**     | sexta            | 15 min  | as 3 trilhas | varrer as decisões em aberto |

Sprint de **2 semanas**.

### Sincronia diária

Três perguntas, nesta ordem — a terceira é a que importa:

1. O que fechei desde ontem?
2. O que vou fechar hoje?
3. **O que está me travando?**

Não é relatório de status: quem quiser saber status abre o Monday. É para
descobrir bloqueio cedo. Discussão técnica sai da chamada e vira conversa
separada com quem interessa.

### Refinamento

Tarefas da próxima sprint saem daqui em estado _Ready_. Para cada uma:
critérios de aceite (com caminho de erro), módulo dono, estimativa, dependências
e — o mais esquecido — **existe alguma `DEC` bloqueando?**

Tarefa que não fica _Ready_ em 10 minutos de conversa não está pronta para ser
refinada: ela precisa de investigação, e isso é outra tarefa.

### Planejamento

Compromisso da sprint, respeitando: capacidade real (não 100% do tempo), o
[caminho crítico](task-ledger.md#caminho-crítico), e a regra de que **ninguém
começa uma tarefa bloqueada** sem antes ter escopo claro do que dá para fazer
sem a decisão.

### Revisão + retrospectiva

Primeiro o que foi entregue — demonstração ao vivo, não slide. Depois o
processo: o que manter, o que mudar. **Toda retrospectiva termina com no máximo
duas ações**, cada uma com dono e prazo. Retrospectiva com dez ações não muda
nada; com duas, muda.

### Revisão de decisões — 15 minutos que valem por uma sprint

Varredura das [decisões em aberto](../decisoes/README.md):

- Alguma `DEC` passou do prazo?
- Alguma `QST` está sem resposta há mais de duas semanas?
- Alguma decisão foi tomada em conversa e não registrada?
- O que está bloqueado hoje e não estava na semana passada?

É o ritual mais fácil de pular e o mais caro de pular, e a DEC-002 é a prova:
fechá-la liberou **26 tarefas e 73 dias** de uma vez
([ADR-0001](../decisoes/adr/0001-rls-por-linha.md)). Restam **43 dos 116
dias-desenvolvedor bloqueados por 11 decisões**
([ledger](task-ledger.md#bloqueios-por-decisão)).

---

## Definition of Ready

Uma tarefa só pode ser **pega** se:

- [ ] Tem `US-xxx` ou `RF-xxx` vinculado
- [ ] Tem critério de aceite com **pelo menos um caminho de erro**
- [ ] Não tem `DEC-xxx` bloqueante — ou o escopo é exatamente a parte que não depende dela
- [ ] Dependências (`NR-xxx`) concluídas
- [ ] Estimativa ≤ 2 dias
- [ ] Módulo dono definido ([modulos.md](../arquitetura/modulos.md))

Sobre o caminho de erro: o caminho feliz é a parte fácil e é sempre o que se
lembra de especificar. O que quebra em produção é o outro.

## Definition of Done

Uma tarefa só vai para `Done` se:

- [ ] CI verde: formatação, fronteiras, tipos, lint, testes, build
- [ ] PR aprovado e mergeado com squash
- [ ] Testes na camada certa ([testes.md](../engenharia/testes.md)), incluindo um caso de erro
- [ ] README do módulo atualizado, se o comportamento mudou
- [ ] Variável de ambiente nova em [ambientes.md](../engenharia/ambientes.md) **e** no `.env.example`
- [ ] Decisão de arquitetura virou ADR ou `DEC`
- [ ] [Ledger](task-ledger.md) atualizado **no mesmo PR**
- [ ] Nenhum `TODO` novo sem tarefa correspondente

O último item é o que impede a dívida invisível: `TODO` sem tarefa é dívida que
ninguém vai pagar porque ninguém sabe que existe.

---

## Estados no Monday

| Estado          | Significado                                                   |
| --------------- | ------------------------------------------------------------- |
| `Not started`   | refinada, aguardando                                          |
| `Blocked`       | travada por decisão ou dependência — **com o motivo no item** |
| `Working on it` | alguém está nela agora                                        |
| `In review`     | PR aberto, aguardando revisão                                 |
| `Done`          | DoD inteira atendida                                          |

**Uma tarefa `Working on it` por pessoa.** Duas em paralelo significa que uma
está parada, e tarefa parada esconde bloqueio.

`Blocked` sem motivo escrito no item é o mesmo que `Not started` — ninguém
consegue destravar o que não sabe por que travou.

## Sincronia com o repositório

| Evento no Git              | Efeito no board                |
| -------------------------- | ------------------------------ |
| Branch criada com `NR-042` | `Working on it`                |
| PR aberto                  | `In review`, com o link colado |
| PR mergeado                | `Done`                         |

O [ledger](task-ledger.md) é a fonte da verdade versionada; o Monday é a
visualização. Divergiu, o ledger ganha — e o CSV se regenera:

```bash
pnpm ledger:csv
```

## Métricas do processo

Poucas, e só as que levam a uma ação:

| Métrica                           | Alerta                                        |
| --------------------------------- | --------------------------------------------- |
| Tempo de tarefa (início → `Done`) | acima de 3 dias → escopo grande demais        |
| Tempo de PR aberto até merge      | acima de 1 dia → revisão está sendo o gargalo |
| Tarefas bloqueadas                | crescendo → decisões não estão sendo tomadas  |
| Retrabalho após merge             | alto → DoR fraca                              |

**Não medimos velocidade em pontos.** Com três pessoas e nenhum cliente ainda,
velocidade mede a habilidade do time em estimar, não em entregar.

## Quando o processo atrapalha

Este documento é dos desenvolvedores, não sobre eles. Se um ritual não estiver
pagando o tempo que custa, leve à retrospectiva e corte.

Os únicos itens **não negociáveis** são os que protegem o produto de erro caro:

- CI verde antes do merge
- Revisão antes do merge
- Critério de aceite com caminho de erro
- Decisão registrada antes de virar código

## Documentos relacionados

- [Task Ledger](task-ledger.md) — o backlog
- [Fluxo de trabalho](../engenharia/fluxo-de-trabalho.md) — o ciclo diário
- [Decisões](../decisoes/README.md) — o que está bloqueando
