-- Trilha de auditoria somente-insercao — NR-025. RF-123, RF-124. US-061.
--
-- "Quero saber quem fez o que para resolver divergencia com meu funcionario."
-- Uma trilha que aceita correcao nao resolve divergencia nenhuma: quem tem
-- acesso para alterar o dado costuma ter acesso para alterar o registro do que
-- fez. Por isso a garantia mora AQUI, e nao no tipo do TypeScript — a porta em
-- `core` nao oferece update nem delete, mas o proximo `psql` ignoraria isso.

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SEM chave estrangeira para `companies`, e de proposito.
  --
  -- Toda outra tabela de negocio referencia a empresa com ON DELETE RESTRICT.
  -- Aqui isso criaria uma amarra circular: as linhas nunca podem ser apagadas
  -- (e o ponto da tabela), entao a FK tornaria a empresa indeletavel para
  -- sempre. Prova nao pode depender da existencia daquilo que ela prova.
  --
  -- A coluna continua sendo `company_id` e continua sujeita a RLS: o
  -- isolamento entre lojas vale igual, so a integridade referencial e que sai.
  company_id  uuid NOT NULL,

  -- Nome da entidade no glossario: `Customer`, `Sale`, `Product`.
  entity      text NOT NULL,
  entity_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'cancelled')),

  -- O trio da US-061: quem, por onde, quando.
  --
  -- `actor_id` tambem sem FK, pelo mesmo motivo — e porque o autor pode ser
  -- desligado da empresa sem que o que ele fez deixe de valer.
  actor_id    uuid NOT NULL,
  -- app | whatsapp. `text` + CHECK, como o resto do schema; enum nativo nao
  -- volta atras, e canal e a lista mais provavel de crescer.
  channel     text NOT NULL CHECK (channel IN ('app', 'whatsapp')),
  occurred_at timestamptz NOT NULL,

  -- So os campos que mudaram, nao o registro inteiro — quem esta resolvendo
  -- divergencia com um funcionario nao quer diff, quer resposta.
  -- `jsonb` e nao `json`: consultavel por campo, e sem espaco em branco.
  before      jsonb,
  after       jsonb,

  created_at  timestamptz NOT NULL DEFAULT now(),

  -- `created` nao tem estado anterior; o resto tem.
  CONSTRAINT audit_log_criacao_sem_antes
    CHECK (action <> 'created' OR before IS NULL)
);

COMMENT ON TABLE audit_log IS
  'Trilha de auditoria somente-insercao (RF-123, RF-124). UPDATE e DELETE sao bloqueados por gatilho.';

-- A pergunta que a tela faz: "o que aconteceu com este cliente?", do mais
-- recente para o mais antigo.
CREATE INDEX audit_log_por_entidade
  ON audit_log (company_id, entity, entity_id, occurred_at DESC);

-- A outra pergunta: "o que o Joao fez ontem?" — a que resolve a divergencia.
CREATE INDEX audit_log_por_autor ON audit_log (company_id, actor_id, occurred_at DESC);

SELECT enable_tenant_isolation('audit_log');

-- ---------------------------------------------------------------------------
-- Somente insercao — RF-124
-- ---------------------------------------------------------------------------

-- Por que gatilho, e nao `REVOKE UPDATE, DELETE`:
--
-- REVOKE depende de a aplicacao conectar com um papel que nao seja o dono da
-- tabela. Em muitos ambientes ela conecta com o mesmo papel que criou o schema
-- — foi exatamente o caso que a CI pegou com RLS (ver o README de `db`) — e o
-- dono ignora a propria concessao. O gatilho vale para o dono tambem.
--
-- Superusuario ainda consegue escapar, desligando gatilho ou usando
-- `session_replication_role = replica`. Isso e aceito: quem tem superusuario ja
-- pode reescrever o banco inteiro, e nenhuma barreira dentro do banco resolve
-- isso — a barreira ali e nao dar superusuario a aplicacao.
CREATE OR REPLACE FUNCTION audit_log_somente_insercao() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log e somente-insercao: % nao e permitido.', TG_OP
    USING HINT = 'Trilha que aceita correcao deixa de ser prova — RF-124.';
END
$$;

COMMENT ON FUNCTION audit_log_somente_insercao() IS
  'Recusa UPDATE, DELETE e TRUNCATE em audit_log (RF-124).';

CREATE TRIGGER audit_log_sem_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_somente_insercao();

CREATE TRIGGER audit_log_sem_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_somente_insercao();

-- TRUNCATE nao dispara gatilho de linha — ele nao percorre linha nenhuma, que
-- e justamente o que o torna rapido. Sem este terceiro gatilho, um
-- `TRUNCATE audit_log` apagaria a trilha inteira passando por cima dos outros
-- dois. Por isso `FOR EACH STATEMENT`.
CREATE TRIGGER audit_log_sem_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_somente_insercao();
