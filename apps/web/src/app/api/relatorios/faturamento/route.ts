import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/**
 * Faturamento mes a mes — NR-077, US-041.
 *
 * O periodo e repassado como veio, igual ao DRE: um padrao de "mes atual" aqui
 * daria ao web uma ideia de mes corrente que o assistente nao compartilha.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  return encaminhar(
    `/relatorios/faturamento?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  )
}
