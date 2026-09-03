import type {
  NewSale,
  RegisteredSale,
  SaleProductSnapshot,
  SaleTransaction,
  StockMovementOrigin,
  UnitOfWork,
} from '@na-regua/core'
import type { Sql, TransactionSql } from 'postgres'
import { withTenant } from './tenant.js'

/**
 * Implementacao da `UnitOfWork` da venda — RNF-046.
 *
 * A seta aponta para dentro: `core` declara a porta, `db` implementa. Por isso
 * este pacote importa `core`, e nao o contrario — a dependencia inversa
 * (`core` -> `db`) existia so no `package.json`, sem nenhum import de codigo, e
 * foi removida: era o unico caminho para um ciclo entre os dois.
 *
 * Tudo dentro de `transaction` roda na MESMA transacao do Postgres, com
 * `app.company_id` definido. Se qualquer passo falhar, o banco desfaz — nao
 * sobra venda sem estoque baixado, nem estoque baixado sem venda.
 */
export function createSaleUnitOfWork(sql: Sql): UnitOfWork {
  return {
    transaction: (companyId, fn) => withTenant(sql, companyId, (tx) => fn(escopo(tx, companyId))),
  }
}

function escopo(tx: TransactionSql, companyId: string): SaleTransaction {
  return {
    products: {
      findManyByIds: async (ids) => {
        if (ids.length === 0) return []

        /*
         * Uma consulta para todos os ids, e nao uma por item. Trinta itens no
         * carrinho seriam trinta idas ao banco com a transacao aberta — e
         * transacao aberta por mais tempo e lock por mais tempo.
         *
         * Sem filtro por `company_id`: a politica de RLS ja restringe, e
         * repetir o filtro aqui daria a impressao de que ele e o que protege.
         */
        return tx<SaleProductSnapshot[]>`
          SELECT id,
                 description,
                 unit_of_measure  AS "unitOfMeasure",
                 sale_price_cents AS "salePriceCents",
                 cost_price_cents AS "costPriceCents",
                 stock_quantity   AS "stockQuantity",
                 tax_rate         AS "taxRate"
            FROM products
           WHERE id = ANY(${ids as unknown as string[]}::uuid[])
             AND deleted_at IS NULL
        `
      },
    },

    insertSale: async (venda) => inserirVenda(tx, companyId, venda),

    decreaseStock: async (itens, origem) => baixarEstoque(tx, companyId, itens, origem),

    findByIdempotencyKey: async (key) => {
      const [linha] = await tx<RegisteredSale[]>`
        SELECT id,
               number,
               gross_amount_cents AS "grossAmountCents",
               net_amount_cents   AS "netAmountCents",
               change_cents       AS "changeCents",
               created_at         AS "createdAt"
          FROM sales
         WHERE idempotency_key = ${key}
      `
      return linha
    },
  }
}

/**
 * Grava venda, itens, pagamentos e recebiveis.
 *
 * Junto, porque nao existe estado intermediario valido: venda sem item nao e
 * venda, e recebivel sem venda e divida de ninguem.
 */
async function inserirVenda(
  tx: TransactionSql,
  companyId: string,
  venda: NewSale,
): Promise<RegisteredSale> {
  /* Sequencial por empresa, atomico — a funcao da migration 0003 trava a
     linha do contador no proprio UPDATE. */
  const [contador] = await tx<{ next_counter: string }[]>`SELECT next_counter('sale')`
  const numero = Number(contador!.next_counter)

  const [gravada] = await tx<RegisteredSale[]>`
    INSERT INTO sales ${tx({
      company_id: companyId,
      number: numero,
      customer_id: venda.customerId ?? null,
      channel: venda.channel,
      gross_amount_cents: venda.grossAmountCents,
      discount_cents: venda.discountCents,
      tax_amount_cents: venda.taxAmountCents,
      card_fee_amount_cents: venda.cardFeeAmountCents,
      cost_amount_cents: venda.costAmountCents,
      net_amount_cents: venda.netAmountCents,
      change_cents: venda.changeCents,
      notes: venda.notes ?? null,
      idempotency_key: venda.idempotencyKey ?? null,
      created_by: venda.createdBy,
      created_at: venda.createdAt,
      updated_at: venda.createdAt,
    })}
    RETURNING id,
              number,
              gross_amount_cents AS "grossAmountCents",
              net_amount_cents   AS "netAmountCents",
              change_cents       AS "changeCents",
              created_at         AS "createdAt"
  `

  const saleId = gravada!.id

  if (venda.items.length > 0) {
    await tx`
      INSERT INTO sale_items ${tx(
        venda.items.map((item) => ({
          company_id: companyId,
          sale_id: saleId,
          product_id: item.productId,
          description: item.description,
          unit_of_measure: item.unitOfMeasure,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
          cost_price_cents: item.costPriceCents,
          discount_cents: item.discountCents,
          total_cents: item.totalCents,
          created_at: venda.createdAt,
        })),
      )}
    `
  }

  if (venda.payments.length > 0) {
    await tx`
      INSERT INTO payments ${tx(
        venda.payments.map((pagamento) => ({
          company_id: companyId,
          sale_id: saleId,
          method: pagamento.method,
          amount_cents: pagamento.amountCents,
          installments: pagamento.installments ?? null,
          brand: pagamento.brand ?? null,
          card_fee_cents: pagamento.cardFeeCents,
          created_at: venda.createdAt,
        })),
      )}
    `
  }

  if (venda.receivables.length > 0) {
    await tx`
      INSERT INTO receivables ${tx(
        venda.receivables.map((recebivel) => ({
          company_id: companyId,
          sale_id: saleId,
          customer_id: recebivel.customerId ?? null,
          origin: 'sale',
          description: recebivel.description,
          amount_cents: recebivel.amountCents,
          net_amount_cents: recebivel.netAmountCents,
          settled_amount_cents: recebivel.settledAt === undefined ? 0 : recebivel.amountCents,
          due_date: recebivel.dueDate,
          installment_number: recebivel.installmentNumber,
          installment_count: recebivel.installmentCount,
          /* `settled_at` e `status` andam juntos — o CHECK
             `receivables_liquidado_completo` recusa um sem o outro. */
          status: recebivel.settledAt === undefined ? 'open' : 'settled',
          settled_at: recebivel.settledAt ?? null,
          created_by: venda.createdBy,
          created_at: venda.createdAt,
          updated_at: venda.createdAt,
        })),
      )}
    `
  }

  return gravada!
}

/**
 * Baixa o estoque e deixa rastro na trilha — RF-024.
 *
 * O `UPDATE ... RETURNING` devolve o saldo que passou a valer, e e ele que vai
 * para `balance_after`. Ler o saldo antes e subtrair na aplicacao daria o valor
 * errado sob concorrencia: duas vendas do mesmo produto no mesmo instante
 * leriam o mesmo saldo inicial e gravariam a mesma "sobra".
 *
 * Permite negativo de proposito: RF-028 deixa o operador prosseguir sem saldo,
 * porque o produto esta na mao do cliente e a contagem do sistema atrasa.
 */
async function baixarEstoque(
  tx: TransactionSql,
  companyId: string,
  itens: readonly { productId: string; quantity: number }[],
  origem: StockMovementOrigin,
): Promise<void> {
  for (const item of itens) {
    const [produto] = await tx<{ stock_quantity: number }[]>`
      UPDATE products
         SET stock_quantity = stock_quantity - ${item.quantity},
             updated_at = ${origem.createdAt}
       WHERE id = ${item.productId}
      RETURNING stock_quantity
    `

    if (!produto) {
      /* A politica de RLS esconde produto de outra empresa, e o caso de uso ja
         conferiu que todos existem. Chegar aqui significa que algo mudou entre
         a leitura e a escrita — dentro da mesma transacao, o que nao deveria
         acontecer. Falhar alto e melhor que gravar movimento sem saldo. */
      throw new Error(
        `Produto ${item.productId} desapareceu no meio da transacao da venda ${origem.saleId}.`,
      )
    }

    await tx`
      INSERT INTO inventory_movements ${tx({
        company_id: companyId,
        product_id: item.productId,
        kind: 'sale',
        quantity_delta: -item.quantity,
        balance_after: produto.stock_quantity,
        reason: null,
        sale_id: origem.saleId,
        created_by: origem.createdBy,
        created_at: origem.createdAt,
      })}
    `
  }
}
