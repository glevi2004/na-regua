import type { NextRequest } from 'next/server'
import { encaminhar } from '@/lib/bff'

/**
 * A fila — NR-076.
 *
 * O `scope` e repassado SO quando veio, em vez de cair num padrao aqui. O
 * padrao ja e do contrato (`pending`), e repeti-lo neste arquivo criaria um
 * segundo lugar para mudar de ideia.
 */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope')

  return encaminhar(
    scope === null
      ? '/conciliacao/transacoes'
      : `/conciliacao/transacoes?scope=${encodeURIComponent(scope)}`,
  )
}
