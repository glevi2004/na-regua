import Link from "next/link";
import { trustMetrics } from "@/content/site";
import { IconArrowRight, IconBolt, IconTrendUp } from "./Icons";
import styles from "./Hero.module.css";

/** Alturas do grafico do mockup, em % — apenas ilustrativas. */
const chartBars = [38, 52, 44, 68, 57, 82, 71];

const recentSales = [
  { label: "Venda #1842", meta: "Pix · 3 itens", value: "R$ 268,90" },
  { label: "Venda #1841", meta: "Credito · 1 item", value: "R$ 89,00" },
  { label: "Venda #1840", meta: "Dinheiro · 6 itens", value: "R$ 412,50" },
];

export default function Hero() {
  return (
    <section className={styles.hero} id="top">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={styles.badge}>
            <IconBolt size={15} />
            Gestao modular para o comercio
          </span>

          <h1 className={styles.title}>
            Todo o seu negocio
            <br />
            em um so <span className="gradientText">fluxo</span>
          </h1>

          <p className={styles.lead}>
            Vendas, financeiro, estoque e fiscal em modulos que conversam entre
            si. O que voce lanca no balcao chega pronto no relatorio — sem
            planilha no meio do caminho.
          </p>

          <div className={styles.ctas}>
            <Link href="/criar-conta" className="btn btnPrimary">
              Comecar agora
              <IconArrowRight size={18} />
            </Link>
            <a href="#painel" className="btn btnGhost">
              Ver o painel
            </a>
          </div>

          <p className={styles.note}>
            14 dias gratis · sem cartao de credito
          </p>
        </div>

        {/* Mockup ilustrativo do produto */}
        <div className={styles.mockupWrap}>
          <div className={styles.glow} aria-hidden="true" />

          <div className={styles.mockup} role="img" aria-label="Previa do painel do produto">
            <div className={styles.mockupBar}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.mockupTitle}>Visao geral</span>
            </div>

            <div className={styles.mockupBody}>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Faturamento hoje</span>
                  <strong className={styles.statValue}>R$ 8.420</strong>
                  <span className={styles.statUp}>
                    <IconTrendUp size={13} /> 12%
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>A receber</span>
                  <strong className={styles.statValue}>R$ 23.180</strong>
                  <span className={styles.statMeta}>18 titulos</span>
                </div>
              </div>

              <div className={styles.chartCard}>
                <div className={styles.chartHead}>
                  <span className={styles.chartTitle}>Vendas na semana</span>
                  <span className={styles.chartTag}>+18%</span>
                </div>
                <div className={styles.chart}>
                  {chartBars.map((h, i) => (
                    <span
                      key={i}
                      className={styles.bar}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <ul className={styles.list}>
                {recentSales.map((row) => (
                  <li key={row.label} className={styles.listRow}>
                    <span className={styles.rowDot} />
                    <span className={styles.rowText}>
                      <strong>{row.label}</strong>
                      <span>{row.meta}</span>
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de confianca em movimento continuo */}
      <div className={styles.marquee} aria-label="Numeros da plataforma">
        <div className={styles.marqueeTrack}>
          {[0, 1].map((copy) => (
            <ul key={copy} className={styles.marqueeGroup} aria-hidden={copy === 1}>
              {trustMetrics.map((metric) => (
                <li key={metric} className={styles.marqueeItem}>
                  {metric}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
