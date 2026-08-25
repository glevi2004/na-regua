"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { BRAND } from "@/content/site";
import { MODULOS_BLOQUEADOS } from "@/lib/access";
import PaymentOverdueBanner from "../billing/PaymentOverdueBanner";
import PaymentRequiredModal from "../billing/PaymentRequiredModal";
import { useSubscription } from "../billing/SubscriptionProvider";
import {
  IconBag,
  IconBank,
  IconBell,
  IconBox,
  IconCalendar,
  IconChart,
  IconClose,
  IconList,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconUsers,
  IconWallet,
  type IconProps,
} from "../Icons";
import styles from "./AppShell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

/** Modulos do mapeamento (docs/ZapGestor_Apresentacao.pdf), agrupados por uso. */
const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operacao",
    items: [
      { href: "/painel", label: "Visao geral", icon: IconChart },
      { href: "/painel/vendas", label: "Vendas", icon: IconBag },
      { href: "/painel/agenda", label: "Agenda", icon: IconCalendar },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/painel/clientes", label: "Clientes", icon: IconUsers },
      { href: "/painel/produtos", label: "Produtos", icon: IconBox },
      { href: "/painel/empresa", label: "Empresa", icon: IconSettings },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/painel/contas-a-pagar", label: "Contas a pagar", icon: IconReceipt },
      { href: "/painel/contas-a-receber", label: "Contas a receber", icon: IconWallet },
      { href: "/painel/bancos", label: "Bancos", icon: IconBank },
      { href: "/painel/plano-de-contas", label: "Plano de contas", icon: IconList },
    ],
  },
];

/** Cadeado exibido ao lado dos modulos restritos. */
function IconLockSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const { bloqueado, pedirRegularizacao } = useSubscription();

  /* Fecha a navegacao ao trocar de rota no mobile.
     Ajuste durante o render (padrao recomendado do React) em vez de efeito:
     evita o render extra que um setState em useEffect provocaria. */
  const [rotaAnterior, setRotaAnterior] = useState(pathname);
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const isActive = (href: string) =>
    href === "/painel" ? pathname === href : pathname.startsWith(href);

  return (
    <div className={`appTheme ${styles.shell}`}>
      {/* Fundo escuro atras da navegacao no mobile */}
      {navOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setNavOpen(false)}
          aria-label="Fechar navegacao"
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}
        id="navegacao-painel"
      >
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>{BRAND}</span>
        </Link>

        <nav className={styles.nav} aria-label="Modulos do sistema">
          {navGroups.map((group) => (
            <div key={group.title} className={styles.navGroup}>
              <span className={styles.navGroupTitle}>{group.title}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const restrito =
                  bloqueado &&
                  (MODULOS_BLOQUEADOS as readonly string[]).includes(item.href);

                /* Modulo restrito continua visivel — mas com cadeado e
                   abrindo o modal em vez de navegar. */
                if (restrito) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      className={`${styles.navItem} ${styles.navLocked}`}
                      onClick={pedirRegularizacao}
                    >
                      <Icon size={18} />
                      {item.label}
                      <span className={styles.navLockIcon}>
                        <IconLockSmall />
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${
                      isActive(item.href) ? styles.navActive : ""
                    }`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.assistant}>
          <span className={styles.assistantIcon}>
            <IconSparkles size={16} />
          </span>
          <p className={styles.assistantText}>
            Peca em texto: &ldquo;o que tenho a pagar hoje?&rdquo;
          </p>
          <button type="button" className={styles.assistantCta}>
            Abrir assistente
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        {/* Aviso persistente de pagamento pendente, acima de tudo */}
        {bloqueado ? <PaymentOverdueBanner /> : null}

        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-controls="navegacao-painel"
            aria-label={navOpen ? "Fechar navegacao" : "Abrir navegacao"}
          >
            {navOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>

          <label className={styles.search}>
            <IconSearch size={18} />
            <input
              type="search"
              placeholder="Buscar cliente, produto ou venda"
              aria-label="Buscar"
            />
          </label>

          <div className={styles.topActions}>
            <button type="button" className={styles.iconButton} aria-label="Notificacoes">
              <IconBell size={19} />
              <span className={styles.badgeDot} />
            </button>
            <div className={styles.user}>
              <span className={styles.avatar}>MA</span>
              <span className={styles.userText}>
                <strong>Marina Alves</strong>
                <span>Mercearia Sol Nascente</span>
              </span>
            </div>
            <Link href="/entrar" className={styles.iconButton} aria-label="Sair">
              <IconLogout size={19} />
            </Link>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      {/* Modal disparado por qualquer tentativa de usar modulo bloqueado */}
      <PaymentRequiredModal />
    </div>
  );
}
