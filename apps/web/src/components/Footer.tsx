import { BRAND, footerColumns } from "@/content/site";
import styles from "./Footer.module.css";

const social = ["Instagram", "LinkedIn", "YouTube"];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          {/* Placeholder de marca — nome e logo ainda nao definidos */}
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true" />
            <span className={styles.brandName}>{BRAND}</span>
          </span>
          <p className={styles.aboutText}>
            Modulos integrados de vendas, financeiro, estoque e fiscal para
            quem toca o comercio no dia a dia — com um assistente que responde
            em linguagem natural.
          </p>

          <ul className={styles.social}>
            {social.map((item) => (
              <li key={item}>
                <a href="#top" className={styles.socialLink}>
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.columns}>
          {footerColumns.map((col) => (
            <nav key={col.title} className={styles.column} aria-label={col.title}>
              <h3 className={styles.columnTitle}>{col.title}</h3>
              <ul className={styles.columnList}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className={styles.columnLink}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {new Date().getFullYear()} {BRAND}. Todos os direitos reservados.
        </p>
        <div className={styles.legal}>
          <a href="#top">Termos de uso</a>
          <a href="#top">Privacidade</a>
        </div>
      </div>
    </footer>
  );
}
