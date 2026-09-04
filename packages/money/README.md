# money

Valor monetário como inteiro em centavos.

**Estado:** ✅ implementado · 21 testes · `NR-003`

## Responsabilidade

Representar e operar sobre dinheiro sem erro de ponto flutuante.

```ts
0.1 + 0.2 === 0.3 // false — e é assim que o caixa não fecha
```

Em ERP isso não é curiosidade acadêmica: é a diferença entre o número do
sistema bater com o do banco ou não. [RNF-044](../../docs/produto/requisitos-nao-funcionais.md)
proíbe `number` com casa decimal em qualquer valor monetário — em variável, em
campo de banco e em corpo de requisição.

**O que não faz:** conversão de moeda, cotação, formatação específica de
relatório, arredondamento fiscal (isso é `domain`).

## Fronteiras

|                  |                                                         |
| ---------------- | ------------------------------------------------------- |
| **Expõe**        | `Money`, `Currency`                                     |
| **Consome**      | nada                                                    |
| **Depende de**   | **nenhum pacote** — é a folha da árvore de dependências |
| **Quem depende** | todos                                                   |

## API

```ts
// Construção
Money.fromCents(4990)          // canônica
Money.parse('49,90')           // de string — aceita 'R$ 1.234,56', '1,234.56', '129.9'
Money.zero()

// Aritmética
a.add(b) · a.subtract(b) · a.multiply(3) · a.percentage(3.49)
Money.sum([a, b, c])

// Divisão sem perda
total.allocate(3)              // soma das partes === total, sempre

// Comparação
a.equals(b) · a.compare(b) · a.isZero() · a.isNegative()

// Saída
m.cents                        // bigint — a verdade
m.toDecimalString()            // '49.90' — para API
m.format()                     // 'R$ 49,90' — para tela
m.toJSON()                     // { cents: '4990', currency: 'BRL' }
```

### `parse` aceita string, nunca `number`

De propósito. É assim que valor chega de API externa — o
[Asaas](../../docs/arquitetura/integracoes/asaas.md#cobrança-da-venda--o-que-recebemos-e-gravamos)
devolve `129.9` em `value` / `netValue`. Aceitar
`number` seria deixar o erro de precisão entrar pela porta da frente.

### `allocate` distribui o resto

```ts
Money.parse('100.00').allocate(3)
// [33.34, 33.33, 33.33]   soma = 100.00 exato
```

O resto vai para as **primeiras** parcelas, não para a última: é a última que o
cliente lembra, e uma parcela final destoante gera dúvida.
[RNF-045](../../docs/produto/requisitos-nao-funcionais.md).

### `toJSON` serializa centavos

Nunca decimal. Serializar `49.90` reintroduz o problema exatamente na fronteira
onde ele é mais difícil de detectar.

## Testes

```bash
pnpm --filter @na-regua/money test
```

21 testes, incluindo um de **propriedade** que verifica a invariante de
`allocate` sobre 2.412 combinações (0 a 200 centavos × 1 a 12 parcelas). Para
regra financeira, três exemplos escolhidos a dedo não provam nada — a
invariante, sim.

Cobertura mínima: **90%** ([RNF-068](../../docs/produto/requisitos-nao-funcionais.md)).

## Variáveis de ambiente

Nenhuma.

## Decisões

| Escolha                         | Por quê                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `bigint`, não `number`          | valores grandes (faturamento anual em centavos) passam de `Number.MAX_SAFE_INTEGER` em cenários plausíveis                 |
| Imutável                        | `a.add(b)` devolve novo; mutação de dinheiro compartilhado é bug difícil de achar                                          |
| Só `BRL` por enquanto           | multimoeda não está no [escopo do MVP](../../docs/produto/escopo-mvp.md#fora-do-mvp); o tipo já existe para quando estiver |
| `percentage` com meio-para-cima | convenção comercial brasileira                                                                                             |
