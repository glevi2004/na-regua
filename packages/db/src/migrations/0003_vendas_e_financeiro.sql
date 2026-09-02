-- Schema de vendas e financeiro — NR-020. RF-027 a RF-044, RF-063, RF-064.
--
-- Nao existe um `sales.status` que responda tudo. O lojista pergunta quatro
-- coisas independentes — a venda existe? a nota saiu? o dinheiro entrou? o job
-- falhou? — e elas tem ciclos separados: a venda fecha ANTES da nota, o fiado e
-- venda valida sem liquidacao, e o cartao presencial nao passa pelo PSP. Cada
-- pergunta mora numa tabela, e a tela compoe
-- (docs/arquitetura/dados.md#estados-da-venda).
--
-- Venda, nota e auditoria **nunca** recebem DELETE — RNF-040. Cancelamento e
-- devolucao sao linhas novas, nao ausencia de linha.

-- ---------------------------------------------------------------------------
-- Numeracao da venda, sequencial por empresa
-- ---------------------------------------------------------------------------

-- `coalesce(max(number),0)+1` daria numero repetido sob concorrencia: duas
-- vendas simultaneas leriam o mesmo maximo. Sequence do Postgres nao serve
-- porque a numeracao e POR EMPRESA e sequence e global. Um contador com upsert
-- atomico resolve os dois: a linha da empresa e travada pelo proprio UPDATE.
CREATE TABLE company_counters (
  company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  -- Qual contador. Hoje so `sale`; nota fiscal tem numeracao propria, do fisco.
  counter     text NOT NULL CHECK (counter IN ('sale')),
  last_number bigint NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, counter)
);

SELECT enable_tenant_isolation('company_counters');

CREATE OR REPLACE FUNCTION next_counter(alvo text) RETURNS bigint
  LANGUAGE plpgsql
  AS $$
DECLARE
  proximo bigint;
BEGIN
  INSERT INTO company_counters (company_id, counter, last_number)
    VALUES (current_company_id(), alvo, 1)
  ON CONFLICT (company_id, counter)
    DO UPDATE SET last_number = company_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO proximo;

  RETURN proximo;
END
$$;

COMMENT ON FUNCTION next_counter(text) IS
  'Proximo numero sequencial da empresa do contexto, sem lacuna e sem repeticao sob concorrencia.';

-- ---------------------------------------------------------------------------
-- sales — a venda fechada
-- ---------------------------------------------------------------------------

CREATE TABLE sales (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  -- Sequencial por empresa. E o numero que o lojista fala ao telefone.
  number                bigint NOT NULL,
  -- Ausente = venda de balcao sem identificacao, que e a maioria — RF-033.
  customer_id           uuid REFERENCES customers (id) ON DELETE RESTRICT,
  status                text NOT NULL DEFAULT 'registered'
                          CHECK (status IN ('registered', 'cancelled', 'returned', 'partially_returned')),
  -- Por onde a venda entrou. Os mesmos valores de `Channel` em core: a promessa
  -- do produto e que app e WhatsApp fazem a mesma coisa, e isso so e
  -- verificavel se a origem ficar registrada.
  channel               text NOT NULL DEFAULT 'app'
                          CHECK (channel IN ('app', 'whatsapp', 'api', 'job')),

  -- Dinheiro em centavos. Todos calculados por `domain` e persistidos aqui:
  -- recalcular na leitura mudaria o passado quando a tabela de tarifas mudar.
  gross_amount_cents    bigint NOT NULL CHECK (gross_amount_cents >= 0),
  discount_cents        bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_amount_cents      bigint NOT NULL DEFAULT 0 CHECK (tax_amount_cents >= 0),
  card_fee_amount_cents bigint NOT NULL DEFAULT 0 CHECK (card_fee_amount_cents >= 0),
  -- Custo dos itens no momento da venda — base da margem, RF-040.
  cost_amount_cents     bigint NOT NULL DEFAULT 0 CHECK (cost_amount_cents >= 0),
  net_amount_cents      bigint NOT NULL,
  -- Troco de pagamento em dinheiro acima do total — RF-035.
  change_cents          bigint NOT NULL DEFAULT 0 CHECK (change_cents >= 0),
  surcharge_rate        numeric(7,4) CHECK (surcharge_rate IS NULL OR surcharge_rate >= 0),

  notes                 text,
  -- RF-036: reenvio do PDV nao pode virar segunda venda.
  idempotency_key       text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES users (id) ON DELETE SET NULL,
  -- RF-043. Sem `deleted_at`: venda cancelada continua existindo e aparecendo.
  cancelled_at          timestamptz,
  cancelled_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  cancel_reason         text,

  CONSTRAINT sales_cancelamento_completo
    CHECK ((cancelled_at IS NULL) = (status <> 'cancelled'))
);

CREATE UNIQUE INDEX sales_numero_unico ON sales (company_id, number);

-- Unico e PARCIAL: venda sem chave (a criada pelo backoffice, sem PDV) nao
-- deve colidir com outra sem chave.
CREATE UNIQUE INDEX sales_idempotencia_unica ON sales (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX sales_por_data ON sales (company_id, created_at DESC);
CREATE INDEX sales_por_cliente ON sales (company_id, customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

SELECT enable_tenant_isolation('sales');

-- ---------------------------------------------------------------------------
-- sale_items — o que foi vendido, como estava no momento da venda
-- ---------------------------------------------------------------------------

CREATE TABLE sale_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  sale_id           uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  product_id        uuid REFERENCES products (id) ON DELETE RESTRICT,

  -- COPIA da descricao e do custo no instante da venda, nao referencia viva.
  -- Preco e custo de produto mudam; a venda tem de continuar dizendo o que foi
  -- cobrado e quanto custou naquele dia, senao a margem historica se reescreve
  -- sozinha a cada reajuste.
  description       text NOT NULL,
  unit_of_measure   text NOT NULL,
  quantity          integer NOT NULL CHECK (quantity > 0),
  unit_price_cents  bigint NOT NULL CHECK (unit_price_cents >= 0),
  cost_price_cents  bigint NOT NULL DEFAULT 0 CHECK (cost_price_cents >= 0),
  discount_cents    bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents       bigint NOT NULL CHECK (total_cents >= 0),
  -- Devolucao parcial — RF-044. Nunca maior que o vendido.
  returned_quantity integer NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),

  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sale_items_devolucao_ate_o_vendido CHECK (returned_quantity <= quantity)
);

CREATE INDEX sale_items_por_venda ON sale_items (company_id, sale_id);
-- RF-029 ordena busca de produto por volume de vendas; e tambem o ranking de
-- produto do relatorio (US-041).
CREATE INDEX sale_items_por_produto ON sale_items (company_id, product_id)
  WHERE product_id IS NOT NULL;

SELECT enable_tenant_isolation('sale_items');

-- ---------------------------------------------------------------------------
-- payments — como a venda foi paga
-- ---------------------------------------------------------------------------

CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  sale_id         uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  -- Os mesmos valores de `paymentMethodSchema` em contracts.
  method          text NOT NULL
                    CHECK (method IN ('cash', 'pix', 'debit', 'credit', 'wallet')),
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  -- So faz sentido em credito — RF-038. Ausente = a vista.
  installments    integer CHECK (installments IS NULL OR (installments >= 1 AND installments <= 21)),
  brand           text CHECK (brand IS NULL OR brand IN
                    ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'unknown')),
  card_fee_cents  bigint NOT NULL DEFAULT 0 CHECK (card_fee_cents >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Parcelamento fora do credito nao existe. A mesma regra esta em
  -- `paymentInputSchema`; aqui ela e imposta pelo banco, nao pela lembranca.
  CONSTRAINT payments_parcelamento_so_no_credito
    CHECK (method = 'credit' OR installments IS NULL)
);

CREATE INDEX payments_por_venda ON payments (company_id, sale_id);

SELECT enable_tenant_isolation('payments');

-- ---------------------------------------------------------------------------
-- receivables — o dinheiro a entrar
-- ---------------------------------------------------------------------------

CREATE TABLE receivables (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  -- Nulo em recebivel avulso (RF-065), que nao vem de venda.
  sale_id              uuid REFERENCES sales (id) ON DELETE RESTRICT,
  customer_id          uuid REFERENCES customers (id) ON DELETE RESTRICT,
  origin               text NOT NULL DEFAULT 'sale' CHECK (origin IN ('sale', 'manual')),
  description          text NOT NULL,

  -- Bruto e liquido separados — RF-063 pede o LIQUIDO previsto: o que cai na
  -- conta ja sem a tarifa da adquirente. Guardar so o bruto obrigaria a
  -- recalcular a tarifa na leitura, com a tabela de hoje sobre venda de ontem.
  amount_cents         bigint NOT NULL CHECK (amount_cents > 0),
  net_amount_cents     bigint NOT NULL CHECK (net_amount_cents >= 0),
  settled_amount_cents bigint NOT NULL DEFAULT 0 CHECK (settled_amount_cents >= 0),

  due_date             date NOT NULL,
  -- Parcela N de M, em credito parcelado — RF-038.
  installment_number   integer NOT NULL DEFAULT 1 CHECK (installment_number >= 1),
  installment_count    integer NOT NULL DEFAULT 1 CHECK (installment_count >= 1),

  status               text NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'partially_settled', 'settled', 'cancelled')),
  settled_at           timestamptz,

  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT receivables_parcela_valida CHECK (installment_number <= installment_count),
  CONSTRAINT receivables_baixa_ate_o_valor CHECK (settled_amount_cents <= amount_cents),
  CONSTRAINT receivables_liquidado_completo
    CHECK ((settled_at IS NULL) = (status <> 'settled'))
);

-- Parcial, e nao total: a consulta que importa e "o que vence e ainda nao foi
-- pago". Indice sobre recebivel liquidado seria custo de escrita sem leitura.
CREATE INDEX receivables_a_vencer ON receivables (company_id, due_date)
  WHERE status IN ('open', 'partially_settled');

CREATE INDEX receivables_por_cliente ON receivables (company_id, customer_id, due_date)
  WHERE customer_id IS NOT NULL AND status IN ('open', 'partially_settled');

CREATE INDEX receivables_por_venda ON receivables (company_id, sale_id)
  WHERE sale_id IS NOT NULL;

SELECT enable_tenant_isolation('receivables');

-- ---------------------------------------------------------------------------
-- settlements — as baixas, uma linha por recebimento
-- ---------------------------------------------------------------------------

-- Tabela propria, e nao um par de colunas no recebivel, porque a baixa e
-- PARCIAL (RF-066) e reversivel (RF-067): tres pagamentos parciais e um estorno
-- sao quatro fatos com data e autor, nao um campo sobrescrito quatro vezes.
CREATE TABLE settlements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  receivable_id  uuid NOT NULL REFERENCES receivables (id) ON DELETE RESTRICT,
  amount_cents   bigint NOT NULL CHECK (amount_cents <> 0),
  method         text NOT NULL
                   CHECK (method IN ('cash', 'pix', 'debit', 'credit', 'wallet', 'transfer')),
  settled_at     timestamptz NOT NULL DEFAULT now(),
  notes          text,
  -- Estorno da baixa — RF-067. Aponta para a baixa que ele desfaz, com valor
  -- negativo: a soma das linhas continua sendo o saldo recebido.
  reverses_id    uuid REFERENCES settlements (id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES users (id) ON DELETE SET NULL,

  CONSTRAINT settlements_estorno_e_negativo
    CHECK ((reverses_id IS NULL AND amount_cents > 0) OR (reverses_id IS NOT NULL AND amount_cents < 0))
);

CREATE INDEX settlements_por_recebivel ON settlements (company_id, receivable_id, settled_at);
CREATE UNIQUE INDEX settlements_um_estorno_por_baixa ON settlements (company_id, reverses_id)
  WHERE reverses_id IS NOT NULL;

SELECT enable_tenant_isolation('settlements');

-- ---------------------------------------------------------------------------
-- sale_returns — devolucao total ou parcial
-- ---------------------------------------------------------------------------

CREATE TABLE sale_returns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  sale_id      uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reason       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX sale_returns_por_venda ON sale_returns (company_id, sale_id);

SELECT enable_tenant_isolation('sale_returns');

-- Quais itens voltaram, e quantos. RF-044 fala em "apenas os itens e o valor
-- proporcional" — sem detalhe por item nao ha como estornar o estoque certo,
-- nem saber o que ja voltou quando houver uma segunda devolucao parcial.
CREATE TABLE sale_return_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  sale_return_id uuid NOT NULL REFERENCES sale_returns (id) ON DELETE RESTRICT,
  sale_item_id   uuid NOT NULL REFERENCES sale_items (id) ON DELETE RESTRICT,
  quantity       integer NOT NULL CHECK (quantity > 0),
  amount_cents   bigint NOT NULL CHECK (amount_cents > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sale_return_items_por_devolucao
  ON sale_return_items (company_id, sale_return_id);

SELECT enable_tenant_isolation('sale_return_items');
