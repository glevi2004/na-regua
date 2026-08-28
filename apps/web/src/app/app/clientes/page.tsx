import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import ClientesLista from '@/components/clientes/ClientesLista'

export const metadata: Metadata = {
  title: `Clientes — ${BRAND}`,
  description: 'Base de clientes, pendencias e historico de compras.',
}

export default function ClientesPage() {
  return <ClientesLista />
}
