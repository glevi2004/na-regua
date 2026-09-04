import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import ConciliacaoView from '@/components/financeiro/ConciliacaoView'

export const metadata: Metadata = {
  title: `Conciliacao bancaria — ${BRAND}`,
  description: 'Confira o extrato do banco contra os lancamentos.',
}

export default function ConciliacaoPage() {
  return <ConciliacaoView />
}
