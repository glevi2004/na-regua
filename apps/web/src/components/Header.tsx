"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND, nav } from "@/content/site";
import { IconClose, IconMenu } from "./Icons";
import styles from "./Header.module.css";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Trava a rolagem do fundo enquanto o menu mobile estiver aberto. */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        {/* Placeholder de marca — o nome/logo ainda nao esta definido. */}
        <a href="#top" className={styles.brand} aria-label={`${BRAND}, inicio`}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>{BRAND}</span>
        </a>

        <nav className={styles.nav} aria-label="Secoes do site">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/entrar" className={styles.login}>
            Entrar
          </Link>
          <Link href="/criar-conta" className="btn btnPrimary">
            Comecar agora
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      <div
        id="menu-mobile"
        className={`${styles.mobilePanel} ${open ? styles.mobileOpen : ""}`}
        hidden={!open}
      >
        <nav className={styles.mobileNav} aria-label="Secoes do site">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Link
          href="/criar-conta"
          className={`btn btnPrimary ${styles.mobileCta}`}
          onClick={() => setOpen(false)}
        >
          Comecar agora
        </Link>
        <Link
          href="/entrar"
          className={`btn btnGhost ${styles.mobileCta}`}
          onClick={() => setOpen(false)}
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
