import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import HistoricoVendas from '@/components/vendas/HistoricoVendas'

export const metadata: Metadata = {
  title: `Vendas — ${BRAND}`,
  description: 'Historico de vendas fechadas.',
}

export default function VendasPage() {
  return <HistoricoVendas />
}
