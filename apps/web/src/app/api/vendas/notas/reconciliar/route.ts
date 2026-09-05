import { encaminhar } from '@/lib/bff'

/**
 * Reconcilia as notas em contingencia — RF-053.
 *
 * Chamada ao abrir a etapa fiscal: e o momento em que o lojista esta olhando
 * para nota, e uma nota que a SEFAZ ja aceitou nao pode continuar aparecendo
 * como pendente na frente dele.
 */
export async function POST() {
  return encaminhar('/vendas/notas/reconciliar', { method: 'POST' })
}
