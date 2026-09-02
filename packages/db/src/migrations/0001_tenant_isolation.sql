-- Isolamento multi-tenant por RLS por linha — ADR-0001, origem DEC-002.
--
-- Esta migration nao cria tabela de negocio nenhuma: ela cria o MECANISMO que
-- toda tabela de negocio vai usar. As tabelas nascem na NR-008 (cadastros) e na
-- NR-020 (vendas e financeiro), e cada uma chama `enable_tenant_isolation`.
--
-- Por que uma funcao em vez de repetir o bloco de politica em cada tabela: a
-- politica escrita a mao em 30 lugares e a politica escrita errado em um deles,
-- e o unico jeito de descobrir qual e vazando dado entre lojas. Com a funcao,
-- existe uma definicao so — e mudar a regra e mudar um lugar.

-- ---------------------------------------------------------------------------
-- A empresa do contexto de execucao
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_company_id() RETURNS uuid
  LANGUAGE sql
  STABLE
  -- Sem `SECURITY DEFINER`: esta funcao nao precisa de privilegio nenhum, e
  -- dar privilegio a ela seria dar um caminho para contornar a politica.
  AS $$
    -- `current_setting` SEM o segundo argumento de proposito. Com
    -- `missing_ok => true`, a variavel ausente viraria NULL, a comparacao
    -- `company_id = NULL` daria NULL, e a consulta devolveria zero linhas em
    -- silencio. Aqui ela LANCA — RF-121. Falhar e melhor que devolver vazio:
    -- vazio parece resposta, e alguem conclui que a loja nao tem venda.
    SELECT current_setting('app.company_id')::uuid
  $$;

COMMENT ON FUNCTION current_company_id() IS
  'Empresa do contexto de execucao. Lanca se app.company_id nao estiver definido (RF-121).';

-- ---------------------------------------------------------------------------
-- Aplicar o isolamento padrao a uma tabela
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enable_tenant_isolation(alvo regclass) RETURNS void
  LANGUAGE plpgsql
  AS $$
DECLARE
  tem_company_id boolean;
BEGIN
  -- Guarda deliberada: sem a coluna, `ENABLE ROW LEVEL SECURITY` passaria e a
  -- politica falharia so na primeira consulta, em producao. Recusar aqui
  -- transforma um vazamento silencioso em erro de migration.
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = alvo
      AND attname = 'company_id'
      AND NOT attisdropped
      AND attnum > 0
  ) INTO tem_company_id;

  IF NOT tem_company_id THEN
    RAISE EXCEPTION
      'A tabela % nao tem a coluna company_id, entao nao pode ser isolada por RLS.', alvo
      USING HINT = 'Toda tabela de negocio tem company_id uuid NOT NULL — ver dados.md#multi-tenant.';
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', alvo);

  -- FORCE e obrigatorio, nao opcional. Sem ele o DONO da tabela ignora a
  -- politica — e em muitos ambientes (a CI e um) a aplicacao conecta com o
  -- mesmo papel que criou as tabelas. Sem FORCE, o isolamento existiria no
  -- papel e nao na pratica, e o teste passaria por acidente.
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', alvo);

  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', alvo);

  -- USING filtra o que se le, atualiza e apaga.
  -- WITH CHECK filtra o que se GRAVA — e e a metade que costuma faltar. Sem
  -- ele, um INSERT com o company_id do vizinho entra, e um UPDATE consegue
  -- mover a linha para outra empresa. Ler errado e vazamento; gravar errado e
  -- vazamento que fica.
  --
  -- Uma linha so, deliberadamente. Duas constantes de texto adjacentes
  -- separadas por quebra de linha o Postgres concatena — e regra valida, mas
  -- sutil, e sutileza em SQL de politica de acesso e como se perde meia hora
  -- procurando por que a clausula WITH CHECK "desapareceu".
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id())', alvo);
END
$$;

COMMENT ON FUNCTION enable_tenant_isolation(regclass) IS
  'Liga RLS forcado e a politica tenant_isolation numa tabela de negocio (RF-122, RNF-021).';
