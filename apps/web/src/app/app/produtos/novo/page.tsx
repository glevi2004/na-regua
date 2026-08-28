import type { Metadata } from "next";
import { BRAND } from "@/content/site";
import ProdutoForm from "@/components/produtos/ProdutoForm";

export const metadata: Metadata = {
  title: `Novo produto — ${BRAND}`,
};

export default function NovoProdutoPage() {
  return <ProdutoForm />;
}
