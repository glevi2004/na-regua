import type { Metadata } from "next";
import { BRAND } from "@/content/site";
import EmpresaForm from "@/components/empresa/EmpresaForm";

export const metadata: Metadata = {
  title: `Empresa — ${BRAND}`,
  description: "Dados cadastrais, endereco e certificado digital da empresa.",
};

export default function EmpresaPage() {
  return <EmpresaForm />;
}
