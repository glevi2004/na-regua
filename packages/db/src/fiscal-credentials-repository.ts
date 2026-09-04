import type { CredenciaisFocusNfe } from '@na-regua/fiscal'
import type { Sql } from 'postgres'
import { cifrar, decifrar } from './secret-box.js'
import { withTenant } from './tenant.js'

/**
 * Credenciais fiscais por empresa — NR-042, RF-004, RNF-022.
 *
 * Satisfaz `CredenciaisFocusNfe`, que o adapter declara. O adapter nunca ve
 * texto cifrado nem chave: ele pede o token e recebe o token, e onde ele estava
 * guardado e problema deste modulo.
 *
 * ## O aviso de vencimento (RF-004) NAO esta aqui, e o motivo importa
 *
 * "Avisar 30 dias antes" e uma varredura da PLATAFORMA: ela pergunta sobre
 * TODAS as empresas, e por isso nao cabe em `withTenant`. Tambem nao cabe em
 * `withPlatformScope` — a politica de isolamento recusa ler tabela de negocio
 * sem `app.company_id` definido, que e exatamente o que a ADR-0001 quer.
 *
 * Fazer a varredura exigiria um papel que escapa da politica, e conceder isso a
 * um worker e decisao de seguranca, nao de codigo. E a mesma lacuna do
 * `listOverdue` (ver apps/worker/src/composition.ts): o repositorio ainda nao
 * tem mecanismo de leitura de plataforma.
 *
 * Por isso a coluna `certificate_expires_at` fica em claro e a consulta nao
 * existe — em vez de existir e lancar. Metodo que sempre falha e pior que
 * metodo ausente: ele parece pronto.
 */

/** O que a empresa configurou. Segredos NAO entram aqui. */
export type SituacaoFiscalDaEmpresa = {
  readonly companyId: string
  readonly temToken: boolean
  readonly temCertificado: boolean
  /** Nulo quando nao ha certificado. Em claro — ver a migration 0015. */
  readonly certificadoVenceEm: string | null
}

function paraDia(v: Date | string): string {
  if (typeof v === 'string') return v.slice(0, 10)
  const mes = String(v.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(v.getUTCDate()).padStart(2, '0')
  return `${v.getUTCFullYear()}-${mes}-${dia}`
}

export function createFiscalCredentials(
  sql: Sql,
  chave: Buffer,
): CredenciaisFocusNfe & {
  /**
   * Grava ou substitui as credenciais.
   *
   * Cifra AQUI, e nao em quem chama: um unico lugar decide o algoritmo, e nao
   * ha caminho em que alguem grave texto puro por esquecimento.
   */
  salvar(entrada: {
    readonly companyId: string
    readonly focusToken?: string
    readonly certificadoBase64?: string
    readonly senhaDoCertificado?: string
    readonly certificadoVenceEm?: string
    readonly atualizadoPor: string
  }): Promise<void>

  /** O que esta configurado, sem os segredos — para a tela de Empresa. */
  situacao(companyId: string): Promise<SituacaoFiscalDaEmpresa>
} {
  type Linha = {
    focus_token: string | null
    certificate: string | null
    certificate_password: string | null
    certificate_expires_at: Date | string | null
  }

  const ler = async (companyId: string): Promise<Linha | undefined> => {
    const [linha] = await withTenant(
      sql,
      companyId,
      (tx) => tx<Linha[]>`
        SELECT focus_token, certificate, certificate_password, certificate_expires_at
        FROM company_fiscal_credentials WHERE company_id = ${companyId}
      `,
    )
    return linha
  }

  return {
    /**
     * `undefined` quando a empresa nao configurou — e nao um erro.
     *
     * Falta de credencial e estado normal: a maioria comeca a vender antes de
     * emitir nota. Quem transforma isso em recusa e o adapter, com uma mensagem
     * que diz o que configurar.
     */
    tokenDe: async (companyId) => {
      const linha = await ler(companyId)
      if (linha?.focus_token == null) return undefined

      return decifrar(linha.focus_token, chave, companyId)
    },

    /**
     * O CNPJ do emitente sai de `companies`, e nao daqui.
     *
     * Ele nao e segredo e ja tem dono: duplica-lo nesta tabela criaria duas
     * respostas para "qual e o CNPJ desta empresa", e elas divergiriam na
     * primeira correcao de cadastro.
     */
    cnpjDe: async (companyId) => {
      const [linha] = await withTenant(
        sql,
        companyId,
        (tx) => tx<{ cnpj: string }[]>`SELECT cnpj FROM companies WHERE id = ${companyId}`,
      )
      return linha?.cnpj
    },

    salvar: async (entrada) => {
      const cifrado = (valor: string | undefined) =>
        valor === undefined ? null : cifrar(valor, chave, entrada.companyId)

      await withTenant(
        sql,
        entrada.companyId,
        (tx) => tx`
          INSERT INTO company_fiscal_credentials
            (company_id, focus_token, certificate, certificate_password,
             certificate_expires_at, updated_by, updated_at)
          VALUES (
            ${entrada.companyId},
            ${cifrado(entrada.focusToken)},
            ${cifrado(entrada.certificadoBase64)},
            ${cifrado(entrada.senhaDoCertificado)},
            ${entrada.certificadoVenceEm ?? null},
            ${entrada.atualizadoPor},
            now()
          )
          ON CONFLICT (company_id) DO UPDATE SET
            /* \`COALESCE\` com o valor ANTIGO: quem troca so o certificado nao
               perde o token. Sobrescrever com nulo apagaria a emissao inteira
               numa tela que so queria atualizar um campo. */
            focus_token = COALESCE(EXCLUDED.focus_token, company_fiscal_credentials.focus_token),
            certificate = COALESCE(EXCLUDED.certificate, company_fiscal_credentials.certificate),
            certificate_password = COALESCE(
              EXCLUDED.certificate_password, company_fiscal_credentials.certificate_password
            ),
            certificate_expires_at = COALESCE(
              EXCLUDED.certificate_expires_at, company_fiscal_credentials.certificate_expires_at
            ),
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
      )
    },

    situacao: async (companyId) => {
      const linha = await ler(companyId)

      /* Booleanos, e nunca o valor. A tela precisa saber SE esta configurado —
         mostrar o token seria desfazer a cifragem na saida. */
      return {
        companyId,
        temToken: linha?.focus_token != null,
        temCertificado: linha?.certificate != null,
        certificadoVenceEm:
          linha?.certificate_expires_at == null ? null : paraDia(linha.certificate_expires_at),
      }
    },
  }
}
