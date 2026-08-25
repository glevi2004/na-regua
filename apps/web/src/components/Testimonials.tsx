"use client";

import { useState } from "react";
import { proofMetrics, testimonials } from "@/content/site";
import { IconArrowRight, IconQuote } from "./Icons";
import styles from "./Testimonials.module.css";

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const total = testimonials.length;

  const go = (dir: number) => setIndex((i) => (i + dir + total) % total);

  return (
    <section className="section">
      <div className="container">
        <header className={styles.head}>
          <span className="eyebrow">Prova social</span>
          <h2 className="sectionTitle">
            Numeros de quem ja trocou a planilha
          </h2>
        </header>

        <ul className={styles.metrics}>
          {proofMetrics.map((m) => (
            <li key={m.label} className={styles.metric}>
              <strong className={styles.metricValue}>{m.value}</strong>
              <span className={styles.metricLabel}>{m.label}</span>
            </li>
          ))}
        </ul>

        <div className={styles.carousel}>
          <div className={styles.viewport}>
            <div
              className={styles.track}
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {testimonials.map((t) => (
                <figure key={t.name} className={styles.slide}>
                  <span className={styles.quoteMark}>
                    <IconQuote size={26} />
                  </span>
                  <blockquote className={styles.quote}>{t.quote}</blockquote>
                  <figcaption className={styles.author}>
                    <span className={styles.avatar}>{t.initials}</span>
                    <span className={styles.authorText}>
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className={styles.controls}>
            <div className={styles.dots}>
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Ver depoimento ${i + 1} de ${total}`}
                  aria-current={i === index}
                />
              ))}
            </div>

            <div className={styles.arrows}>
              <button
                type="button"
                className={`${styles.arrow} ${styles.arrowPrev}`}
                onClick={() => go(-1)}
                aria-label="Depoimento anterior"
              >
                <IconArrowRight size={18} />
              </button>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => go(1)}
                aria-label="Proximo depoimento"
              >
                <IconArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
