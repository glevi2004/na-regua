---
adr: 0000
titulo: Template de ADR
status: template
data: 2026-08-24
decisores: []
substitui: null
substituida_por: null
---

# ADR-0000 — Título curto e afirmativo

> Copie este arquivo para `NNNN-titulo-em-kebab-case.md`, com o próximo número
> livre. **ADR é imutável:** uma vez aceita, não se reescreve. Se a decisão
> mudar, escreve-se uma nova ADR que substitui esta, e as duas ficam.

| | |
|---|---|
| **Status** | Proposta · Aceita · Substituída por [ADR-NNNN](.) · Descartada |
| **Data** | AAAA-MM-DD |
| **Decisores** | quem participou |
| **Decisão de origem** | [DEC-NNN](../README.md#dec-nnn) |

## Contexto

Qual é a situação que exige uma decisão? Que forças estão em conflito —
custo, prazo, risco, competência do time?

**Escreva no presente e sem otimismo retrospectivo.** O valor de uma ADR é
alguém, daqui a um ano, entender por que a escolha fazia sentido *com a
informação daquele momento*. Inclua o que não se sabia.

## Opções consideradas

### Opção A — nome
Descrição em uma linha.

| Prós | Contras |
|---|---|
| | |

### Opção B — nome
Idem. **Liste opções que foram de fato consideradas.** Uma ADR com uma opção
plausível e duas de palha não documenta uma decisão, documenta uma justificativa.

## Decisão

**Escolhemos a opção X.**

Por quê — ligada às forças do contexto, não a preferência estética. Diga
explicitamente o que foi **abdicado** ao escolher.

## Consequências

### Positivas
- O que fica mais fácil

### Negativas
- O que fica mais difícil. **Toda decisão tem custo**; ADR sem consequência
  negativa não foi honesta.

### Neutras
- O que muda sem ser melhor nem pior

## Impacto na documentação

Atualizados **no mesmo PR** desta ADR:

- [ ] `docs/arquitetura/...`
- [ ] README do módulo afetado
- [ ] Configuração da CI, se a decisão mexe em fronteira
- [ ] `DEC-NNN` marcada como 🟢 e removida da lista de abertas

## Quando revisitar

Que sinal indicaria que esta decisão deixou de valer? (volume, custo, mudança
regulatória, fim de suporte do fornecedor)

Uma decisão sem gatilho de revisão vira dogma.
