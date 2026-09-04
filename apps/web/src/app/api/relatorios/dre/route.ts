import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/**
 * DRE do periodo — RF-085, RF-086.
 *
 * O periodo e repassado como veio. Inventar um padrao aqui daria ao web uma
 * ideia de "mes atual" que o assistente e a exportacao nao compartilham.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  return encaminhar(`/relatorios/dre?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
}
