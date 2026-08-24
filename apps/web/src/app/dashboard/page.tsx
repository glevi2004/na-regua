import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/content/site";
import {
  IconArrowRight,
  IconBag,
  IconBell,
  IconBox,
  IconReceipt,
  IconSearch,
  IconSparkles,
  IconTrendUp,
  IconWallet,
} from "@/components/Icons";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: `Painel — ${BRAND}`,
  description:
    "Exemplo do painel logado, organizado em mesas tematicas por modulo.",
};

const sidebarNav = [
  "Visao geral",
  "Vendas",
  "Financeiro",
  "Estoque",
  "Fiscal",
  "Clientes",
  "Configuracoes",
];

const kpis = [
  { label: "Faturamento hoje", value: "R$ 8.420", delta: "+12%", positive: true },
  { label: "Ticket medio", value: "R$ 247", delta: "+4%", positive: true },
  { label: "A receber (30d)", value: "R$ 23.180", delta: "18 titulos" },
  { label: "Margem media", value: "31,4%", delta: "-1,2%", positive: false },
];

const weekSales = [
  { day: "Seg", height: 42 },
  { day: "Ter", height: 58 },
  { day: "Qua", height: 47 },
  { day: "Qui", height: 71 },
  { day: "Sex", height: 63 },
  { day: "Sab", height: 88 },
  { day: "Dom", height: 34 },
];

const lastSales = [
  { id: "#1842", client: "Joana Ribeiro", method: "Pix", value: "R$ 268,90" },
  { id: "#1841", client: "Venda avulsa", method: "Credito", value: "R$ 89,00" },
  { id: "#1840", client: "Marcos Dias", method: "Dinheiro", value: "R$ 412,50" },
  { id: "#1839", client: "Padaria Sol", method: "Debito", value: "R$ 156,20" },
];

const financeRows = [
  { name: "Fornecedor Aurora", meta: "Vence hoje", value: "R$ 1.240,00", state: "due" },
  { name: "Aluguel do ponto", meta: "Vence em 3 dias", value: "R$ 3.800,00", state: "soon" },
  { name: "Energia eletrica", meta: "Vence em 8 dias", value: "R$ 742,30", state: "ok" },
  { name: "Internet e telefonia", meta: "Vence em 12 dias", value: "R$ 289,90", state: "ok" },
];

const stockRows = [
  { name: "Cafe torrado 500g", meta: "minimo 12 un", value: "4 un", critical: true },
  { name: "Acucar mascavo 1kg", meta: "minimo 10 un", value: "2 un", critical: true },
  { name: "Leite integral 1L", meta: "minimo 24 un", value: "6 un", critical: false },
  { name: "Filtro de papel n103", meta: "minimo 15 un", value: "9 un", critical: false },
];

const fiscalRows = [
  { label: "NFC-e emitidas hoje", value: "34" },
  { label: "NFS-e emitidas no mes", value: "112" },
  { label: "Rejeitadas aguardando", value: "1" },
];

export default function DashboardPage() {
  return (
    <div className={styles.shell}>
      {/* --- Barra lateral --- */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>{BRAND}</span>
        </Link>

        <nav className={styles.nav} aria-label="Modulos do painel">
          {sidebarNav.map((item, i) => (
            <span
              key={item}
              className={`${styles.navItem} ${i === 0 ? styles.navActive : ""}`}
            >
              {item}
            </span>
          ))}
        </nav>

        <div className={styles.assistantCard}>
          <span className={styles.assistantIcon}>
            <IconSparkles size={17} />
          </span>
          <p className={styles.assistantText}>
            Pergunte em texto e receba o numero pronto.
          </p>
          <span className={styles.assistantCta}>Abrir assistente</span>
        </div>
      </aside>

      {/* --- Area principal --- */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.search}>
            <IconSearch size={18} />
            <span>Buscar cliente, produto ou venda</span>
          </div>

          <div className={styles.topActions}>
            <Link href="/" className={styles.backLink}>
              Voltar ao site
              <IconArrowRight size={15} />
            </Link>
            <span className={styles.iconButton}>
              <IconBell size={19} />
              <span className={styles.badgeDot} />
            </span>
            <span className={styles.avatar}>MA</span>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.pageTitle}>Bom dia, Marina</h1>
              <p className={styles.pageSub}>
                Segunda-feira · resumo das ultimas 24 horas
              </p>
            </div>
            <span className={styles.periodChip}>Hoje</span>
          </div>

          {/* Indicadores gerais */}
          <ul className={styles.kpis}>
            {kpis.map((kpi) => (
              <li key={kpi.label} className={styles.kpi}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <strong className={styles.kpiValue}>{kpi.value}</strong>
                <span
                  className={`${styles.kpiDelta} ${
                    kpi.positive === true
                      ? styles.deltaUp
                      : kpi.positive === false
                        ? styles.deltaDown
                        : ""
                  }`}
                >
                  {kpi.positive === true ? <IconTrendUp size={13} /> : null}
                  {kpi.delta}
                </span>
              </li>
            ))}
          </ul>

          {/* Mesas tematicas */}
          <div className={styles.mesas}>
            {/* Mesa de Vendas */}
            <section className={`${styles.mesa} ${styles.mesaWide}`}>
              <header className={styles.mesaHead}>
                <span className={styles.mesaIcon}>
                  <IconBag size={17} />
                </span>
                <h2 className={styles.mesaTitle}>Mesa de Vendas</h2>
                <span className={styles.mesaChip}>
                  <IconTrendUp size={12} /> 18% vs. semana passada
                </span>
              </header>

              <div className={styles.chartWrap}>
                {weekSales.map((d) => (
                  <div key={d.day} className={styles.chartCol}>
                    <span
                      className={styles.chartBar}
                      style={{ height: `${d.height}%` }}
                    />
                    <span className={styles.chartDay}>{d.day}</span>
                  </div>
                ))}
              </div>

              <h3 className={styles.subTitle}>Ultimas vendas</h3>
              <ul className={styles.rows}>
                {lastSales.map((sale) => (
                  <li key={sale.id} className={styles.row}>
                    <span className={styles.rowId}>{sale.id}</span>
                    <span className={styles.rowMain}>
                      <strong>{sale.client}</strong>
                      <span>{sale.method}</span>
                    </span>
                    <span className={styles.rowValue}>{sale.value}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Mesa Financeira */}
            <section className={styles.mesa}>
              <header className={styles.mesaHead}>
                <span className={styles.mesaIcon}>
                  <IconWallet size={17} />
                </span>
                <h2 className={styles.mesaTitle}>Mesa Financeira</h2>
              </header>

              <div className={styles.splitStats}>
                <div>
                  <span className={styles.splitLabel}>A receber</span>
                  <strong className={styles.splitValue}>R$ 23.180</strong>
                </div>
                <div>
                  <span className={styles.splitLabel}>A pagar</span>
                  <strong className={styles.splitValue}>R$ 6.072</strong>
                </div>
              </div>

              <h3 className={styles.subTitle}>Proximos vencimentos</h3>
              <ul className={styles.rows}>
                {financeRows.map((row) => (
                  <li key={row.name} className={styles.row}>
                    <span
                      className={`${styles.dot} ${
                        row.state === "due"
                          ? styles.dotDue
                          : row.state === "soon"
                            ? styles.dotSoon
                            : styles.dotOk
                      }`}
                    />
                    <span className={styles.rowMain}>
                      <strong>{row.name}</strong>
                      <span>{row.meta}</span>
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Mesa de Estoque */}
            <section className={styles.mesa}>
              <header className={styles.mesaHead}>
                <span className={styles.mesaIcon}>
                  <IconBox size={17} />
                </span>
                <h2 className={styles.mesaTitle}>Mesa de Estoque</h2>
                <span className={`${styles.mesaChip} ${styles.mesaChipWarn}`}>
                  4 abaixo do minimo
                </span>
              </header>

              <ul className={styles.rows}>
                {stockRows.map((row) => (
                  <li key={row.name} className={styles.row}>
                    <span
                      className={`${styles.dot} ${
                        row.critical ? styles.dotDue : styles.dotSoon
                      }`}
                    />
                    <span className={styles.rowMain}>
                      <strong>{row.name}</strong>
                      <span>{row.meta}</span>
                    </span>
                    <span
                      className={`${styles.rowValue} ${
                        row.critical ? styles.valueAlert : ""
                      }`}
                    >
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>

              <span className={styles.mesaAction}>
                Gerar pedido de compra
                <IconArrowRight size={15} />
              </span>
            </section>

            {/* Mesa Fiscal */}
            <section className={styles.mesa}>
              <header className={styles.mesaHead}>
                <span className={styles.mesaIcon}>
                  <IconReceipt size={17} />
                </span>
                <h2 className={styles.mesaTitle}>Mesa Fiscal</h2>
              </header>

              <ul className={styles.rows}>
                {fiscalRows.map((row) => (
                  <li key={row.label} className={styles.row}>
                    <span className={styles.rowMain}>
                      <strong>{row.label}</strong>
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.mesaNote}>
                Nota emitida junto com o fechamento da venda, com imposto e taxa
                de cartao ja calculados.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
