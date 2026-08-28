'use client'

import { useEffect } from 'react'
import { IconCheck, IconClose } from '../Icons'
import styles from './Toast.module.css'

export type ToastTone = 'success' | 'error'

/**
 * Aviso temporario no rodape da tela.
 *
 * `role="status"` com `aria-live="polite"` faz o leitor de tela anunciar a
 * mensagem sem interromper o que a pessoa esta fazendo — que e o
 * comportamento certo para confirmacao de salvamento.
 */
export default function Toast({
  message,
  tone = 'success',
  onClose,
  duration = 4000,
}: {
  message: string
  tone?: ToastTone
  onClose: () => void
  duration?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className={`${styles.toast} ${styles[tone]}`} role="status" aria-live="polite">
      <span className={styles.icon}>
        {tone === 'success' ? <IconCheck size={15} /> : <IconClose size={15} />}
      </span>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar aviso">
        <IconClose size={16} />
      </button>
    </div>
  )
}
