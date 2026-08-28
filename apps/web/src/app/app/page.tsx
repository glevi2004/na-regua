import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import { Badge, Card, PageHeader, Stat } from '@/components/ui/UI'
import { Button, ButtonLink } from '@/components/ui/Button'
import { IconArrowRight, IconPlus } from '@/components/Icons'
import { contasPagar, contasReceber, produtos, vendas } from '@/lib/mock-data'
import { describeDueDate, formaPagamentoLabel, formatMoney } from '@/lib/format'
import styles from './painel.module.css'

export const metadata: Metadata = {
  title: `Visao geral — ${BRAND}`,
}

const semana = [
  { dia: 'Seg', valor: 42 },
  { dia: 'Ter', valor: 58 },
  { dia: 'Qua', valor: 47 },
  { dia: 'Qui', valor: 71 },
  { dia: 'Sex', valor: 63 },
  { dia: 'Sab', valor: 88 },
  { dia: 'Dom', valor: 34 },
]

export default function VisaoGeralPage() {
  const vendasHoje = vendas.filter(
    (v) => v.data.startsWith('2026-08-24') && v.status === 'concluida',
  )
  const faturamentoHoje = vendasHoje.reduce((acc, v) => acc + v.total, 0)
  const ticketMedio = vendasHoje.length ? faturamentoHoje / vendasHoje.length : 0

  const aReceber = contasReceber
    .filter((c) => c.status !== 'pago')
    .reduce((acc, c) => acc + (c.valor - c.valorRecebido), 0)

  const aPagar = contasPagar
    .filter((c) => c.status !== 'pago')
    .reduce((acc, c) => acc + (c.valor - c.valorPago), 0)

  const vencimentos = contasPagar.filter((c) => c.status !== 'pago').slice(0, 4)

  const reposicao = produtos.filter((p) => p.estoque < p.estoqueMinimo)

  return (
    <>
      <PageHeader
        title="Bom dia, Marina"
        subtitle="Segunda-feira, 24 de agosto · resumo das ultimas 24 horas"
        actions={
          <Button>
            <IconPlus size={17} />
            Nova venda
          </Button>
        }
      />

      <div className={styles.stats}>
        <Stat
          label="Faturamento hoje"
          value={formatMoney(faturamentoHoje)}
          hint={`${vendasHoje.length} vendas`}
          tone="positive"
        />
        <Stat
          label="Ticket medio"
          value={formatMoney(ticketMedio)}
          hint="+4% vs. ontem"
          tone="positive"
        />
        <Stat label="A receber" value={formatMoney(aReceber)} hint="proximos 30 dias" />
        <Stat label="A pagar" value={formatMoney(aPagar)} hint="1 titulo vencido" tone="warning" />
      </div>

      <div className={styles.grid}>
        {/* Mesa de vendas */}
        <Card
          title="Vendas na semana"
          className={styles.wide}
          action={
            <ButtonLink href="/app/vendas" variant="ghost" size="sm">
              Ver todas
              <IconArrowRight size={15} />
            </ButtonLink>
          }
        >
          <div className={styles.chart}>
            {semana.map((d) => (
              <div key={d.dia} className={styles.chartCol}>
                <span className={styles.bar} style={{ height: `${d.valor}%` }} />
                <span className={styles.chartDay}>{d.dia}</span>
              </div>
            ))}
          </div>

          <h3 className={styles.subTitle}>Ultimas vendas</h3>
          <ul className={styles.rows}>
            {vendas.slice(0, 4).map((venda) => (
              <li key={venda.id} className={styles.row}>
                <span className={styles.rowId}>#{venda.numero}</span>
                <span className={styles.rowMain}>
                  <strong>{venda.clienteNome}</strong>
                  <span>{formaPagamentoLabel[venda.formaPagamento]}</span>
                </span>
                {venda.status === 'cancelada' ? <Badge tone="danger">Cancelada</Badge> : null}
                <span className={styles.rowValue}>{formatMoney(venda.total)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Mesa financeira */}
        <Card
          title="Proximos vencimentos"
          action={
            <ButtonLink href="/app/contas-a-pagar" variant="ghost" size="sm">
              Ver todos
              <IconArrowRight size={15} />
            </ButtonLink>
          }
        >
          <ul className={styles.rows}>
            {vencimentos.map((conta) => (
              <li key={conta.id} className={styles.row}>
                <span className={styles.rowMain}>
                  <strong>{conta.fornecedor}</strong>
                  <span>{describeDueDate(conta.vencimento)}</span>
                </span>
                {conta.status === 'vencido' ? <Badge tone="warning">Vencido</Badge> : null}
                <span className={styles.rowValue}>
                  {formatMoney(conta.valor - conta.valorPago)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Mesa de estoque */}
        <Card
          title="Precisa de reposicao"
          action={
            <ButtonLink href="/app/produtos" variant="ghost" size="sm">
              Ver catalogo
              <IconArrowRight size={15} />
            </ButtonLink>
          }
        >
          <ul className={styles.rows}>
            {reposicao.map((produto) => (
              <li key={produto.id} className={styles.row}>
                <span className={styles.rowMain}>
                  <strong>{produto.descricao}</strong>
                  <span>minimo {produto.estoqueMinimo} un</span>
                </span>
                <span className={`${styles.rowValue} ${styles.alert}`}>{produto.estoque} un</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
