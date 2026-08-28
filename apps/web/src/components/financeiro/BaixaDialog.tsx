'use client'

import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/auth/Fields'
import { IconClose } from '@/components/Icons'
import styles from './financeiro.module.css'

/** Converte "1.234,56" em numero. */
function paraNumero(valor: string): number {
  const limpo = valor.replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

/**
 * Baixa de titulo — total ou parcial.
 *
 * O valor comeca preenchido com o saldo inteiro, porque quitar e o caso
 * comum. A baixa parcial exige digitar o valor de proposito: e a operacao
 * que deixa saldo em aberto, e merece atencao.
 */
export default function BaixaDialog({
  titulo,
  descricao,
  saldo,
  verbo,
  processando = false,
  erro,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  descricao: string
  saldo: number
  /** "pagar" ou "receber" — muda o texto dos botoes. */
  verbo: 'pagar' | 'receber'
  processando?: boolean
  erro?: string | null
  onConfirmar: (valor: number) => void
  onCancelar: () => void
}) {
  const [modo, setModo] = useState<'total' | 'parcial'>('total')
  const [valorParcial, setValorParcial] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processando) onCancelar()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancelar, processando])

  const valor = modo === 'total' ? saldo : paraNumero(valorParcial)
  const restante = saldo - valor
  const valorValido = valor > 0 && valor <= saldo + 0.01

  const rotuloAcao = verbo === 'pagar' ? 'Baixar pagamento' : 'Baixar recebimento'

  return (
    <div className={styles.dialogRoot}>
      <button
        type="button"
        className={styles.dialogBackdrop}
        onClick={() => !processando && onCancelar()}
        aria-label="Fechar"
      />

      <div
        ref={ref}
        className={styles.dialogPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baixa-titulo"
        tabIndex={-1}
      >
        <header className={styles.dialogCabecalho}>
          <h2 id="baixa-titulo" className={styles.dialogTitulo}>
            {rotuloAcao}
          </h2>
          <button
            type="button"
            className={styles.dialogFechar}
            onClick={onCancelar}
            disabled={processando}
            aria-label="Fechar"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className={styles.baixaAlvo}>
          <strong>{titulo}</strong>
          <span>{descricao}</span>
        </div>

        <div className={styles.baixaSaldo}>
          <span>Saldo em aberto</span>
          <strong>{formatMoney(saldo)}</strong>
        </div>

        <div className={styles.baixaModos} role="group" aria-label="Tipo de baixa">
          <button
            type="button"
            className={`${styles.baixaModo} ${modo === 'total' ? styles.baixaModoAtivo : ''}`}
            onClick={() => setModo('total')}
            aria-pressed={modo === 'total'}
          >
            Baixa total
          </button>
          <button
            type="button"
            className={`${styles.baixaModo} ${modo === 'parcial' ? styles.baixaModoAtivo : ''}`}
            onClick={() => setModo('parcial')}
            aria-pressed={modo === 'parcial'}
          >
            Baixa parcial
          </button>
        </div>

        {modo === 'parcial' ? (
          <label className={styles.baixaCampo}>
            <span>Valor {verbo === 'pagar' ? 'pago' : 'recebido'} agora</span>
            <input
              className={styles.baixaInput}
              value={valorParcial}
              onChange={(e) => setValorParcial(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              autoFocus
            />
            {valor > 0 ? (
              <span className={styles.baixaRestante}>
                {restante > 0.01
                  ? `Restam ${formatMoney(restante)} em aberto`
                  : 'Este valor quita o titulo'}
              </span>
            ) : null}
          </label>
        ) : null}

        {erro ? (
          <p className={styles.baixaErro} role="alert">
            {erro}
          </p>
        ) : null}

        <div className={styles.dialogAcoes}>
          <Button variant="secondary" onClick={onCancelar} disabled={processando}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirmar(valor)} disabled={processando || !valorValido}>
            {processando ? (
              <>
                <Spinner size={15} />
                Registrando...
              </>
            ) : (
              `Confirmar ${formatMoney(valor)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
