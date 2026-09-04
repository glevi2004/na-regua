import { corpoDe, encaminhar } from '@/lib/bff'

/**
 * Contas a pagar — NR-074, RF-055 a RF-062.
 *
 * Mesmo BFF da sessao (NR-013): o navegador fala com este handler, e o token da
 * api fica no cookie `httpOnly`. O preambulo mora em `lib/bff` desde a NR-076 —
 * ele era identico em todos os handlers, e o pedaco que some primeiro quando se
 * copia e a checagem de sessao.
 */

/** A lista agrupada por vencimento, com total por grupo. */
export async function GET() {
  return encaminhar('/contas-a-pagar')
}

/** Lancar — RF-055, RF-057. */
export async function POST(request: Request) {
  return encaminhar('/contas-a-pagar', {
    method: 'POST',
    body: await corpoDe(request),
  })
}
