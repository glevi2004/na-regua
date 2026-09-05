import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/** Ranking de clientes — NR-077, US-041. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const limit = searchParams.get('limit')

  /*
   * O limite so viaja quando veio. Mandar `limit=` vazio faria a api validar
   * uma string vazia como numero e recusar o pedido inteiro, quando a intencao
   * era usar o padrao dela.
   */
  const teto = limit === null || limit === '' ? '' : `&limit=${encodeURIComponent(limit)}`

  return encaminhar(
    `/relatorios/ranking/clientes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${teto}`,
  )
}
