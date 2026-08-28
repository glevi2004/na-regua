import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import ContasView from '@/components/financeiro/ContasView'

export const metadata: Metadata = {
  title: `Contas a pagar — ${BRAND}`,
  description: 'Titulos, vencimentos e baixas.',
}

export default function ContasPagarPage() {
  return <ContasView tipo="pagar" />
}
