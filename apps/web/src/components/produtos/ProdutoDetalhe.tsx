'use client'

import { useMemo, useState } from 'react'
import {
  ajustarEstoque,
  calcularMargem,
  movimentacoesEstoque,
  nivelEstoque,
} from '@/lib/produtos-api'
import type { Produto } from '@/lib/types'
import { daysUntil, formatDate, formatMoney, formatPercent } from '@/lib/format'
import { Badge, Card, EmptyState, PageHeader, Stat } from '@/components/ui/UI'
import { Button, ButtonLink } from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { Spinner } from '@/components/auth/Fields'
import styles from './detalhe.module.css'

/** Janelas do filtro de periodo, em dias. */
const PERIODOS = [
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
  { valor: 0, rotulo: 'Tudo' },
] as const

export default function ProdutoDetalhe({ produto }: { produto: Produto }) {
  const [periodo, setPeriodo] = useState<number>(90)
  const [novaQuantidade, setNovaQuantidade] = useState(String(produto.estoque))
  const [motivo, setMotivo] = useState('')
  const [ajustando, setAjustando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  const todosMovimentos = movimentacoesEstoque(produto.id)

  const movimentos = useMemo(() => {
    if (periodo === 0) return todosMovimentos
    return todosMovimentos.filter((m) => Math.abs(daysUntil(m.data)) <= periodo)
  }, [todosMovimentos, periodo])

  const entradas = movimentos
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.quantidade, 0)
  const saidas = movimentos
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + m.quantidade, 0)

  const nivel = nivelEstoque(produto)
  const margem = calcularMargem(produto.precoCusto, produto.precoVenda)

  async function confirmarAjuste() {
    const quantidade = Number(novaQuantidade)
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      setToast({ msg: 'Informe uma quantidade valida.', tone: 'error' })
      return
    }

    setAjustando(true)
    /* SUBSTITUIR POR: POST /produtos/:id/ajustes */
    const r = await ajustarEstoque(produto.id, quantidade, motivo)
    setAjustando(false)

    if (!r.ok) {
      setToast({ msg: r.error, tone: 'error' })
      return
    }

    setMotivo('')
    setToast({ msg: 'Ajuste registrado no historico.', tone: 'success' })
  }

  return (
    <>
      <PageHeader
        title={produto.descricao}
        subtitle={`${produto.codigo} · ${produto.categoria} · ${produto.fornecedor}`}
        actions={
          <ButtonLink href="/app/produtos" variant="secondary">
            Voltar ao catalogo
          </ButtonLink>
        }
      />

      <div className="statRow">
        <Stat
          label="Estoque atual"
          value={`${produto.estoque} un`}
          hint={`minimo ${produto.estoqueMinimo} un`}
          tone={nivel === 'normal' ? 'positive' : 'warning'}
        />
        <Stat label="Preco de venda" value={formatMoney(produto.precoVenda)} />
        <Stat
          label="Margem"
          value={margem === null ? '—' : formatPercent(margem)}
          hint={`custo ${formatMoney(produto.precoCusto)}`}
        />
        <Stat
          label="Sem vender ha"
          value={`${produto.diasSemVenda} dia(s)`}
          tone={produto.diasSemVenda > 30 ? 'warning' : 'neutral'}
        />
      </div>

      <div className={styles.grid}>
        {/* --- Ficha --- */}
        <Card title="Ficha do produto">
          <dl className={styles.ficha}>
            <div>
              <dt>Codigo</dt>
              <dd>{produto.codigo}</dd>
            </div>
            <div>
              <dt>EAN</dt>
              <dd>{produto.ean || '—'}</dd>
            </div>
            <div>
              <dt>NCM</dt>
              <dd>{produto.ncm || '—'}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{produto.categoria}</dd>
            </div>
            <div>
              <dt>Fornecedor</dt>
              <dd>{produto.fornecedor}</dd>
            </div>
            <div>
              <dt>Situacao</dt>
              <dd>
                {nivel === 'esgotado' ? (
                  <Badge tone="danger">Esgotado</Badge>
                ) : nivel === 'baixo' ? (
                  <Badge tone="warning">Estoque baixo</Badge>
                ) : (
                  <Badge tone="success">Normal</Badge>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        {/* --- Ajuste manual --- */}
        <Card title="Ajustar estoque">
          <p className={styles.ajusteNota}>
            Use para corrigir a quantidade apos contagem, avaria ou perda. O motivo fica registrado
            no historico — e o que permite entender depois por que o saldo mudou sem venda nem
            compra.
          </p>

          <div className={styles.ajusteCampos}>
            <label className={styles.ajusteCampo}>
              <span>Nova quantidade</span>
              <input
                className={styles.ajusteInput}
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
              />
            </label>

            <label className={styles.ajusteCampo}>
              <span>Motivo</span>
              <input
                className={styles.ajusteInput}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Contagem de inventario"
              />
            </label>
          </div>

          <Button onClick={confirmarAjuste} disabled={ajustando}>
            {ajustando ? (
              <>
                <Spinner size={15} />
                Registrando...
              </>
            ) : (
              'Registrar ajuste'
            )}
          </Button>
        </Card>

        {/* --- Historico --- */}
        <Card
          title="Historico de estoque"
          className={styles.largo}
          action={
            <div className={styles.periodos} role="group" aria-label="Periodo">
              {PERIODOS.map((p) => (
                <button
                  key={p.valor}
                  type="button"
                  className={`${styles.periodo} ${periodo === p.valor ? styles.periodoAtivo : ''}`}
                  onClick={() => setPeriodo(p.valor)}
                  aria-pressed={periodo === p.valor}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
          }
        >
          {movimentos.length === 0 ? (
            <EmptyState
              title="Nenhuma movimentacao no periodo"
              description="Entradas por compra, saidas por venda e ajustes manuais aparecem aqui."
            />
          ) : (
            <>
              <div className={styles.resumoMov}>
                <span>
                  Entradas <strong className={styles.entrada}>+{entradas}</strong>
                </span>
                <span>
                  Saidas <strong className={styles.saida}>-{saidas}</strong>
                </span>
                <span>
                  Saldo atual <strong>{produto.estoque} un</strong>
                </span>
              </div>

              <ul className={styles.movimentos}>
                {movimentos.map((m) => (
                  <li key={m.id} className={styles.movimento}>
                    <span className={styles.movData}>{formatDate(m.data)}</span>

                    <span className={styles.movPrincipal}>
                      <strong>{m.origem}</strong>
                      {m.motivo ? <span>{m.motivo}</span> : null}
                    </span>

                    <span
                      className={`${styles.movQuantidade} ${
                        m.tipo === 'entrada'
                          ? styles.entrada
                          : m.tipo === 'saida'
                            ? styles.saida
                            : styles.ajuste
                      }`}
                    >
                      {m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '-' : ''}
                      {Math.abs(m.quantidade)}
                    </span>

                    <span className={styles.movSaldo}>saldo {m.saldo}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {toast ? (
        <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </>
  )
}
