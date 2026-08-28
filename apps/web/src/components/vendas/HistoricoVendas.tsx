'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FORMAS, listarVendas, type VendaHistorico } from '@/lib/vendas-api'
import { daysUntil, formatDateTime, formatMoney } from '@/lib/format'
import { Badge, Card, EmptyState, PageHeader, Stat } from '@/components/ui/UI'
import { ButtonLink, Button } from '@/components/ui/Button'
import { IconPlus, IconSearch } from '@/components/Icons'
import { COMANDOS_VENDAS } from '@/lib/comandos'
import ComandosWhatsApp from '@/components/app/ComandosWhatsApp'
import styles from './vendas.module.css'

type FiltroStatus = 'todas' | 'concluida' | 'estornada'

export default function HistoricoVendas() {
  const [vendas] = useState<VendaHistorico[]>(() => listarVendas())
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<FiltroStatus>('todas')
  const [periodo, setPeriodo] = useState(0)

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return vendas.filter((v) => {
      if (termo) {
        const casa = v.clienteNome.toLowerCase().includes(termo) || v.numero.includes(termo)
        if (!casa) return false
      }
      if (status !== 'todas' && v.status !== status) return false
      if (periodo > 0 && Math.abs(daysUntil(v.data.slice(0, 10))) > periodo) return false
      return true
    })
  }, [vendas, busca, status, periodo])

  const concluidas = vendas.filter((v) => v.status === 'concluida')
  const faturamento = concluidas.reduce((acc, v) => acc + v.total, 0)
  const liquido = concluidas.reduce((acc, v) => acc + v.valorLiquido, 0)
  const ticket = concluidas.length ? faturamento / concluidas.length : 0

  return (
    <>
      <PageHeader
        title="Vendas"
        subtitle="Historico de vendas fechadas"
        actions={
          <ButtonLink href="/app/vendas/nova">
            <IconPlus size={17} />
            Nova venda
          </ButtonLink>
        }
      />

      <div className="statRow">
        <Stat
          label="Faturamento"
          value={formatMoney(faturamento)}
          hint={`${concluidas.length} vendas`}
        />
        <Stat
          label="Valor liquido"
          value={formatMoney(liquido)}
          hint="ja sem taxa de cartao"
          tone="positive"
        />
        <Stat label="Ticket medio" value={formatMoney(ticket)} />
      </div>

      <Card>
        <div className={styles.historicoBarra}>
          <label className={styles.busca}>
            <IconSearch size={17} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cliente ou numero"
              aria-label="Buscar venda"
            />
          </label>

          <select
            className={styles.select}
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            aria-label="Periodo"
          >
            <option value={0}>Qualquer periodo</option>
            <option value={1}>Hoje e ontem</option>
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>

        <div className={styles.filtros} role="group" aria-label="Status">
          {(
            [
              ['todas', 'Todas'],
              ['concluida', 'Concluidas'],
              ['estornada', 'Estornadas'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={`${styles.categoria} ${status === valor ? styles.categoriaAtiva : ''}`}
              onClick={() => setStatus(valor)}
              aria-pressed={status === valor}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {filtradas.length === 0 ? (
          <EmptyState
            title={vendas.length === 0 ? 'Nenhuma venda ainda' : 'Nenhuma venda encontrada'}
            description={
              vendas.length === 0
                ? 'Abra o PDV e registre a primeira venda.'
                : 'Ajuste a busca ou os filtros.'
            }
            action={
              vendas.length === 0 ? (
                <ButtonLink href="/app/vendas/nova">
                  <IconPlus size={16} />
                  Nova venda
                </ButtonLink>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBusca('')
                    setStatus('todas')
                    setPeriodo(0)
                  }}
                >
                  Limpar filtros
                </Button>
              )
            }
          />
        ) : (
          <ul className={styles.historico}>
            {filtradas.map((v) => (
              <li key={v.id}>
                <Link href={`/app/vendas/${v.id}`} className={styles.vendaLinha}>
                  <span className={styles.vendaNumero}>#{v.numero}</span>

                  <span className={styles.vendaPrincipal}>
                    <strong>{v.clienteNome}</strong>
                    <span>
                      {formatDateTime(v.data)} ·{' '}
                      {v.pagamentos
                        .map((p) => FORMAS.find((f) => f.valor === p.forma)?.rotulo)
                        .join(' + ')}
                    </span>
                  </span>

                  <span className={styles.vendaNota}>
                    {v.nota ? (
                      <Badge tone="info">
                        {v.nota.tipo === 'nfce' ? 'NFC-e' : 'NFS-e'} {v.nota.numero}
                      </Badge>
                    ) : (
                      <Badge>Sem nota</Badge>
                    )}
                  </span>

                  <span className={styles.vendaStatus}>
                    {v.status === 'estornada' ? (
                      <Badge tone="danger">Estornada</Badge>
                    ) : (
                      <Badge tone="success">Concluida</Badge>
                    )}
                  </span>

                  <span className={styles.vendaTotal}>{formatMoney(v.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className={styles.comandosWrap}>
        <ComandosWhatsApp comandos={COMANDOS_VENDAS} />
      </div>
    </>
  )
}
