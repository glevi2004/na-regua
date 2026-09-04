-- Plano de contas, classificacao e DRE — NR-032 e NR-077. RF-081 a RF-086.
--
-- `core` desenhou o plano de contas, a classificacao e o DRE na NR-032, todos
-- contra repositorio em memoria. Esta e a tabela por tras — ela faltava, e era
-- o que impedia o relatorio de existir. A NR-076 ja tinha esbarrado nisso: a
-- rota de conciliacao RECUSA `accountId` porque nao havia para onde apontar.
--
-- Convencoes em docs/arquitetura/dados.md#convenções-de-schema.

CREATE TABLE accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,

  name        text NOT NULL,

  -- Quatro tipos, e nao a arvore contabil completa. O lojista nao quer plano de
  -- contas, quer saber se o mes fechou no azul (US-041) — e uma estrutura com
  -- grupos, subgrupos e codigo hierarquico exigiria que ele entendesse
  -- contabilidade para lancar a conta de luz. Quem precisa da estrutura inteira
  -- e o contador, e ele recebe a exportacao (RF-087).
  type        text NOT NULL CHECK (type IN ('revenue', 'deduction', 'cost', 'expense')),

  -- Conta do plano padrao nao pode ser apagada — RF-081, RF-082.
  is_default  boolean NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES users (id) ON DELETE SET NULL
);

COMMENT ON TABLE accounts IS
  'Plano de contas por empresa (RF-081, RF-082). Quatro tipos, sem hierarquia.';

-- `lower(name)`: "Aluguel" e "aluguel" sao a mesma conta. Sem isto o lojista
-- criaria a segunda sem perceber e o DRE mostraria a despesa partida em duas
-- linhas que somam certo e leem errado.
CREATE UNIQUE INDEX accounts_nome_unico ON accounts (company_id, lower(name));

-- A tela do plano agrupa por tipo e ordena por nome dentro dele.
CREATE INDEX accounts_por_tipo ON accounts (company_id, type, name);

SELECT enable_tenant_isolation('accounts');

-- ---------------------------------------------------------------------------
-- A classificacao do lancamento — RF-083
-- ---------------------------------------------------------------------------

ALTER TABLE payables    ADD COLUMN account_id uuid REFERENCES accounts (id) ON DELETE RESTRICT;
ALTER TABLE receivables ADD COLUMN account_id uuid REFERENCES accounts (id) ON DELETE RESTRICT;

COMMENT ON COLUMN payables.account_id IS
  'Conta contabil do lancamento (RF-083). Nulo cai em "Sem classificacao" no DRE.';

-- `ON DELETE RESTRICT` e a metade da RF-082 que o banco garante: apagar conta
-- com lancamento nao pode ser possivel. O caso de uso ja recusa com uma
-- mensagem boa ("esta conta tem 42 lancamentos"), e aqui e a ultima linha de
-- defesa — sem ela, um `DELETE` fora do caso de uso deixaria lancamentos
-- apontando para conta que nao existe, e o DRE somaria errado sem avisar.

-- Contar os lancamentos de uma conta (RF-082) e a consulta desses indices.
-- Parciais porque lancamento sem classificacao nunca e procurado por conta.
CREATE INDEX payables_por_conta ON payables (company_id, account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX receivables_por_conta ON receivables (company_id, account_id)
  WHERE account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- `payables.category` sai de cena
-- ---------------------------------------------------------------------------
--
-- Ela nasceu na 0010 (NR-074) como "classificacao contabil, para o relatorio do
-- contador" — texto livre, invencao minha: a RF-055 nao pede campo nenhum de
-- categoria. Agora que a classificacao de verdade existe, manter as duas daria
-- DUAS respostas para "como esta conta esta classificada", e elas divergiriam
-- na primeira vez que alguem editasse uma so. O DRE leria uma e a tela de
-- contas mostraria a outra.
--
-- `DROP` e nao backfill: a coluna nunca teve dado em producao (o produto nao
-- subiu), e converter texto livre em id de conta exigiria adivinhar o que o
-- lojista quis dizer — que e a decisao que a tela de classificacao existe para
-- ele tomar.
ALTER TABLE payables DROP COLUMN category;
