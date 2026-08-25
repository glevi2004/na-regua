import type { Metadata } from "next";
import { BRAND } from "@/content/site";
import { Badge, Card, PageHeader, Stat, Toolbar } from "@/components/ui/UI";
import { Button, ButtonLink } from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { IconFilter, IconPlus } from "@/components/Icons";
import { vendas } from "@/lib/mock-data";
import {
  formaPagamentoLabel,
  formatDateTime,
  formatMoney,
  notaLabel,
  statusVendaLabel,
} from "@/lib/format";
import type { Venda } from "@/lib/types";

export const metadata: Metadata = {
  title: `Vendas — ${BRAND}`,
};

const colunas: Column<Venda>[] = [
  {
    key: "numero",
    header: "Venda",
    render: (v) => <strong>#{v.numero}</strong>,
  },
  {
    key: "cliente",
    header: "Cliente",
    render: (v) => v.clienteNome,
  },
  {
    key: "data",
    header: "Data",
    render: (v) => formatDateTime(v.data),
    hideOnMobile: true,
  },
  {
    key: "pagamento",
    header: "Pagamento",
    render: (v) => formaPagamentoLabel[v.formaPagamento],
  },
  {
    key: "nota",
    header: "Nota",
    render: (v) =>
      v.nota === "sem_nota" ? (
        <Badge>Sem nota</Badge>
      ) : (
        <Badge tone="info">{notaLabel[v.nota]}</Badge>
      ),
    hideOnMobile: true,
  },
  {
    key: "status",
    header: "Status",
    render: (v) =>
      v.status === "concluida" ? (
        <Badge tone="success">{statusVendaLabel[v.status]}</Badge>
      ) : v.status === "cancelada" ? (
        <Badge tone="danger">{statusVendaLabel[v.status]}</Badge>
      ) : (
        <Badge tone="warning">{statusVendaLabel[v.status]}</Badge>
      ),
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    render: (v) => <strong>{formatMoney(v.total)}</strong>,
  },
];

export default function VendasPage() {
  const concluidas = vendas.filter((v) => v.status === "concluida");
  const faturamento = concluidas.reduce((acc, v) => acc + v.total, 0);
  const liquido = concluidas.reduce((acc, v) => acc + v.valorLiquido, 0);
  const impostos = concluidas.reduce(
    (acc, v) => acc + v.imposto + v.tarifaCartao,
    0,
  );

  return (
    <>
      <PageHeader
        title="Vendas"
        subtitle="Historico de vendas com custo, imposto e tarifa ja calculados"
        actions={
          <ButtonLink href="/painel/vendas/nova">
            <IconPlus size={17} />
            Nova venda
          </ButtonLink>
        }
      />

      <div className="statRow">
        <Stat label="Faturamento" value={formatMoney(faturamento)} hint={`${concluidas.length} vendas`} />
        <Stat label="Valor liquido" value={formatMoney(liquido)} hint="ja em contas a receber" tone="positive" />
        <Stat label="Imposto + tarifa" value={formatMoney(impostos)} hint="descontado do bruto" />
      </div>

      <Card>
        <Toolbar>
          <Button variant="secondary" size="sm">
            <IconFilter size={15} />
            Filtrar por periodo
          </Button>
          <Button variant="ghost" size="sm">
            Forma de pagamento
          </Button>
          <Button variant="ghost" size="sm">
            Status
          </Button>
        </Toolbar>

        <DataTable
          columns={colunas}
          rows={vendas}
          getKey={(v) => v.id}
          emptyMessage="Nenhuma venda registrada no periodo."
        />
      </Card>
    </>
  );
}
