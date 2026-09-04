-- Campos fiscais do produto — NR-042. RF-046.
--
-- O emissor Focus NFe entrou na 0013, e a nota nao sai sem estes tres campos:
-- `IssueInvoiceRequest.items` exige NCM, CFOP e CST/CSOSN por item, e a RF-046
-- manda validar os tres ANTES de transmitir. Faltavam todos no cadastro — a
-- tabela so tinha `tax_rate`, que serve ao calculo do imposto e nao ao
-- documento.
--
-- Sem esta migration, o adapter existe e nao tem o que enviar.

-- ---------------------------------------------------------------------------
-- NCM — a classificacao da mercadoria
-- ---------------------------------------------------------------------------
--
-- Oito digitos, tabela federal. Nulo enquanto o lojista nao informa: exigir no
-- cadastro travaria o balcao no dia da instalacao, e a RF-017 pede cadastro
-- rapido. Quem cobra e a EMISSAO, que recusa antes de transmitir e diz qual
-- produto falta classificar.
ALTER TABLE products ADD COLUMN ncm text
  CHECK (ncm IS NULL OR ncm ~ '^[0-9]{8}$');

COMMENT ON COLUMN products.ncm IS
  'Classificacao fiscal da mercadoria, 8 digitos (RF-046). Nulo ate o lojista informar.';

-- ---------------------------------------------------------------------------
-- CFOP — a natureza da operacao
-- ---------------------------------------------------------------------------
--
-- Quatro digitos. Fica no PRODUTO e nao fixo na emissao porque ele muda com o
-- que se vende: 5102 e revenda de mercadoria, 5405 e revenda com substituicao
-- tributaria ja recolhida, e uma mercearia tem os dois na mesma prateleira.
--
-- Cravar 5102 para tudo emitiria nota errada em cigarro, refrigerante e cerveja
-- — que sao exatamente os itens de maior giro de um mercadinho.
ALTER TABLE products ADD COLUMN cfop text
  CHECK (cfop IS NULL OR cfop ~ '^[0-9]{4}$');

COMMENT ON COLUMN products.cfop IS
  'Natureza da operacao, 4 digitos (RF-046). Varia por produto: revenda comum e ST diferem.';

-- ---------------------------------------------------------------------------
-- CST ou CSOSN — a situacao tributaria
-- ---------------------------------------------------------------------------
--
-- DOIS digitos no regime normal (CST) e TRES no Simples (CSOSN). Sao codigos de
-- tabelas diferentes para a mesma pergunta, e qual deles vale sai do
-- `tax_regime` da empresa, que ja existe desde a 0002.
--
-- Por isso a coluna aceita os dois tamanhos em vez de ter duas colunas: um
-- produto tem UMA situacao tributaria por vez, e a empresa tem um regime por
-- vez. Duas colunas dariam a chance de as duas estarem preenchidas e
-- discordarem, e a nota sairia com a que alguem escolhesse ler.
ALTER TABLE products ADD COLUMN tax_situation_code text
  CHECK (tax_situation_code IS NULL OR tax_situation_code ~ '^[0-9]{2,3}$');

COMMENT ON COLUMN products.tax_situation_code IS
  'CST (2 digitos, regime normal) ou CSOSN (3, Simples) — RF-046. Qual vale sai de companies.tax_regime.';
