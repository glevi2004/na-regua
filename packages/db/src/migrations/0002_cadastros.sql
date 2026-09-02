-- Schema de cadastros: empresa, acesso, cliente e produto — NR-008.
-- RF-001, RF-002, RF-005, RF-009, RF-016, RF-017, RF-018, RF-019.
--
-- Convencoes em docs/arquitetura/dados.md#convenções-de-schema: tabela plural
-- em snake_case, dinheiro em bigint de centavos, timestamptz em UTC com sufixo
-- _at, sem enum nativo (migrar dói), e todo indice comecando por company_id
-- porque com RLS toda consulta filtra por ele.
--
-- Nota sobre percentual: dados.md documenta `numeric(7,4)` com o exemplo
-- `0.1250 = 12,5%` (fracao), mas o `rateSchema` de contracts define percentual
-- em PONTOS (18 = 18%), e contracts e o contrato unico (principio 4). Aqui a
-- coluna guarda PONTOS PERCENTUAIS — 18.0000 e 18%. Guardar fracao de um lado
-- e ponto do outro e um erro de 100x esperando a primeira venda.

-- ---------------------------------------------------------------------------
-- Isolamento da tabela raiz
-- ---------------------------------------------------------------------------

-- `companies` e o tenant, entao a coluna que a identifica e o proprio `id` —
-- ela nao tem `company_id`. Por isso nao serve `enable_tenant_isolation`, que
-- exige aquela coluna. Funcao separada em vez de um parametro opcional na
-- outra: a raiz e um caso, nao uma variacao, e nomear o caso evita alguem
-- passar a opcao errada numa tabela comum.
CREATE OR REPLACE FUNCTION enable_root_tenant_isolation(alvo regclass) RETURNS void
  LANGUAGE plpgsql
  AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', alvo);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', alvo);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', alvo);
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (id = current_company_id()) WITH CHECK (id = current_company_id())', alvo);
END
$$;

COMMENT ON FUNCTION enable_root_tenant_isolation(regclass) IS
  'Isolamento da tabela raiz do tenant, onde a coluna do tenant e o proprio id.';

-- ---------------------------------------------------------------------------
-- companies — a empresa
-- ---------------------------------------------------------------------------

CREATE TABLE companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name  text NOT NULL,
  trade_name  text,
  -- So digitos, normalizado por `contracts`. 14 caracteres exatos.
  cnpj        text NOT NULL,
  email       text NOT NULL,
  phone       text NOT NULL,
  -- Regime tributario — RF-003. `text` + CHECK, nao enum nativo.
  tax_regime  text NOT NULL DEFAULT 'simples'
                CHECK (tax_regime IN ('simples', 'presumido', 'real', 'mei')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_cnpj_digitos CHECK (cnpj ~ '^[0-9]{14}$')
);

-- Unico GLOBALMENTE, e nao por tenant: um CNPJ e uma empresa no pais inteiro.
-- RF-002 pede recusar CNPJ repetido "sem revelar dados da empresa existente" —
-- a recusa acontece aqui, e traduzir o erro sem vazar razao social e de `core`.
CREATE UNIQUE INDEX companies_cnpj_unico ON companies (cnpj);

SELECT enable_root_tenant_isolation('companies');

-- Consequencia de `FORCE ROW LEVEL SECURITY` com `WITH CHECK (id =
-- current_company_id())`: para INSERIR uma empresa, o tenant do contexto ja
-- tem de ser o id dela. Parece incomodo e e a propriedade que se quer — a
-- empresa nasce sob o proprio tenant:
--
--   const id = randomUUID()
--   await withTenant(sql, id, (tx) => tx`INSERT INTO companies (id, ...) VALUES (${id}, ...)`)
--
-- A alternativa seria uma politica de INSERT com `WITH CHECK (true)`, e ela
-- abriria exatamente o buraco que o resto do arquivo fecha: qualquer contexto
-- gravando linha de qualquer empresa. Ha teste cobrindo os dois lados.

-- ---------------------------------------------------------------------------
-- users — identidade da pessoa, nao da empresa
-- ---------------------------------------------------------------------------

-- Sem `company_id` de proposito: a mesma pessoa opera mais de uma loja
-- (RF-119/RF-120, NR-014), e uma identidade por empresa duplicaria a pessoa e
-- as credenciais dela. O vinculo mora em `company_users`.
CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unico ON users (lower(email));

-- ---------------------------------------------------------------------------
-- company_users — quem acessa qual loja, com qual papel
-- ---------------------------------------------------------------------------

CREATE TABLE company_users (
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  -- Os mesmos valores de `roleSchema` em contracts. `text` + CHECK em vez de
  -- tabela de dominio porque o conjunto e fechado e pequeno, e em vez de enum
  -- nativo porque acrescentar valor a enum no Postgres nao volta atras.
  role       text NOT NULL CHECK (role IN ('owner', 'staff', 'accountant', 'platform_admin')),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

-- Achar as lojas de uma pessoa (a tela de trocar de empresa) sem varrer tudo.
CREATE INDEX company_users_por_usuario ON company_users (user_id);

SELECT enable_tenant_isolation('company_users');

-- Agora que `company_users` existe, `users` pode ser isolada por ela.
--
-- `users` nao tem `company_id`, mas isso NAO significa que ela possa ser lida
-- por qualquer tenant: e-mail e telefone sao dado pessoal. A politica diz que
-- so se enxerga a pessoa que tem vinculo com a empresa do contexto.
--
-- A subconsulta roda com a politica de `company_users` ativa, entao ela por si
-- ja esta restrita a empresa do contexto — e por isso a condicao e simples.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (EXISTS (SELECT 1 FROM company_users cu WHERE cu.user_id = users.id))
  WITH CHECK (true);

COMMENT ON POLICY tenant_isolation ON users IS
  'Enxerga apenas quem tem vinculo com a empresa do contexto, via company_users.';

-- ---------------------------------------------------------------------------
-- categories — existe porque products aponta para ela
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_nome_unico ON categories (company_id, lower(name));

SELECT enable_tenant_isolation('categories');

-- ---------------------------------------------------------------------------
-- customers — o cliente da loja
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  -- Nome e o unico obrigatorio — RF-009 pede "apenas nome e telefone", e no
  -- balcao o telefone as vezes vem depois. Exigir mais e travar a venda.
  name                text NOT NULL,
  document            text,
  phone               text,
  email               text,
  notes               text,
  -- Fiado — RF-013. Limite e o teto; saldo e quanto deve agora.
  wallet_limit_cents  bigint NOT NULL DEFAULT 0 CHECK (wallet_limit_cents >= 0),
  wallet_balance_cents bigint NOT NULL DEFAULT 0,
  -- Consentimento de mensagem — RF-016. Nulo = nunca houve manifestacao, que e
  -- diferente de opt-out: uma exige pedir, a outra proibe pedir de novo.
  whatsapp_consent_at timestamptz,
  whatsapp_opt_out_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Cliente sai da lista sem sair do historico de vendas — dados.md#exclusão.
  deleted_at          timestamptz
);

-- RF-010: detectar duplicado por telefone ou CPF. Parciais porque os dois
-- campos sao opcionais, e indice sobre um monte de NULL nao serve para nada.
CREATE INDEX customers_por_telefone ON customers (company_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX customers_por_documento ON customers (company_id, document)
  WHERE document IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX customers_por_nome ON customers (company_id, lower(name))
  WHERE deleted_at IS NULL;

SELECT enable_tenant_isolation('customers');

-- ---------------------------------------------------------------------------
-- products — o que a loja vende
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  description      text NOT NULL,
  -- EAN/GTIN lido no balcao — RF-017, RF-018. Opcional: granel nao tem.
  barcode          text,
  -- Codigo interno gerado quando nao ha codigo de barras — RF-019.
  internal_code    text NOT NULL,
  unit_of_measure  text NOT NULL
                     CHECK (unit_of_measure IN ('un','kg','g','l','ml','m','cm','cx','pct')),
  sale_price_cents bigint NOT NULL CHECK (sale_price_cents >= 0),
  cost_price_cents bigint NOT NULL DEFAULT 0 CHECK (cost_price_cents >= 0),
  -- PONTOS percentuais: 18.0000 e 18%. Ver a nota no topo do arquivo.
  tax_rate         numeric(7,4) CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),
  -- Saldo atual. A trilha que o mantem sao os movimentos de estoque (NR-023);
  -- aqui fica o saldo para a consulta de balcao nao somar movimento a cada leitura.
  stock_quantity   integer NOT NULL DEFAULT 0,
  min_stock        integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  category_id      uuid REFERENCES categories (id) ON DELETE SET NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by       uuid REFERENCES users (id) ON DELETE SET NULL,
  deleted_at       timestamptz
);

-- Codigo de barras unico POR EMPRESA, nao global: duas lojas vendem o mesmo
-- produto, e o mesmo EAN nas duas e o caso normal.
CREATE UNIQUE INDEX products_barcode_unico ON products (company_id, barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX products_codigo_interno_unico ON products (company_id, internal_code)
  WHERE deleted_at IS NULL;

CREATE INDEX products_por_descricao ON products (company_id, lower(description))
  WHERE deleted_at IS NULL;

-- Reposicao: quem esta abaixo do minimo. Parcial, porque a lista interessa so
-- para produto ativo.
CREATE INDEX products_abaixo_do_minimo ON products (company_id, stock_quantity)
  WHERE is_active AND deleted_at IS NULL;

SELECT enable_tenant_isolation('products');
