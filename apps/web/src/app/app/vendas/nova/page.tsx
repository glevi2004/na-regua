import type { Metadata } from "next";
import { BRAND } from "@/content/site";
import PdvWizard from "@/components/vendas/PdvWizard";

export const metadata: Metadata = {
  title: `Nova venda — ${BRAND}`,
  description: "Ponto de venda: cliente, carrinho, pagamento e nota fiscal.",
};

export default function NovaVendaPage() {
  return <PdvWizard />;
}
