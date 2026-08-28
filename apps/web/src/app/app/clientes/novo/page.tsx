import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import ClienteForm from '@/components/clientes/ClienteForm'

export const metadata: Metadata = {
  title: `Novo cliente — ${BRAND}`,
}

export default function NovoClientePage() {
  return <ClienteForm />
}
