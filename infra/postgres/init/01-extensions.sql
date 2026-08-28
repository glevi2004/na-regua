-- Executado uma unica vez, na criacao do volume do Postgres.
-- Para reexecutar: pnpm infra:reset

-- Geracao de UUID no banco. UUIDv7 (ordenavel por tempo) chega no Postgres 18;
-- ate la, o id e gerado na aplicacao e esta extensao serve a defaults e seeds.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Busca por nome de produto e de cliente sem acento e com erro de digitacao
-- (RF-029: buscar produto por nome).
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Papel usado pelas migrations. Diferente do papel da aplicacao porque
-- migration precisa enxergar todas as linhas, ignorando RLS
-- (docs/arquitetura/dados.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'naregua_migrator') THEN
    CREATE ROLE naregua_migrator LOGIN PASSWORD 'naregua' BYPASSRLS;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE naregua TO naregua_migrator;
