-- `current_company_id()` falha com mensagem propria — RF-121.
--
-- Migration nova, e nao edicao da 0001: migration aplicada e imutavel, e o
-- runner recusa rodar quando o conteudo muda (e recusa com razao).
--
-- ## O que a CI mostrou
--
-- A versao anterior era `SELECT current_setting('app.company_id')::uuid`, sem
-- `missing_ok`, apostando que o proprio `current_setting` lancaria
-- "unrecognized configuration parameter" quando o tenant nao estivesse
-- definido. Ele lanca — **uma vez**. Depois que a variavel e definida na
-- sessao, ainda que com escopo local a transacao, o parametro passa a ser
-- conhecido, e le-lo numa transacao seguinte devolve **string vazia** em vez de
-- erro.
--
-- O teste flagrou assim:
--
--   expected to throw /app\.company_id|unrecognized configuration/
--   but got 'invalid input syntax for type uuid: ""'
--
-- A consulta continuava falhando, o que salvou o isolamento. Mas falhava por
-- acidente — no cast — e nao por decisao. Duas consequencias:
--
-- 1. A mensagem que chegaria ao suporte seria `invalid input syntax for type
--    uuid: ""`, que nao diz nada sobre tenant faltando.
-- 2. A protecao dependia de a coluna ser `uuid`. Numa tabela cuja chave de
--    tenant fosse `text`, `company_id = ''` nao daria erro nenhum: devolveria
--    zero linhas em silencio — exatamente o que RF-121 existe para evitar.
--
-- Agora a funcao verifica e lanca por conta propria, cobrindo os dois casos
-- (nunca definida e definida-e-esvaziada) com uma mensagem so.

CREATE OR REPLACE FUNCTION current_company_id() RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  AS $$
DECLARE
  -- `missing_ok => true` aqui e deliberado, e nao contradiz o comentario da
  -- 0001: quem decide o que fazer com a ausencia passou a ser esta funcao, em
  -- vez de o comportamento incidental do `current_setting`.
  bruto text := current_setting('app.company_id', true);
BEGIN
  IF bruto IS NULL OR bruto = '' THEN
    RAISE EXCEPTION
      'Consulta sem empresa no contexto: app.company_id nao esta definido.'
      -- Sem ERRCODE: fica o P0001 (raise_exception) padrao do plpgsql.
      -- `insufficient_privilege` seria 42501, que alguem mapearia para 403 — e
      -- a doc e explicita que recurso de outro tenant responde 404 e nao 403.
      -- De todo modo isto nao e falta de permissao: e falta de CONTEXTO, ou
      -- seja, bug de quem chamou fora do withTenant.
      USING HINT = 'Toda leitura ou escrita de dado de negocio passa por withTenant — packages/db/README.md.';
  END IF;

  RETURN bruto::uuid;
END
$$;

COMMENT ON FUNCTION current_company_id() IS
  'Empresa do contexto de execucao. Lanca com mensagem propria se app.company_id nao estiver definido (RF-121).';
