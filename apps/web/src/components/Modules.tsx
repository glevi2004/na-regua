import type { ComponentType } from "react";
import { modules, verticals } from "@/content/site";
import {
  IconBag,
  IconBox,
  IconHeart,
  IconHome,
  IconReceipt,
  IconShirt,
  IconSparkles,
  IconStore,
  IconUtensils,
  IconWallet,
  type IconProps,
} from "./Icons";
import styles from "./Modules.module.css";

const iconMap: Record<string, ComponentType<IconProps>> = {
  bag: IconBag,
  wallet: IconWallet,
  box: IconBox,
  receipt: IconReceipt,
  sparkles: IconSparkles,
  store: IconStore,
  home: IconHome,
  utensils: IconUtensils,
  heart: IconHeart,
  shirt: IconShirt,
};

export default function Modules() {
  return (
    <section className="section" id="modulos">
      <div className="container">
        <header className={styles.head}>
          <span className="eyebrow">Modulos</span>
          <h2 className="sectionTitle">
            Cinco frentes, um <span className="gradientText">unico</span> banco
            de dados
          </h2>
          <p className="sectionLead">
            Cada modulo resolve uma parte da operacao e devolve o resultado para
            os outros. Ligue so o que precisa agora e acrescente o resto quando
            fizer sentido.
          </p>
        </header>

        <ul className={styles.cards}>
          {modules.map((mod) => {
            const Icon = iconMap[mod.icon];
            return (
              <li key={mod.id} className={styles.card}>
                <span className={styles.cardIcon}>
                  {Icon ? <Icon size={22} /> : null}
                </span>
                <span className={styles.cardTag}>{mod.tag}</span>
                <h3 className={styles.cardName}>{mod.name}</h3>
                <p className={styles.cardText}>{mod.description}</p>
              </li>
            );
          })}
        </ul>

        {/* Ecossistema: o mesmo nucleo adaptado por segmento */}
        <div className={styles.verticals}>
          <p className={styles.verticalsLabel}>
            O mesmo nucleo, ajustado para cada segmento
          </p>
          <ul className={styles.verticalsList}>
            {verticals.map((v) => {
              const Icon = iconMap[v.icon];
              return (
                <li key={v.label} className={styles.vertical}>
                  {Icon ? <Icon size={19} /> : null}
                  {v.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
