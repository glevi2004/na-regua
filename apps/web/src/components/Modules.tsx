import type { ComponentType } from 'react'
import { modules } from '@/content/site'
import {
  IconBag,
  IconBox,
  IconCalendar,
  IconSparkles,
  IconStore,
  IconUsers,
  IconWallet,
  type IconProps,
} from './Icons'
import styles from './Modules.module.css'

const iconMap: Record<string, ComponentType<IconProps>> = {
  store: IconStore,
  users: IconUsers,
  box: IconBox,
  wallet: IconWallet,
  bag: IconBag,
  calendar: IconCalendar,
  sparkles: IconSparkles,
}

export default function Modules() {
  return (
    <section className="section" id="modulos">
      <div className="container">
        <header className={styles.head}>
          <span className="eyebrow">Modulos</span>
          <h2 className="sectionTitle">
            Sete modulos, um <span className="gradientText">unico</span> banco de dados
          </h2>
          <p className="sectionLead">
            Cada modulo resolve uma parte da operacao e devolve o resultado para os outros. A venda
            baixa o estoque, lanca o recebivel e emite a nota no mesmo passo.
          </p>
        </header>

        <ul className={styles.cards}>
          {modules.map((mod) => {
            const Icon = iconMap[mod.icon]
            return (
              <li key={mod.id} className={styles.card}>
                <span className={styles.cardIcon}>{Icon ? <Icon size={22} /> : null}</span>
                <span className={styles.cardTag}>{mod.tag}</span>
                <h3 className={styles.cardName}>{mod.name}</h3>
                <p className={styles.cardText}>{mod.description}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
