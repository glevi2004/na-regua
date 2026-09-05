import type { InvoiceIssueResult } from '@na-regua/contracts'
import type { InvoiceStore, NotaGuardada } from '@na-regua/fiscal'
import type { Sql } from 'postgres'
import { withTenant } from './tenant.js'

/**
 * A guarda de notas — NR-042, RF-045 a RF-054.
 *
 * Implementa `InvoiceStore`, declarada em `fiscal`. O XML fica AQUI e nao no
 * provedor: ele e o documento fiscal, tem guarda legal de cinco anos, e
 * depender da conta do provedor continuar ativa nao e guardar.
 */

type LinhaNota = {
  sale_id: string
  access_key: string | null
  number: number | null
  series: number
  status: string
  xml: string | null
  danfe_url: string | null
  rejection_code: string | null
  rejection_message: string | null
  issued_at: Date | null
}

/**
 * A linha do banco de volta para o resultado do contrato.
 *
 * O `status` da tabela tem quatro valores e o do contrato tem tres: `cancelled`
 * nao e um desfecho de EMISSAO. Nota cancelada nao volta como resultado de
 * emissao nenhum — quem a procura pela chave esta cancelando, e o adapter ja
 * tratou. Por isso ela some das duas buscas.
 */
function paraResultado(l: LinhaNota): InvoiceIssueResult {
  if (l.status === 'rejected') {
    return {
      status: 'rejected',
      rejection: {
        code: l.rejection_code ?? 'DESCONHECIDO',
        message: l.rejection_message ?? 'Nota rejeitada sem motivo registrado.',
      },
    }
  }

  const comum = {
    accessKey: l.access_key!,
    number: l.number!,
    series: l.series,
    xml: l.xml ?? '',
    issuedAt: (l.issued_at ?? new Date()).toISOString(),
  }

  return l.status === 'contingency'
    ? {
        status: 'contingency',
        ...comum,
        reason: l.rejection_message ?? 'Emitida em contingencia.',
      }
    : { status: 'authorized', ...comum, danfeUrl: l.danfe_url ?? '' }
}

const paraNota = (companyId: string, l: LinhaNota): NotaGuardada => ({
  companyId,
  saleId: l.sale_id,
  resultado: paraResultado(l),
})

export function createInvoiceStore(sql: Sql): InvoiceStore {
  return {
    findBySale: async (companyId, saleId) => {
      const [linha] = await withTenant(
        sql,
        companyId,
        (tx) => tx<LinhaNota[]>`
          SELECT * FROM invoices WHERE sale_id = ${saleId} AND status <> 'cancelled'
        `,
      )
      return linha === undefined ? undefined : paraNota(companyId, linha)
    },

    findByAccessKey: async (companyId, accessKey) => {
      const [linha] = await withTenant(
        sql,
        companyId,
        (tx) => tx<LinhaNota[]>`
          SELECT * FROM invoices WHERE access_key = ${accessKey} AND status <> 'cancelled'
        `,
      )
      return linha === undefined ? undefined : paraNota(companyId, linha)
    },

    /**
     * Grava, e devolve o VENCEDOR quando houve corrida.
     *
     * `ON CONFLICT DO NOTHING` mais releitura, e nao `DO UPDATE`: se duas
     * execucoes emitiram a mesma venda, a primeira nota e a que vale e a
     * segunda nao pode sobrescreve-la. Sobrescrever trocaria a chave de acesso
     * de uma nota que a SEFAZ ja autorizou — e o lojista ficaria com um XML
     * apontando para um documento que nao e o dele.
     *
     * Quem chama devolve o resultado do vencedor, e assim duas emissoes
     * simultaneas dao uma nota so.
     */
    save: async (nota) => {
      const r = nota.resultado
      const emitida = r.status !== 'rejected'

      await withTenant(
        sql,
        nota.companyId,
        (tx) => tx`
          INSERT INTO invoices (
            company_id, sale_id, access_key, number, series, status,
            xml, danfe_url, rejection_code, rejection_message, issued_at
          )
          VALUES (
            ${nota.companyId}, ${nota.saleId},
            ${emitida ? r.accessKey : null},
            ${emitida ? r.number : null},
            ${emitida ? r.series : 1},
            ${r.status},
            ${emitida ? r.xml : null},
            ${r.status === 'authorized' ? r.danfeUrl : null},
            ${r.status === 'rejected' ? r.rejection.code : null},
            ${
              r.status === 'rejected'
                ? r.rejection.message
                : r.status === 'contingency'
                  ? r.reason
                  : null
            },
            ${emitida ? r.issuedAt : null}
          )
          ON CONFLICT (company_id, sale_id) DO NOTHING
        `,
      )

      const [linha] = await withTenant(
        sql,
        nota.companyId,
        (tx) => tx<LinhaNota[]>`SELECT * FROM invoices WHERE sale_id = ${nota.saleId}`,
      )

      return linha === undefined ? nota : paraNota(nota.companyId, linha)
    },

    /**
     * As em contingencia, da mais antiga para a mais nova — RF-053.
     *
     * `ORDER BY issued_at` e o contrato: a SEFAZ recusa lacuna de numeracao, e
     * reconciliar fora de ordem deixa buracos. O indice
     * `invoices_em_contingencia` serve exatamente esta consulta.
     */
    listContingency: async (companyId) => {
      const linhas = await withTenant(
        sql,
        companyId,
        (tx) => tx<LinhaNota[]>`
          SELECT * FROM invoices
          WHERE company_id = ${companyId} AND status = 'contingency'
          ORDER BY issued_at, sale_id
        `,
      )
      return linhas.map((l) => paraNota(companyId, l))
    },

    /**
     * A nota passou a autorizada — RF-053.
     *
     * Chave e numero NAO mudam: e a mesma nota, e o que mudou foi a SEFAZ
     * confirmar. Por isso o `WHERE` casa pela venda e o `UPDATE` toca apenas o
     * que a confirmacao trouxe.
     */
    markAuthorized: async (companyId, saleId, resultado) => {
      if (resultado.status === 'rejected') return

      await withTenant(
        sql,
        companyId,
        (tx) => tx`
          UPDATE invoices
          SET status = ${resultado.status},
              danfe_url = ${resultado.status === 'authorized' ? resultado.danfeUrl : null},
              xml = ${resultado.xml},
              updated_at = now()
          WHERE company_id = ${companyId} AND sale_id = ${saleId}
        `,
      )
    },

    markCancelled: async (companyId, accessKey, cancelamento) => {
      await withTenant(
        sql,
        companyId,
        (tx) => tx`
          UPDATE invoices
          SET status = 'cancelled',
              cancellation_protocol = ${cancelamento.protocol},
              cancellation_xml = ${cancelamento.xml},
              cancelled_at = ${cancelamento.cancelledAt},
              updated_at = now()
          WHERE access_key = ${accessKey}
        `,
      )
    },
  }
}
