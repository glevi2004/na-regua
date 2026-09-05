import type { InvoiceIssueResult } from '@na-regua/contracts'
import { describe, expect, it } from 'vitest'
import type { ExecutionContext } from '../context.js'
import { reconcileContingency } from './reconcile-contingency.js'

/**
 * Reconciliacao de contingencia — RF-053.
 *
 * O que se guarda aqui e a ORDEM. A SEFAZ recusa lacuna de numeracao, e uma
 * varredura que pula a nota pendente e resolve a seguinte cria exatamente essa
 * lacuna — que so aparece na proxima emissao, longe da causa.
 */

const EMPRESA = 'empresa-1'

const ctx: ExecutionContext = {
  companyId: EMPRESA,
  userId: 'usuario-1',
  role: 'owner',
  channel: 'app',
  requestId: 'req-1',
  now: new Date('2026-09-05T12:00:00.000Z'),
}

const autorizada = (n: number): InvoiceIssueResult => ({
  status: 'authorized',
  accessKey: String(n).padStart(44, '0'),
  number: n,
  series: 1,
  danfeUrl: `https://exemplo/danfe/${n}.html`,
  xml: '<nfeProc/>',
  issuedAt: '2026-09-05T11:00:00.000Z',
})

const emContingencia = (n: number): InvoiceIssueResult => ({
  status: 'contingency',
  accessKey: String(n).padStart(44, '0'),
  number: n,
  series: 1,
  xml: '<nfeProc/>',
  issuedAt: '2026-09-05T11:00:00.000Z',
  reason: 'SEFAZ fora',
})

function cenario(pendentes: string[], respostas: Record<string, InvoiceIssueResult | undefined>) {
  const marcadas: string[] = []
  const consultadas: string[] = []

  return {
    marcadas,
    consultadas,
    deps: {
      invoices: {
        issue: async () => autorizada(1),
        cancel: async () => ({
          status: 'rejected' as const,
          rejection: { code: 'x', message: 'y' },
        }),
        consult: async ({ saleId }: { saleId: string }) => {
          consultadas.push(saleId)
          return respostas[saleId]
        },
      },
      store: {
        listContingency: async () => pendentes.map((saleId) => ({ saleId })),
        markAuthorized: async (_c: string, saleId: string) => void marcadas.push(saleId),
      },
    } as never,
  }
}

describe('reconciliar contingencia', () => {
  it('marca como autorizada a nota que a SEFAZ ja aceitou', async () => {
    const c = cenario(['v1'], { v1: autorizada(1) })

    const r = await reconcileContingency(c.deps, ctx)

    expect(r).toEqual({ pendentes: 1, autorizadas: 1 })
    expect(c.marcadas).toEqual(['v1'])
  })

  it('PARA na primeira que ainda nao autorizou', async () => {
    const c = cenario(['v1', 'v2', 'v3'], {
      v1: autorizada(1),
      v2: emContingencia(2),
      v3: autorizada(3),
    })

    const r = await reconcileContingency(c.deps, ctx)

    /*
     * A v3 NAO e marcada, mesmo ja autorizada no provedor. Marca-la deixaria a
     * v2 como buraco na numeracao, e a SEFAZ recusa o lote seguinte por causa
     * dele — longe daqui, e sem dizer por que.
     */
    expect(r.autorizadas).toBe(1)
    expect(c.marcadas).toEqual(['v1'])
    expect(c.consultadas).not.toContain('v3')
  })

  it('para tambem quando o provedor ainda nao tem resposta', async () => {
    const c = cenario(['v1', 'v2'], { v1: undefined, v2: autorizada(2) })

    const r = await reconcileContingency(c.deps, ctx)

    expect(r.autorizadas).toBe(0)
    expect(c.marcadas).toEqual([])
  })

  it('rejeitada tambem segura a fila — ela precisa de correcao humana', async () => {
    const c = cenario(['v1', 'v2'], {
      v1: { status: 'rejected', rejection: { code: '539', message: 'Duplicidade' } },
      v2: autorizada(2),
    })

    const r = await reconcileContingency(c.deps, ctx)

    expect(r.autorizadas).toBe(0)
    expect(c.consultadas).toEqual(['v1'])
  })

  it('sem contingencia, nao consulta o provedor', async () => {
    const c = cenario([], {})

    const r = await reconcileContingency(c.deps, ctx)

    /* Uma varredura que consultasse mesmo sem pendencia gastaria chamada de
       terceiro a cada abertura de tela. */
    expect(r).toEqual({ pendentes: 0, autorizadas: 0 })
    expect(c.consultadas).toEqual([])
  })

  it('o contador tambem reconcilia — nao cria nada, so registra o que a SEFAZ fez', async () => {
    const c = cenario(['v1'], { v1: autorizada(1) })

    const r = await reconcileContingency(c.deps, { ...ctx, role: 'accountant' })

    /* Exigir papel de escrita impediria quem mais olha para nota pendente de
       ver o estado correto. */
    expect(r.autorizadas).toBe(1)
  })
})
