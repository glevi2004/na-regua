'use client'

import { IconCheck } from '../Icons'
import styles from './signup.module.css'

export const SIGNUP_STEPS = [
  { id: 1, label: 'Conta' },
  { id: 2, label: 'Cupom' },
  { id: 3, label: 'Termos' },
  { id: 4, label: 'Pagamento' },
] as const

/** Indicador de progresso das 4 etapas do cadastro. */
export default function SignupStepper({ current }: { current: number }) {
  return (
    <ol className={styles.stepper} aria-label="Etapas do cadastro">
      {SIGNUP_STEPS.map((step) => {
        const done = step.id < current
        const active = step.id === current

        return (
          <li
            key={step.id}
            className={`${styles.step} ${done ? styles.stepDone : ''} ${
              active ? styles.stepActive : ''
            }`}
            aria-current={active ? 'step' : undefined}
          >
            <span className={styles.stepMark}>{done ? <IconCheck size={13} /> : step.id}</span>
            <span className={styles.stepLabel}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
