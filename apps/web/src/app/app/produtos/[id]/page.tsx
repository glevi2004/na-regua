import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BRAND } from '@/content/site'
import { produtos } from '@/lib/mock-data'
import ProdutoDetalhe from '@/components/produtos/ProdutoDetalhe'

/* SUBSTITUIR POR: GET /produtos/:id */
function buscarProduto(id: string) {
  return produtos.find((p) => p.id === id) ?? null
}

export async function generateMetadata({
  params,
}: PageProps<'/app/produtos/[id]'>): Promise<Metadata> {
  const { id } = await params
  const produto = buscarProduto(id)

  return {
    title: produto ? `${produto.descricao} — ${BRAND}` : `Produto — ${BRAND}`,
  }
}

export default async function ProdutoDetalhePage({ params }: PageProps<'/app/produtos/[id]'>) {
  const { id } = await params
  const produto = buscarProduto(id)

  if (!produto) notFound()

  return <ProdutoDetalhe produto={produto} />
}
