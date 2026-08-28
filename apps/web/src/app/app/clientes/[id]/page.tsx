import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BRAND } from '@/content/site'
import { clientes } from '@/lib/mock-data'
import ClienteDetalhe from '@/components/clientes/ClienteDetalhe'

/* SUBSTITUIR POR: GET /clientes/:id */
function buscarCliente(id: string) {
  return clientes.find((c) => c.id === id) ?? null
}

export async function generateMetadata({
  params,
}: PageProps<'/app/clientes/[id]'>): Promise<Metadata> {
  const { id } = await params
  const cliente = buscarCliente(id)

  return {
    title: cliente ? `${cliente.nome} — ${BRAND}` : `Cliente — ${BRAND}`,
  }
}

export default async function ClienteDetalhePage({ params }: PageProps<'/app/clientes/[id]'>) {
  const { id } = await params
  const cliente = buscarCliente(id)

  if (!cliente) notFound()

  return <ClienteDetalhe cliente={cliente} />
}
