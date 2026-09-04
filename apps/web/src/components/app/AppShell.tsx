'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { BRAND } from '@/content/site'
import { MODULOS_BLOQUEADOS } from '@/lib/access'
import { sair as encerrarSessao } from '@/lib/session-client'
import { listarChamados, totalNaoLidas } from '@/lib/suporte-api'
import PaymentOverdueBanner from '../billing/PaymentOverdueBanner'
import PaymentRequiredModal from '../billing/PaymentRequiredModal'
import { useSubscription } from '../billing/SubscriptionProvider'
import {
  IconBag,
  IconBank,
  IconBell,
  IconBox,
  IconCalendar,
  IconChart,
  IconChevronDown,
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
} from '../Icons'
import styles from './AppShell.module.css'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<IconProps>
  /** Sub-itens: hoje usado apenas por Financeiro. */
  children?: { href: string; label: string }[]
}

/** Modulos do mapeamento (docs/ZapGestor_Apresentacao.pdf). */
const navItems: NavItem[] = [
  { href: '/app', label: 'Tela principal', icon: IconChart },
  { href: '/app/vendas', label: 'Vendas', icon: IconBag },
  { href: '/app/clientes', label: 'Clientes', icon: IconUsers },
  { href: '/app/produtos', label: 'Produtos', icon: IconBox },
  {
    href: '/app/financeiro',
    label: 'Financeiro',
    icon: IconWallet,
    children: [
      { href: '/app/financeiro/plano-de-contas', label: 'Plano de contas' },
      { href: '/app/financeiro/contas-a-pagar', label: 'Contas a pagar' },
      { href: '/app/financeiro/contas-a-receber', label: 'Contas a receber' },
      { href: '/app/financeiro/conciliacao', label: 'Conciliacao' },
      { href: '/app/financeiro/dre', label: 'DRE' },
    ],
  },
  { href: '/app/crm', label: 'CRM', icon: IconList },
  { href: '/app/agenda', label: 'Agenda', icon: IconCalendar },
  { href: '/app/empresa', label: 'Empresa', icon: IconSettings },
  { href: '/app/assistente-ia', label: 'Assistente IA', icon: IconSparkles },
  { href: '/app/assinatura', label: 'Assinatura', icon: IconReceipt },
  { href: '/app/suporte', label: 'Suporte', icon: IconBank },
]

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
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const { bloqueado, pedirRegularizacao } = useSubscription()

  /* SUBSTITUIR POR: GET /suporte/chamados (ou contador dedicado) — hoje
     le do mock uma vez, no primeiro render. */
  const [naoLidas] = useState(() => totalNaoLidas(listarChamados()))

  /* Financeiro comeca aberto quando a rota atual esta dentro dele. */
  const [financeiroAberto, setFinanceiroAberto] = useState(pathname.startsWith('/app/financeiro'))

  /* Fecha a navegacao ao trocar de rota no mobile. Ajuste durante o render
     (padrao recomendado do React) em vez de setState em efeito. */
  const [rotaAnterior, setRotaAnterior] = useState(pathname)
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname)
    setNavOpen(false)
    if (pathname.startsWith('/app/financeiro')) setFinanceiroAberto(true)
  }

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  const isActive = (href: string) =>
    href === '/app' ? pathname === href : pathname.startsWith(href)

  const isRestrito = (href: string) =>
    bloqueado &&
    (MODULOS_BLOQUEADOS as readonly string[]).some(
      (rota) => rota === href || rota.startsWith(`${href}/`),
    )

  function sair() {
    /* Nao espera a resposta: sair sempre "da certo" para quem clicou, e travar
       o botao numa rede ruim faria a pessoa clicar de novo achando que falhou.
       O cookie e httpOnly, entao quem o apaga e o servidor. */
    void encerrarSessao()
    router.push('/login')
  }

  return (
    <div className={`appTheme ${styles.shell}`}>
      {navOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setNavOpen(false)}
          aria-label="Fechar navegacao"
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}
        id="navegacao-painel"
      >
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Image src="/buddy-azul.png" alt="" fill className={styles.brandImg} sizes="32px" />
          </span>
          <span className={styles.brandName}>{BRAND}</span>
        </Link>

        <nav className={styles.nav} aria-label="Modulos do sistema">
          {navItems.map((item) => {
            const Icon = item.icon

            /* --- Item com submenu (Financeiro) --- */
            if (item.children) {
              return (
                <div key={item.href} className={styles.navGroup}>
                  <button
                    type="button"
                    className={`${styles.navItem} ${styles.navToggle} ${
                      isActive(item.href) ? styles.navActive : ''
                    }`}
                    onClick={() => setFinanceiroAberto((v) => !v)}
                    aria-expanded={financeiroAberto}
                  >
                    <Icon size={18} />
                    {item.label}
                    <span
                      className={`${styles.navChevron} ${
                        financeiroAberto ? styles.navChevronOpen : ''
                      }`}
                    >
                      <IconChevronDown size={16} />
                    </span>
                  </button>

                  {financeiroAberto ? (
                    <div className={styles.subNav}>
                      {item.children.map((sub) =>
                        isRestrito(sub.href) ? (
                          <button
                            key={sub.href}
                            type="button"
                            className={`${styles.subItem} ${styles.navLocked}`}
                            onClick={pedirRegularizacao}
                          >
                            {sub.label}
                            <span className={styles.navLockIcon}>
                              <IconLockSmall />
                            </span>
                          </button>
                        ) : (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`${styles.subItem} ${
                              pathname === sub.href ? styles.subActive : ''
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              )
            }

            /* --- Modulo restrito: continua visivel, com cadeado --- */
            if (isRestrito(item.href)) {
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
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.navActive : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <Icon size={18} />
                {item.label}
                {/* Respostas de suporte que a pessoa ainda nao viu */}
                {item.href === '/app/suporte' && naoLidas > 0 ? (
                  <span className={styles.navBadge} aria-label={`${naoLidas} resposta(s) nova(s)`}>
                    {naoLidas}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className={styles.main}>
        {/* Aviso persistente de pagamento pendente. Fica no layout de /app,
            portanto aparece em qualquer sub-rota. */}
        {bloqueado ? <PaymentOverdueBanner /> : null}

        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-controls="navegacao-painel"
            aria-label={navOpen ? 'Fechar navegacao' : 'Abrir navegacao'}
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

            <button type="button" className={styles.iconButton} onClick={sair} aria-label="Sair">
              <IconLogout size={19} />
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <PaymentRequiredModal />
    </div>
  )
}
