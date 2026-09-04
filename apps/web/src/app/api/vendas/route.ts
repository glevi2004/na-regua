import type { NextRequest } from 'next/server'
import { corpoDe, encaminhar } from '@/lib/bff'

/**
 * Fechar a venda — NR-049, RF-024 a RF-030.
 *
 * A chave de idempotencia (RNF-043) e REPASSADA, nunca gerada aqui.
 *
 * Gerar neste handler daria uma chave nova a cada tentativa, e a protecao
 * viraria enfeite: o PDV com internet ruim reenvia, e cada reenvio chegaria com
 * chave inedita — segunda venda, segundo estoque baixado, segundo recebivel. A
 * chave nasce no navegador, quando o operador manda fechar, e sobrevive as
 * retentativas dele.
 *
 * Sem o cabecalho, a api recusa com 400. Preferir a recusa a inventar a chave:
 * um pedido que nao pode ser repetido com seguranca nao deve parecer que pode.
 */
export async function POST(request: NextRequest) {
  const chave = request.headers.get('idempotency-key')

  return encaminhar('/sales', {
    method: 'POST',
    body: await corpoDe(request),
    /* Sem `okStatus`: o 201 da venda nova e o 200 do reenvio precisam chegar
       distintos na tela, que mostra "venda registrada" ou "esta venda ja tinha
       sido fechada". */
    ...(chave === null ? {} : { headers: { 'idempotency-key': chave } }),
  })
}
