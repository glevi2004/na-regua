import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import RelatoriosView from '@/components/financeiro/RelatoriosView'

export const metadata: Metadata = {
  title: `Relatorios — ${BRAND}`,
  description: 'Faturamento mes a mes e os rankings de cliente e de produto.',
}

export default function RelatoriosPage() {
  return <RelatoriosView />
}
