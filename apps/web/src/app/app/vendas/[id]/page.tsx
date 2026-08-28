import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/site";
import { listarVendas } from "@/lib/vendas-api";
import VendaDetalhe from "@/components/vendas/VendaDetalhe";

/* SUBSTITUIR POR: GET /vendas/:id */
function buscarVenda(id: string) {
  return listarVendas().find((v) => v.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/app/vendas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const venda = buscarVenda(id);

  return {
    title: venda ? `Venda #${venda.numero} — ${BRAND}` : `Venda — ${BRAND}`,
  };
}

export default async function VendaDetalhePage({
  params,
}: PageProps<"/app/vendas/[id]">) {
  const { id } = await params;
  const venda = buscarVenda(id);

  if (!venda) notFound();

  return <VendaDetalhe venda={venda} />;
}
