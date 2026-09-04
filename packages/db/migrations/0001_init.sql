-- Schema enxuto: so o que o lojista informa, o que vai para Focus/Asaas/CEP
-- e o que volta dessas APIs. Satelites evitam coluna nula em toda empresa.
-- RLS com FORCE: o dono da tabela tambem obedece. Superuser continua bypass
-- — a aplicacao usa naregua_app (NOSUPERUSER).

CREATE TABLE companies (
  id uuid PRIMARY KEY,
  legal_name text NOT NULL,
  trade_name text,
  cnpj text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  state_registration text,
  municipal_registration text,
  street text NOT NULL,
  street_number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  city_ibge_code text,
  tax_regime text NOT NULL,
  opted_reforma_hibrida boolean NOT NULL DEFAULT false,
  tax_rate numeric(7, 4),
  whatsapp_linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_cnpj_unique UNIQUE (cnpj),
  CONSTRAINT companies_tax_regime_check CHECK (
    tax_regime IN ('mei', 'simples_nacional', 'lucro_presumido', 'lucro_real')
  )
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  -- Nulo so entre o cadastro da conta e /app/empresa (jornada A).
  company_id uuid REFERENCES companies (id),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_check CHECK (role IN ('owner', 'staff', 'platform_admin'))
);

CREATE INDEX users_company_id_idx ON users (company_id);

-- Linha so existe quando a empresa encaminha A1/CSC/flags (elegivel).
CREATE TABLE company_focus (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  focus_company_id text,
  focus_token_secret_ref text,
  nfce_enabled boolean NOT NULL DEFAULT false,
  nfse_enabled boolean NOT NULL DEFAULT false,
  certificate_status text NOT NULL DEFAULT 'missing',
  certificate_expires_at timestamptz,
  has_nfce_csc boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_focus_certificate_status_check CHECK (
    certificate_status IN ('missing', 'valid', 'expired', 'rejected')
  )
);

-- Linha so existe quando o lojista inicia o KYC Asaas (subconta nao-BaaS).
CREATE TABLE company_asaas (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  onboarding_status text NOT NULL DEFAULT 'not_started',
  asaas_account_id text,
  wallet_id text,
  api_key_secret_ref text,
  webhook_auth_secret_ref text,
  platform_customer_id text,
  estimated_monthly_income_cents bigint,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_asaas_onboarding_status_check CHECK (
    onboarding_status IN ('not_started', 'pending', 'approved', 'rejected')
  )
);

CREATE TABLE customers (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  notes text,
  wallet_limit_cents bigint NOT NULL DEFAULT 0,
  wallet_balance_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customers_company_created_idx ON customers (company_id, created_at DESC);
CREATE INDEX customers_company_document_idx ON customers (company_id, document)
  WHERE document IS NOT NULL;
CREATE INDEX customers_company_phone_idx ON customers (company_id, phone)
  WHERE phone IS NOT NULL;

-- Id do cliente na subconta Asaas. Linha so quando a cobranca precisa de customer.
CREATE TABLE customer_asaas (
  customer_id uuid PRIMARY KEY REFERENCES customers (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies (id),
  asaas_customer_id text NOT NULL
);

CREATE INDEX customer_asaas_company_idx ON customer_asaas (company_id);

-- Endereco so quando tomador/destinatario precisa dele na nota.
CREATE TABLE customer_addresses (
  customer_id uuid PRIMARY KEY REFERENCES customers (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies (id),
  street text NOT NULL,
  street_number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  city_ibge_code text
);

CREATE INDEX customer_addresses_company_idx ON customer_addresses (company_id);

CREATE TABLE products (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  kind text NOT NULL,
  description text NOT NULL,
  barcode text,
  unit_of_measure text NOT NULL,
  sale_price_cents bigint NOT NULL,
  cost_price_cents bigint NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  tax_rate numeric(7, 4),
  category text,
  supplier text,
  ncm text,
  codigo_tributacao_nacional_iss text,
  codigo_nbs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_kind_check CHECK (kind IN ('product', 'service')),
  CONSTRAINT products_kind_fiscal_check CHECK (
    (kind = 'product' AND codigo_tributacao_nacional_iss IS NULL AND codigo_nbs IS NULL)
    OR (kind = 'service' AND ncm IS NULL)
  )
);

CREATE INDEX products_company_created_idx ON products (company_id, created_at DESC);
CREATE UNIQUE INDEX products_company_barcode_idx ON products (company_id, barcode)
  WHERE barcode IS NOT NULL;

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  product_id uuid NOT NULL REFERENCES products (id),
  quantity_delta integer NOT NULL,
  reason text NOT NULL,
  sale_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_company_created_idx ON inventory_movements (company_id, created_at DESC);

CREATE TABLE sales (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  customer_id uuid REFERENCES customers (id),
  number integer NOT NULL,
  status text NOT NULL,
  gross_amount_cents bigint NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  tax_amount_cents bigint NOT NULL,
  card_fee_amount_cents bigint NOT NULL,
  net_amount_cents bigint NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_status_check CHECK (status IN ('open', 'settled', 'cancelled', 'returned')),
  CONSTRAINT sales_company_number_unique UNIQUE (company_id, number)
);

CREATE INDEX sales_company_created_idx ON sales (company_id, created_at DESC);

CREATE TABLE sale_items (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  sale_id uuid NOT NULL REFERENCES sales (id),
  product_id uuid NOT NULL REFERENCES products (id),
  quantity integer NOT NULL,
  unit_price_cents bigint NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  ncm text,
  codigo_tributacao_nacional_iss text,
  codigo_nbs text
);

CREATE INDEX sale_items_company_sale_idx ON sale_items (company_id, sale_id);

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES sales (id);

CREATE TABLE payments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  sale_id uuid NOT NULL REFERENCES sales (id),
  method text NOT NULL,
  amount_cents bigint NOT NULL,
  installments integer,
  brand text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_method_check CHECK (method IN ('cash', 'pix', 'boleto', 'debit', 'credit', 'wallet'))
);

CREATE INDEX payments_company_sale_idx ON payments (company_id, sale_id);

-- Colunas Asaas so na linha online. Dinheiro/maquininha nao tem satelite.
CREATE TABLE payment_asaas (
  payment_id uuid PRIMARY KEY REFERENCES payments (id),
  company_id uuid NOT NULL REFERENCES companies (id),
  provider_payment_id text,
  provider_status text,
  checkout_url text,
  provider_event_id text,
  billing_type text,
  pix_payload text,
  bank_slip_url text,
  identification_field text,
  due_date date,
  card_token_ref text,
  CONSTRAINT payment_asaas_event_id_unique UNIQUE (provider_event_id)
);

CREATE INDEX payment_asaas_company_idx ON payment_asaas (company_id);

CREATE TABLE invoices (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  sale_id uuid NOT NULL REFERENCES sales (id),
  kind text NOT NULL,
  status text NOT NULL,
  provider_ref text NOT NULL,
  provider_status_code text,
  provider_message text,
  provider_payload jsonb,
  number text,
  xml_path text,
  danfe_url text,
  access_key text,
  series text,
  qr_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_kind_check CHECK (kind IN ('nfce', 'nfse')),
  CONSTRAINT invoices_status_check CHECK (
    status IN ('processing', 'authorized', 'rejected', 'contingency', 'cancelled')
  ),
  CONSTRAINT invoices_company_provider_ref_unique UNIQUE (company_id, provider_ref)
);

CREATE INDEX invoices_company_sale_idx ON invoices (company_id, sale_id);

-- Inbox de webhook: company_id preenchido depois de casar o evento.
-- Sem RLS no insert (a API ainda nao tem tenant). Ver dados.md.
CREATE TABLE webhook_events (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  company_id uuid REFERENCES companies (id),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, event_id)
);

CREATE OR REPLACE FUNCTION find_login_by_email(p_email text)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  password_hash text,
  role text,
  name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.company_id, u.password_hash, u.role, u.name
  FROM users u
  WHERE u.email = p_email
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION find_login_by_email(text) FROM PUBLIC;

-- Jornada A: conta existe antes da empresa. RLS em users exige tenant;
-- estas funcoes rodam como dono da tabela (BYPASS / superuser da migration).
CREATE OR REPLACE FUNCTION register_owner(
  p_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_password_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO users (id, name, email, phone, password_hash, role)
  VALUES (p_id, p_name, p_email, p_phone, p_password_hash, 'owner');
$$;

REVOKE ALL ON FUNCTION register_owner(uuid, text, text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION attach_user_company(p_user_id uuid, p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
     SET company_id = p_company_id, updated_at = now()
   WHERE id = p_user_id
     AND company_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user cannot be attached to company';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION attach_user_company(uuid, uuid) FROM PUBLIC;

-- RLS em toda tabela de negocio. webhook_events fica de fora no insert.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'company_focus',
    'company_asaas',
    'customers',
    'customer_addresses',
    'customer_asaas',
    'products',
    'inventory_movements',
    'sales',
    'sale_items',
    'payments',
    'payment_asaas',
    'invoices'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (company_id = current_setting(''app.company_id'')::uuid)
         WITH CHECK (company_id = current_setting(''app.company_id'')::uuid)',
      t
    );
  END LOOP;

  ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE companies FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON companies
    USING (id = current_setting('app.company_id')::uuid)
    WITH CHECK (id = current_setting('app.company_id')::uuid);
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'naregua_app') THEN
    GRANT USAGE ON SCHEMA public TO naregua_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO naregua_app;
    GRANT EXECUTE ON FUNCTION find_login_by_email(text) TO naregua_app;
    GRANT EXECUTE ON FUNCTION register_owner(uuid, text, text, text, text) TO naregua_app;
    GRANT EXECUTE ON FUNCTION attach_user_company(uuid, uuid) TO naregua_app;
  END IF;
END
$$;
