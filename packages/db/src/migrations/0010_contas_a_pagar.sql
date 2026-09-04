-- Contas a pagar — NR-074. RF-055 a RF-062.
--
-- A NR-028 desenhou o caso de uso e a porta `PayableRepository` em `core`, com
-- repositorio em memoria. Esta e a tabela por tras — ela faltava: `receivables`
-- existe desde a 0003, mas o lado a PAGAR nunca teve schema.
--
-- Convencoes em docs/arquitetura/dados.md#convenções-de-schema: plural em
-- snake_case, dinheiro em bigint de centavos, timestamptz em UTC com sufixo
-- _at, sem enum nativo, e todo indice comecando por company_id.

CREATE TABLE payables (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,

  -- Texto livre, e nao id de fornecedor: nao existe cadastro de fornecedor no
  -- MVP, e exigir um travaria o lancamento da conta de luz.
  supplier             text NOT NULL,
  description          text NOT NULL,

  amount_cents         bigint NOT NULL CHECK (amount_cents > 0),
  settled_amount_cents bigint NOT NULL DEFAULT 0 CHECK (settled_amount_cents >= 0),

  -- Conta vence num DIA, nao num instante. `date` e nao timestamptz: com fuso,
  -- a mesma conta venceria em dias diferentes conforme quem consulta.
  due_date             date NOT NULL,

  -- Chave do arquivo no armazenamento, nao o arquivo — RF-055.
  attachment_key       text,
  -- Classificacao contabil, para o relatorio do contador.
  category             text,

  -- Recorrencia — RF-057. As ocorrencias sao LINHAS de verdade, e nao uma regra
  -- expandida na leitura: RF-058 pede alterar UMA sem afetar as demais, e
  -- ocorrencia que nao existe como linha nao tem onde guardar a alteracao.
  --
  -- Sem tabela `recurrences`: o id agrupa e nada mais precisa ser guardado
  -- sobre a serie. Criar a tabela agora seria uma junção a mais em toda
  -- consulta, para um dado que ninguem le.
  recurrence_id        uuid,
  occurrence_number    integer CHECK (occurrence_number IS NULL OR occurrence_number >= 1),
  occurrence_count     integer CHECK (occurrence_count IS NULL OR occurrence_count >= 1),

  status               text NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'partially_settled', 'settled', 'cancelled')),

  -- Nada e apagado: conta e cancelada — RNF-040. Sem `deleted_at`, igual a
  -- `sales` e a `appointments`.
  cancelled_at         timestamptz,
  cancelled_by         uuid REFERENCES users (id) ON DELETE SET NULL,

  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- Baixa nunca passa do valor: valor a maior digitado por engano viraria
  -- credito invisivel dentro do titulo, e o lojista so descobriria conferindo
  -- o extrato meses depois. A regra tambem vive em `domain` (`aplicarBaixa`);
  -- aqui e a ultima linha de defesa, para escrita que nao passe pelo caso de uso.
  CONSTRAINT payables_baixa_ate_o_valor CHECK (settled_amount_cents <= amount_cents),

  -- Status e valores nao podem discordar. Sem isto, `settled` com saldo aberto
  -- entra no banco e a lista de vencidos passa a mentir.
  CONSTRAINT payables_quitado_completo
    CHECK ((status = 'settled') = (settled_amount_cents >= amount_cents AND status <> 'cancelled')),

  CONSTRAINT payables_cancelamento_completo
    CHECK ((cancelled_at IS NULL) = (status <> 'cancelled')),

  -- Ocorrencia so faz sentido dentro de uma serie, e as tres andam juntas.
  CONSTRAINT payables_recorrencia_completa
    CHECK (num_nonnulls(recurrence_id, occurrence_number, occurrence_count) IN (0, 3)),

  CONSTRAINT payables_ocorrencia_valida
    CHECK (occurrence_number IS NULL OR occurrence_number <= occurrence_count)
);

COMMENT ON TABLE payables IS
  'Contas a pagar (RF-055 a RF-062). Cancelada nao e apagada — RNF-040.';

-- A consulta principal: o que esta em aberto, por vencimento — RF-061, RF-062.
-- Parcial porque quitada e cancelada nunca aparecem nessa lista, e mante-las
-- fora deixa o indice do tamanho do que se cobra, nao do historico.
CREATE INDEX payables_em_aberto ON payables (company_id, due_date)
  WHERE status IN ('open', 'partially_settled');

-- Encerrar a recorrencia precisa achar as ocorrencias da serie — RF-058.
CREATE INDEX payables_por_recorrencia ON payables (company_id, recurrence_id)
  WHERE recurrence_id IS NOT NULL;

SELECT enable_tenant_isolation('payables');

-- ---------------------------------------------------------------------------
-- Baixa de conta a pagar — RF-059, RF-060
-- ---------------------------------------------------------------------------

-- `settlements` (0003) so atende recebivel: `receivable_id` e NOT NULL la. O
-- lado a pagar precisa do proprio registro, com o que ele tem de diferente —
-- a conta bancaria de onde o dinheiro saiu, que o recebivel nao tem.
CREATE TABLE payable_settlements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  payable_id     uuid NOT NULL REFERENCES payables (id) ON DELETE RESTRICT,

  -- Negativo no estorno: a soma das linhas continua sendo o saldo baixado, e
  -- conferir o titulo e somar, nunca reconstruir historia. Mesmo desenho de
  -- `settlements`.
  amount_cents   bigint NOT NULL CHECK (amount_cents <> 0),

  -- RF-059 pede data E conta bancaria: a baixa existe para casar com o
  -- extrato, e sem a conta nao da para conciliar quando a loja tem mais de uma.
  settled_on     date NOT NULL,
  bank_account   text NOT NULL,
  notes          text,

  reverses_id    uuid REFERENCES payable_settlements (id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES users (id) ON DELETE SET NULL,

  CONSTRAINT payable_settlements_estorno_e_negativo
    CHECK ((reverses_id IS NULL AND amount_cents > 0) OR (reverses_id IS NOT NULL AND amount_cents < 0))
);

-- Uma baixa so pode ser estornada UMA vez. Sem isto, dois estornos da mesma
-- baixa devolveriam a divida duas vezes e o titulo ficaria com saldo negativo —
-- o caso de uso ja recusa, e aqui o banco garante contra escrita que nao passe
-- por ele.
CREATE UNIQUE INDEX payable_settlements_um_estorno_por_baixa
  ON payable_settlements (reverses_id)
  WHERE reverses_id IS NOT NULL;

CREATE INDEX payable_settlements_por_titulo
  ON payable_settlements (company_id, payable_id, settled_on DESC);

SELECT enable_tenant_isolation('payable_settlements');
