import Link from "next/link";
import { plan } from "@/content/site";
import { IconArrowRight, IconCheck, IconShield } from "./Icons";
import styles from "./Pricing.module.css";

export default function Pricing() {
  return (
    <section className={`section ${styles.section}`} id="planos">
      <div className="container">
        <header className={styles.head}>
          <span className="eyebrow">Planos</span>
          <h2 className="sectionTitle">
            Um plano, todos os <span className="gradientText">modulos</span>
          </h2>
          <p className="sectionLead">
            Sem escalonamento por funcionalidade e sem cobranca por usuario.
            Voce paga por empresa e usa o sistema inteiro.
          </p>
        </header>

        <div className={styles.card}>
          <div className={styles.cardMain}>
            <span className={styles.badge}>{plan.badge}</span>
            <h3 className={styles.planName}>{plan.name}</h3>

            <p className={styles.priceRow}>
              <strong className={styles.price}>{plan.price}</strong>
              <span className={styles.period}>{plan.period}</span>
            </p>

            <Link href="/criar-conta" className={`btn btnPrimary ${styles.cta}`}>
              Comecar teste gratuito
              <IconArrowRight size={18} />
            </Link>

            <p className={styles.note}>{plan.note}</p>

            <p className={styles.secure}>
              <IconShield size={16} />
              Dados isolados por empresa e backup diario
            </p>
          </div>

          <ul className={styles.features}>
            {plan.features.map((feature) => (
              <li key={feature} className={styles.feature}>
                <span className={styles.check}>
                  <IconCheck size={13} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
