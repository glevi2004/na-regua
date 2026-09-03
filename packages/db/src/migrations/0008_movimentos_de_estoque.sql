-- Trilha de movimentacao de estoque — RF-022, RF-023, RF-024, RF-124.
--
-- O `core` ja grava movimento desde a NR-023: `decreaseStock` recebe a origem
-- (venda, autor, instante) e a porta `InventoryUnitOfWork` declara
-- `insertMovement`. Faltava a tabela — e sem ela nenhum dos dois tem onde
-- escrever, o que torna a rota de venda (NR-027) impossivel de ligar no banco.

-- ---------------------------------------------------------------------------
-- Somente-insercao, agora reutilizavel
-- ---------------------------------------------------------------------------

-- A 0007 criou `audit_log_somente_insercao()` para uma tabela. Esta e a segunda
-- trilha imutavel do sistema, e vao existir outras: em vez de copiar o corpo,
-- a funcao passa a ser generica, e `TG_TABLE_NAME` diz de qual tabela se trata.
--
-- A `audit_log` NAO foi migrada para ela de proposito: o gatilho dela funciona,
-- esta testado, e trocar mecanismo de protecao de trilha de auditoria sem
-- necessidade e risco sem retorno. Quando houver motivo, adota esta.
CREATE OR REPLACE FUNCTION trilha_somente_insercao() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION
    '% e somente-insercao: % nao e permitido.', TG_TABLE_NAME, TG_OP
    USING HINT = 'Corrija com um movimento novo, nao alterando o antigo — RF-124.';
END
$$;

COMMENT ON FUNCTION trilha_somente_insercao() IS
  'Recusa UPDATE, DELETE e TRUNCATE em tabela de trilha imutavel (RF-124).';

-- ---------------------------------------------------------------------------
-- inventory_movements
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  product_id     uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,

  -- Um valor por CAUSA, nao por sinal — os mesmos de `movementKindSchema`.
  -- `entrada`/`saida` responderia o quanto e nunca o porque, e e o porque que
  -- faz alguem agir: "quanto sumiu por divergencia de inventario este mes?"
  kind           text NOT NULL
                   CHECK (kind IN ('adjustment', 'sale', 'sale_cancelled', 'sale_returned')),

  -- Assinado: negativo tira, positivo devolve. Nunca zero — movimento que nao
  -- move nada e ruido na trilha, e trilha com ruido e trilha que ninguem le.
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),

  -- Saldo DEPOIS deste movimento, gravado e nao recalculado. Com ele, a
  -- pergunta "qual era o saldo no dia 12?" e uma leitura; sem ele, e somar a
  -- trilha inteira e esperar que nenhuma linha tenha sumido.
  --
  -- Sem CHECK de nao-negativo: RF-028 deixa o operador vender sem saldo, e o
  -- balcao vende o que esta na prateleira quando a contagem do sistema atrasa.
  balance_after  integer NOT NULL,

  -- Obrigatorio no ajuste (RF-023 pede o motivo), nulo na baixa de venda, onde
  -- o motivo e a propria venda.
  reason         text,
  sale_id        uuid REFERENCES sales (id) ON DELETE RESTRICT,

  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES users (id) ON DELETE SET NULL,

  -- Movimento de venda aponta para a venda; ajuste manual tem motivo escrito.
  -- Sem isto, um ajuste sem motivo entraria e a trilha responderia "o saldo
  -- mudou" sem dizer por que — que e a unica coisa que se quer saber dela.
  CONSTRAINT inventory_movements_origem_declarada CHECK (
    (kind = 'adjustment' AND sale_id IS NULL AND reason IS NOT NULL)
    OR (kind <> 'adjustment' AND sale_id IS NOT NULL)
  )
);

-- Historico de um produto, do mais recente para tras: e a tela de "por que o
-- saldo esta assim?".
CREATE INDEX inventory_movements_por_produto
  ON inventory_movements (company_id, product_id, created_at DESC);

-- Os movimentos de uma venda, para o cancelamento saber o que devolver.
CREATE INDEX inventory_movements_por_venda
  ON inventory_movements (company_id, sale_id)
  WHERE sale_id IS NOT NULL;

SELECT enable_tenant_isolation('inventory_movements');

CREATE TRIGGER inventory_movements_sem_update
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION trilha_somente_insercao();

CREATE TRIGGER inventory_movements_sem_delete
  BEFORE DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION trilha_somente_insercao();

-- TRUNCATE nao dispara gatilho de linha — nao percorre linha nenhuma, que e o
-- que o torna rapido. Sem este terceiro, um TRUNCATE apagaria a trilha inteira
-- passando por cima dos outros dois.
CREATE TRIGGER inventory_movements_sem_truncate
  BEFORE TRUNCATE ON inventory_movements
  FOR EACH STATEMENT EXECUTE FUNCTION trilha_somente_insercao();

COMMENT ON TABLE inventory_movements IS
  'Trilha de estoque somente-insercao (RF-022 a RF-024, RF-124). UPDATE, DELETE e TRUNCATE bloqueados por gatilho.';
