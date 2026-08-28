'use client'

import { useId } from 'react'
import styles from './signup.module.css'

/**
 * Aceite obrigatorio dos termos. O botao de avancar da etapa 3 fica
 * desabilitado enquanto `checked` for falso.
 *
 * Os documentos abrem em nova aba — trocar `href` pelas URLs reais quando
 * as paginas juridicas existirem.
 */
export default function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()

  return (
    <div className={styles.terms}>
      <input
        id={id}
        type="checkbox"
        className={styles.termsBox}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={styles.termsLabel}>
        Li e aceito os{' '}
        <a href="/termos-de-uso" target="_blank" rel="noreferrer noopener">
          Termos de Uso
        </a>{' '}
        e a{' '}
        <a href="/politica-de-privacidade" target="_blank" rel="noreferrer noopener">
          Politica de Privacidade
        </a>
        .
      </label>
    </div>
  )
}
