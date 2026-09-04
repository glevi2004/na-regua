import { corpoDe, encaminhar } from '@/lib/bff'

/** O plano de contas — RF-081, RF-082. */
export async function GET() {
  return encaminhar('/contas-contabeis')
}

export async function POST(request: Request) {
  return encaminhar('/contas-contabeis', {
    method: 'POST',
    body: await corpoDe(request),
  })
}
