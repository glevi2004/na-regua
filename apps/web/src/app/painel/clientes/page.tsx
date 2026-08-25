import type { Metadata } from "next";
import { BRAND } from "@/content/site";
import { Badge, Card, PageHeader, Stat, Toolbar } from "@/components/ui/UI";
import { Button } from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { IconPlus, IconUpload } from "@/components/Icons";
import { clientes } from "@/lib/mock-data";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import type { Cliente } from "@/lib/types";

export const metadata: Metadata = {
  title: `Clientes — ${BRAND}`,
};

/** "Quais clientes nao compram ha muito tempo" — do mapeamento do CRM. */
const INATIVO_APOS_DIAS = 60;

const colunas: Column<Cliente>[] = [
  {
    key: "nome",
    header: "Cliente",
    render: (c) => (
      <span className="cellStack">
        <strong>{c.nome}</strong>
        <small>{c.documento}</small>
      </span>
    ),
  },
  {
    key: "contato",
    header: "Contato",
    render: (c) => `(${c.ddd}) ${c.celular}`,
    hideOnMobile: true,
  },
  {
    key: "cidade",
    header: "Cidade",
    render: (c) => `${c.endereco.cidade}/${c.endereco.uf}`,
    hideOnMobile: true,
  },
  {
    key: "compras",
    header: "Compras",
    render: (c) => `${c.totalCompras}`,
    hideOnMobile: true,
  },
  {
    key: "ultima",
    header: "Ultima compra",
    render: (c) => {
      if (!c.ultimaCompra) return <Badge>Nunca comprou</Badge>;
      const dias = Math.abs(daysUntil(c.ultimaCompra));
      return dias > INATIVO_APOS_DIAS ? (
        <Badge tone="warning">{`ha ${dias} dias`}</Badge>
      ) : (
        formatDate(c.ultimaCompra)
      );
    },
  },
  {
    key: "total",
    header: "Total gasto",
    align: "right",
    render: (c) => <strong>{formatMoney(c.valorTotal)}</strong>,
  },
];

export default function ClientesPage() {
  const inativos = clientes.filter(
    (c) => c.ultimaCompra && Math.abs(daysUntil(c.ultimaCompra)) > INATIVO_APOS_DIAS,
  );
  const faturamento = clientes.reduce((acc, c) => acc + c.valorTotal, 0);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Base de clientes e historico de relacionamento"
        actions={
          <>
            <Button variant="secondary">
              <IconUpload size={17} />
              Importar planilha
            </Button>
            <Button>
              <IconPlus size={17} />
              Novo cliente
            </Button>
          </>
        }
      />

      <div className="statRow">
        <Stat label="Clientes cadastrados" value={String(clientes.length)} />
        <Stat
          label="Sem comprar ha 60 dias"
          value={String(inativos.length)}
          hint="vale mandar um Whats"
          tone="warning"
        />
        <Stat label="Faturamento acumulado" value={formatMoney(faturamento)} tone="positive" />
      </div>

      <Card>
        <Toolbar>
          <Button variant="secondary" size="sm">
            Buscar por CPF/CNPJ
          </Button>
          <Button variant="ghost" size="sm">
            Somente inativos
          </Button>
          <Button variant="ghost" size="sm">
            Por cidade
          </Button>
        </Toolbar>

        <DataTable
          columns={colunas}
          rows={clientes}
          getKey={(c) => c.id}
          emptyMessage="Nenhum cliente cadastrado ainda."
        />
      </Card>
    </>
  );
}
