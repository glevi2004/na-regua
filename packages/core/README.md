# core

**O núcleo.** Casos de uso.

**Estado:** 🔴 não implementado · `NR-021`, `NR-022`, `NR-023`, `NR-025`, `NR-028`…

## Responsabilidade

Toda operação de negócio ponta a ponta: `registerSale`, `settleReceivable`,
`issueInvoice`, `registerCustomer`. Com transação, autorização e auditoria.

**Também declara as portas dos adapters** — as interfaces que `fiscal`,
`whatsapp`, `banking`, `billing` e `payments` implementam. A seta aponta para
dentro: quem define o contrato é o núcleo, não o fornecedor.

**O que não faz:** cálculo (é `domain`), SQL (é `db`), HTTP (é `api`),
interpretação de linguagem (é `agent`).

## A propriedade central

`core` **não sabe** se a chamada veio do aplicativo ou do WhatsApp. Ele recebe
um comando validado e um contexto de execução:

```ts
type ExecutionContext = {
  companyId: CompanyId
  userId: UserId
  role: Role
  channel: 'app' | 'whatsapp' | 'api' | 'job'
  requestId: string
  idempotencyKey?: string
  now: Date // injetado, nunca lido de dentro
}

type UseCase<I, O> = (deps: Deps, ctx: ExecutionContext, input: I) => Promise<O>
```

A diferença entre os canais termina em `ctx.channel`. Daí para frente é o mesmo
código — mesmas validações, mesmos cálculos, mesma auditoria. **É isso que
torna a promessa do produto verificável em vez de aspiracional.**

## Fronteiras

|                       |                                                       |
| --------------------- | ----------------------------------------------------- |
| **Expõe**             | casos de uso, portas dos adapters, `ExecutionContext` |
| **Depende de**        | `domain`, `contracts`, `db`, `money`                  |
| **Proibido importar** | adapters, apps, framework HTTP                        |
| **Quem depende**      | `api`, `worker`, `agent`                              |

## Regras

| Regra                                                       | Requisito                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| O caso de uso controla a transação, não o repositório       | [RNF-046](../../docs/produto/requisitos-nao-funcionais.md) |
| Escrita com valor é idempotente por chave                   | [RNF-043](../../docs/produto/requisitos-nao-funcionais.md) |
| Autorização por papel é verificada **aqui**, não no handler | senão o canal WhatsApp não a aplica                        |
| Toda alteração de dado de negócio gera auditoria            | [RF-123](../../docs/produto/requisitos-funcionais.md)      |
| Nada é apagado: cancela-se ou devolve-se                    | [RNF-040](../../docs/produto/requisitos-nao-funcionais.md) |
| Efeito externo vai para a fila, fora da transação           | erro de rede não pode desfazer venda concluída             |

O penúltimo merece detalhe: emitir nota e enviar mensagem **não** entram na
transação do banco. Vão para a fila pelo padrão _outbox_, gravado na mesma
transação e publicado depois.

## Organização

```
src/
├── index.ts
├── context.ts          ExecutionContext, tipo UseCase
├── ports/              interfaces implementadas pelos adapters
│   ├── invoice-issuer.ts
│   ├── message-sender.ts
│   ├── payment-gateway.ts
│   ├── bank-statement-provider.ts
│   └── subscription-provider.ts
├── company/  customer/  product/  inventory/
├── sale/  financial/  banking/  accounting/
└── audit/
```

## Testes

Integração contra Postgres real. Cobertura mínima: **70%**
([RNF-068](../../docs/produto/requisitos-nao-funcionais.md)).

Sempre teste o **estado parcial**: quando a operação falha no meio, nada pode
ter sido gravado.

```ts
it('nao deixa estado parcial quando a transacao falha', async () => {
  const antes = await inventoryOf(product.id)
  await expect(registerSale(deps, ctx, inputQueFalha)).rejects.toThrow()
  expect(await inventoryOf(product.id)).toBe(antes) // RNF-046
})
```

## Variáveis de ambiente

Nenhuma diretamente — recebe tudo por injeção de dependência, a partir da raiz
de composição.
