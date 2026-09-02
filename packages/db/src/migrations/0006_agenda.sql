-- Schema de agenda — NR-035. RF-089, RF-090, RF-091, RF-092, RF-093.
--
-- A porta que esta tabela atende ja existe: `AppointmentRepository` em
-- packages/core/src/ports/appointment-repository.ts, hoje com apenas um
-- repositorio em memoria por tras. As colunas aqui sao as daquela porta e as
-- do `appointmentOutputSchema` de contracts — nao uma modelagem nova.
--
-- Convencoes em docs/arquitetura/dados.md#convenções-de-schema: tabela plural
-- em snake_case, timestamptz em UTC com sufixo _at, sem enum nativo, e todo
-- indice comecando por company_id porque com RLS toda consulta filtra por ele.

-- ---------------------------------------------------------------------------
-- appointments — o compromisso da agenda
-- ---------------------------------------------------------------------------

CREATE TABLE appointments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,

  title                   text NOT NULL,

  -- Sempre UTC. O fuso e coisa de exibicao — quem monta "a agenda do dia"
  -- converte o dia do fuso da empresa para um intervalo em UTC e consulta por
  -- intervalo. Guardar o fuso aqui faria a mesma agenda mudar de conteudo
  -- conforme quem consulta, que e o oposto do que um compromisso e.
  starts_at               timestamptz NOT NULL,

  -- Vincula ao cliente para aparecer no cadastro dele — RF-090. Opcional: nem
  -- todo compromisso e com cliente (entrega, conferencia de estoque, banco).
  --
  -- `ON DELETE RESTRICT` como em `sales.customer_id`: cliente sai da lista por
  -- `deleted_at`, nunca por DELETE, e se um DELETE for tentado a agenda o
  -- impede em vez de perder silenciosamente o vinculo.
  customer_id             uuid REFERENCES customers (id) ON DELETE RESTRICT,

  notes                   text,

  -- Antecedencia do lembrete, em minutos — RF-091. NULL = sem lembrete.
  -- Quem de fato agenda o disparo e a porta `ReminderScheduler`; aqui fica o
  -- que o lojista pediu, para a agenda saber responder sem consultar a fila.
  reminder_minutes_before integer,

  -- `text` + CHECK, nao enum nativo: acrescentar valor a enum no Postgres nao
  -- volta atras. Os mesmos dois valores de `appointmentStatusSchema`.
  status                  text NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'cancelled')),

  -- Nada e apagado: compromisso e cancelado — RNF-040. Por isso NAO existe
  -- `deleted_at` aqui, igual a `sales`: o cancelado continua existindo, some
  -- da agenda do dia e continua respondendo por id.
  cancelled_at            timestamptz,
  cancelled_by            uuid REFERENCES users (id) ON DELETE SET NULL,
  cancel_reason           text,

  created_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at              timestamptz NOT NULL DEFAULT now(),

  -- Os limites abaixo repetem os de `contracts`. Nao e redundancia inutil:
  -- contracts valida o que entra pela borda HTTP, e esta tabela tambem recebe
  -- escrita de migration, de script e do worker. A ultima linha de defesa
  -- precisa estar onde o dado mora.
  CONSTRAINT appointments_titulo_tamanho
    CHECK (char_length(btrim(title)) BETWEEN 2 AND 140),
  CONSTRAINT appointments_observacao_tamanho
    CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT appointments_motivo_tamanho
    CHECK (cancel_reason IS NULL OR char_length(cancel_reason) <= 280),

  -- 1 minuto a 7 dias, como `reminderMinutesBefore` em contracts. Zero seria
  -- "avise na hora", que nao lembra ninguem de nada.
  CONSTRAINT appointments_antecedencia_valida
    CHECK (reminder_minutes_before IS NULL
           OR reminder_minutes_before BETWEEN 1 AND 10080),

  -- As tres colunas de cancelamento andam juntas com o status. Sem isto,
  -- `status = 'cancelled'` sem `cancelled_at` (ou o contrario) entra no banco,
  -- e a agenda passa a ter duas respostas para "isso foi cancelado?".
  -- Mesmo formato do `sales_cancelamento_completo`.
  CONSTRAINT appointments_cancelamento_completo
    CHECK ((cancelled_at IS NULL) = (status <> 'cancelled'))
);

COMMENT ON TABLE appointments IS
  'Compromissos da agenda (RF-089 a RF-093). Cancelado nao e apagado — RNF-040.';

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------

-- A consulta principal: `listBetween(companyId, from, to)` — a agenda do dia,
-- em ordem de horario, sem os cancelados (RF-093).
--
-- Parcial em `status = 'scheduled'` porque e exatamente o recorte que a
-- consulta pede, e porque o cancelado nunca aparece nessa lista: mante-lo fora
-- do indice deixa o indice do tamanho da agenda viva, nao do historico.
CREATE INDEX appointments_por_periodo ON appointments (company_id, starts_at)
  WHERE status = 'scheduled';

-- RF-090: os compromissos de um cliente, no cadastro dele. Aqui SEM filtro de
-- status — a ficha do cliente mostra o que foi cancelado tambem, que e parte
-- do historico de atendimento dele.
CREATE INDEX appointments_por_cliente ON appointments (company_id, customer_id, starts_at)
  WHERE customer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Isolamento
-- ---------------------------------------------------------------------------

SELECT enable_tenant_isolation('appointments');
