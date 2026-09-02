-- Alinha `companies.tax_regime` ao tipo `TaxRegime` de `domain` — RF-003, RF-041.
--
-- A 0002 criou o CHECK com 'simples', 'presumido', 'real', 'mei'. O
-- `TaxRegime` de `packages/domain` e 'simples_nacional', 'lucro_presumido',
-- 'lucro_real'. Ou seja: o banco aceitava valores que `domain` nao consegue
-- consumir, e a divergencia so apareceria no primeiro calculo de imposto de
-- uma venda de verdade — que e a NR-022, ou seja, agora.
--
-- `domain` manda, e nao por hierarquia: o valor existe para entrar num calculo,
-- e quem calcula e ele.
--
-- ## Sobre o 'mei', que sai daqui
--
-- MEI nao esta no `TaxRegime`, e nao e esquecimento de quem o escreveu: o MEI
-- paga DAS de valor FIXO mensal, e nao aliquota sobre a venda. O modelo de
-- `domain` e percentual (`defaultRate` em pontos por cem), e nao existe
-- percentual que represente um valor fixo.
--
-- Guardar 'mei' na coluna significaria uma empresa cadastravel cujo imposto o
-- sistema nao sabe calcular — e o publico do produto tem muito MEI. Isso e
-- decisao de produto, nao de schema, e sai daqui para nao ficar parecendo
-- resolvida. Ver o PR que introduziu esta migration.

ALTER TABLE companies DROP CONSTRAINT companies_tax_regime_check;

-- Traduz o que ja estiver gravado. Na pratica nao ha dado em producao ainda,
-- mas migration que assume banco vazio e migration que falha no dia em que
-- alguem restaura um dump.
UPDATE companies
   SET tax_regime = CASE tax_regime
                      WHEN 'simples'    THEN 'simples_nacional'
                      WHEN 'presumido'  THEN 'lucro_presumido'
                      WHEN 'real'       THEN 'lucro_real'
                      -- MEI vira Simples: e o regime mais proximo em aliquota,
                      -- e deixa a empresa operavel em vez de invalida. A
                      -- decisao sobre MEI de verdade fica em aberto.
                      WHEN 'mei'        THEN 'simples_nacional'
                      ELSE tax_regime
                    END
 WHERE tax_regime IN ('simples', 'presumido', 'real', 'mei');

ALTER TABLE companies
  ALTER COLUMN tax_regime SET DEFAULT 'simples_nacional';

ALTER TABLE companies
  ADD CONSTRAINT companies_tax_regime_check
  CHECK (tax_regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real'));

COMMENT ON COLUMN companies.tax_regime IS
  'Regime tributario — mesmos valores de TaxRegime em packages/domain (RF-003, RF-041).';
