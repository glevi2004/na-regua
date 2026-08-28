import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import AssinaturaView from '@/components/billing/AssinaturaView'

export const metadata: Metadata = {
  title: `Assinatura — ${BRAND}`,
}

export default function AssinaturaPage() {
  return <AssinaturaView />
}
