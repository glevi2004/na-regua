-- Notas fiscais emitidas — NR-042. RF-045, RF-050, RF-052, RF-053, RF-054.
--
-- A "guarda de XML" da tarefa. Ela nao e conveniencia: e o que torna o adapter
-- do provedor possivel, e o que sobra quando o provedor sai de cena.
--
-- ## Por que o adapter precisa desta tabela
--
-- A porta `InvoiceIssuer` cancela por CHAVE DE ACESSO. O Focus NFe cancela por
-- REFERENCIA (`DELETE /nfce/{ref}`), e a referencia e o nosso `saleId`. Nao ha
-- endpoint que traduza uma na outra. Sem guardar o par, cancelar seria
-- impossivel — e a alternativa (mudar a porta para carregar `saleId`) faria o
-- vocabulario do provedor vazar para dentro do nucleo.
--
-- ## Por que ela sobrevive ao provedor
--
-- O XML autorizado e o documento fiscal. Ele precisa ficar por cinco anos
-- (guarda legal) e nao pode depender de a conta do provedor continuar ativa,
-- nem de a API dele continuar respondendo. Guardar so o `caminho_xml` seria
-- guardar um link para a casa de outra pessoa.
--
-- Convencoes em docs/arquitetura/dados.md#convenções-de-schema.

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,

  -- A venda que originou a nota. E TAMBEM a `ref` enviada ao provedor: ele
  -- exige unicidade por token, e a venda ja e unica por empresa.
  sale_id           uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,

  -- Nulos ate a SEFAZ responder. Em contingencia a chave existe e o protocolo
  -- ainda nao — por isso os dois nao andam juntos.
  access_key        text CHECK (access_key IS NULL OR access_key ~ '^[0-9]{44}$'),
  number            integer CHECK (number IS NULL OR number > 0),
  series            integer NOT NULL CHECK (series > 0),

  status            text NOT NULL
                      CHECK (status IN ('authorized', 'contingency', 'rejected', 'cancelled')),

  -- O documento fiscal em si. `text` e nao referencia a arquivo: ver o
  -- cabecalho — link para a casa de outra pessoa nao e guarda.
  xml               text,
  danfe_url         text,

  -- Rejeicao guardada para a tela explicar (RF-047) sem consultar o provedor.
  rejection_code    text,
  rejection_message text,

  -- Cancelamento — RF-050. O XML do evento e outro documento, e vale por si.
  cancellation_xml  text,
  cancellation_protocol text,
  cancelled_at      timestamptz,

  issued_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Autorizada e contingencia TEM chave e numero; rejeitada nao tem nenhum dos
  -- dois. Sem isto, uma rejeicao gravada com chave nula e status errado faria a
  -- tela de estado fiscal (RF-054) mentir sobre a venda.
  CONSTRAINT invoices_autorizada_tem_chave
    CHECK (
      (status IN ('authorized', 'contingency', 'cancelled'))
        = (access_key IS NOT NULL AND number IS NOT NULL)
    ),

  CONSTRAINT invoices_rejeitada_tem_motivo
    CHECK ((status = 'rejected') = (rejection_code IS NOT NULL)),

  CONSTRAINT invoices_cancelamento_completo
    CHECK ((cancelled_at IS NULL) = (status <> 'cancelled'))
);

COMMENT ON TABLE invoices IS
  'Notas fiscais e seus XMLs (RF-045 a RF-054). O XML fica aqui, nao no provedor.';

-- Uma venda, uma nota. E a idempotencia da RNF-043 no lugar onde ela pesa mais:
-- nota duplicada nao e inconveniencia, e problema fiscal. O caso de uso ja
-- devolve a existente, e aqui o banco garante contra escrita que nao passe por
-- ele — inclusive contra dois workers processando o mesmo job.
CREATE UNIQUE INDEX invoices_uma_por_venda ON invoices (company_id, sale_id);

-- A busca do cancelamento: chave -> referencia. Parcial porque nota rejeitada
-- nao tem chave e nunca e procurada assim.
CREATE UNIQUE INDEX invoices_por_chave ON invoices (company_id, access_key)
  WHERE access_key IS NOT NULL;

-- A fila de retransmissao — RF-053, "em ORDEM quando a SEFAZ voltar".
-- Ordenada por emissao: contingencia transmitida fora de ordem gera lacuna de
-- numeracao, que a SEFAZ recusa.
CREATE INDEX invoices_em_contingencia ON invoices (company_id, issued_at)
  WHERE status = 'contingency';

SELECT enable_tenant_isolation('invoices');
