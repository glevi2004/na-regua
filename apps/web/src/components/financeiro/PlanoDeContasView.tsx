'use client'

import { useState } from 'react'
import {
  excluirCustoFixo,
  gerarContasDeCustosFixos,
  listarCustosFixos,
  listarPlanos,
  NOMES_BANCOS,
  salvarCustoFixo,
  salvarPlanoContas,
} from '@/lib/financeiro-api'
import type { CustoFixo, PlanoContas } from '@/lib/types'
import { formatMoney } from '@/lib/format'
import { Badge, Card, EmptyState, PageHeader, Stat } from '@/components/ui/UI'
import { Button } from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { Spinner } from '@/components/auth/Fields'
import { IconCalendar, IconPlus, IconTrash } from '@/components/Icons'
import CampoTag from '@/components/app/CampoTag'
import { COMANDOS_PLANO_CONTAS } from '@/lib/comandos'
import ComandosWhatsApp from '@/components/app/ComandosWhatsApp'
import ConfirmarDialog from '@/components/app/ConfirmarDialog'
import styles from './financeiro.module.css'

function paraNumero(valor: string): number {
  const limpo = valor.replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

export default function PlanoDeContasView() {
  const [planos, setPlanos] = useState<PlanoContas[]>(() => listarPlanos())
  const [custos, setCustos] = useState<CustoFixo[]>(() => listarCustosFixos())

  const [novoPlano, setNovoPlano] = useState('')
  const [salvandoPlano, setSalvandoPlano] = useState(false)

  const [editando, setEditando] = useState<CustoFixo | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [excluindo, setExcluindo] = useState<CustoFixo | null>(null)
  const [gerando, setGerando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  const totalCustosFixos = custos.reduce((acc, c) => acc + c.valor, 0)
  const gastoTotal = planos
    .filter((p) => p.tipo === 'despesa')
    .reduce((acc, p) => acc + p.gastoMes, 0)

  /* ---------------------------------------------------------------- *
   * Plano de conta
   * ---------------------------------------------------------------- */

  async function criarPlano(event: React.FormEvent) {
    event.preventDefault()

    setSalvandoPlano(true)
    /* SUBSTITUIR POR: POST /financeiro/planos */
    const r = await salvarPlanoContas(novoPlano)
    setSalvandoPlano(false)

    if (!r.ok) {
      setToast({ msg: r.error, tone: 'error' })
      return
    }

    setPlanos((p) => [...p, { id: r.id, nome: novoPlano.trim(), tipo: 'despesa', gastoMes: 0 }])
    setNovoPlano('')
    setToast({ msg: 'Plano de conta criado.', tone: 'success' })
  }

  /* ---------------------------------------------------------------- *
   * Custos fixos
   * ---------------------------------------------------------------- */

  async function confirmarExclusao() {
    if (!excluindo) return

    setProcessando(true)
    /* SUBSTITUIR POR: DELETE /financeiro/custos-fixos/:id */
    await excluirCustoFixo(excluindo.id)
    setProcessando(false)

    setCustos((c) => c.filter((x) => x.id !== excluindo.id))
    setExcluindo(null)
    setToast({ msg: 'Custo fixo excluido.', tone: 'success' })
  }

  async function gerarContas() {
    setGerando(true)
    /* SUBSTITUIR POR: POST /financeiro/custos-fixos/gerar */
    const r = await gerarContasDeCustosFixos(custos, '2026-08')
    setGerando(false)

    setToast({
      msg:
        r.jaExistiam > 0
          ? `${r.geradas} conta(s) gerada(s). ${r.jaExistiam} ja existiam neste mes e foram puladas.`
          : `${r.geradas} conta(s) a pagar gerada(s) para agosto.`,
      tone: 'success',
    })
  }

  return (
    <>
      <PageHeader
        title="Plano de contas"
        subtitle="Estrutura de receitas e despesas, e custos fixos do negocio"
        actions={
          <Button onClick={gerarContas} disabled={gerando || custos.length === 0}>
            {gerando ? (
              <>
                <Spinner size={15} />
                Gerando...
              </>
            ) : (
              <>
                <IconCalendar size={16} />
                Gerar contas a pagar
              </>
            )}
          </Button>
        }
      />

      <div className="statRow">
        <Stat label="Planos cadastrados" value={String(planos.length)} />
        <Stat
          label="Custos fixos"
          value={String(custos.length)}
          hint={formatMoney(totalCustosFixos) + ' por mes'}
        />
        <Stat label="Gasto no mes" value={formatMoney(gastoTotal)} hint="somando as despesas" />
      </div>

      <div className={styles.duasColunas}>
        {/* --- Planos --- */}
        <Card title="Planos de conta">
          <form onSubmit={criarPlano} className={styles.novoPlano}>
            <input
              className={styles.input}
              value={novoPlano}
              onChange={(e) => setNovoPlano(e.target.value)}
              placeholder="Nome do plano de conta"
              aria-label="Nome do plano de conta"
            />
            <Button type="submit" disabled={salvandoPlano || !novoPlano.trim()}>
              {salvandoPlano ? <Spinner size={15} /> : <IconPlus size={16} />}
              Criar
            </Button>
          </form>

          <ul className={styles.planos}>
            {planos.map((p) => (
              <li key={p.id} className={styles.plano}>
                <span className={styles.planoNome}>
                  <strong>{p.nome}</strong>
                  <Badge tone={p.tipo === 'receita' ? 'success' : 'neutral'}>
                    {p.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </Badge>
                </span>
                <span className={styles.planoValor}>{formatMoney(p.gastoMes)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* --- Custos fixos --- */}
        <Card
          title="Custos fixos"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditando(null)
                setFormAberto(true)
              }}
            >
              <IconPlus size={14} />
              Novo
            </Button>
          }
        >
          {custos.length === 0 ? (
            <EmptyState
              title="Nenhum custo fixo"
              description="Cadastre aluguel, energia, contabilidade — o que se repete todo mes. Depois da para gerar as contas a pagar de uma vez."
              action={
                <Button onClick={() => setFormAberto(true)}>
                  <IconPlus size={16} />
                  Cadastrar custo fixo
                </Button>
              }
            />
          ) : (
            <ul className={styles.custos}>
              {custos.map((c) => (
                <li key={c.id} className={styles.custo}>
                  <span className={styles.custoDia}>dia {c.diaVencimento}</span>

                  <span className={styles.custoPrincipal}>
                    <strong>{c.nome}</strong>
                    <span>
                      {c.planoContasNome} · {c.bancoNome}
                    </span>
                  </span>

                  <span className={styles.custoValor}>{formatMoney(c.valor)}</span>

                  <span className={styles.custoAcoes}>
                    <button
                      type="button"
                      className={styles.custoBotao}
                      onClick={() => {
                        setEditando(c)
                        setFormAberto(true)
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`${styles.custoBotao} ${styles.custoExcluir}`}
                      onClick={() => setExcluindo(c)}
                      aria-label={`Excluir ${c.nome}`}
                    >
                      <IconTrash size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={styles.comandosWrap}>
        <ComandosWhatsApp comandos={COMANDOS_PLANO_CONTAS} />
      </div>

      {formAberto ? (
        <FormCustoFixo
          custo={editando}
          planos={planos.map((p) => p.nome)}
          onSalvo={(salvo) => {
            setCustos((atual) =>
              editando ? atual.map((c) => (c.id === salvo.id ? salvo : c)) : [...atual, salvo],
            )
            setFormAberto(false)
            setEditando(null)
            setToast({
              msg: editando ? 'Custo fixo atualizado.' : 'Custo fixo cadastrado.',
              tone: 'success',
            })
          }}
          onCancelar={() => {
            setFormAberto(false)
            setEditando(null)
          }}
        />
      ) : null}

      {excluindo ? (
        <ConfirmarDialog
          titulo="Excluir custo fixo"
          descricao="O custo deixa de gerar contas a pagar nos proximos meses. Contas ja lancadas continuam como estao."
          tom="perigo"
          rotuloConfirmar="Excluir"
          processando={processando}
          detalhe={
            <div className={styles.estornoDetalhe}>
              <strong>{excluindo.nome}</strong>
              <span>
                {formatMoney(excluindo.valor)} · todo dia {excluindo.diaVencimento}
              </span>
            </div>
          }
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluindo(null)}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </>
  )
}

/* ================================================================== *
 * Formulario de custo fixo
 * ================================================================== */

function FormCustoFixo({
  custo,
  planos,
  onSalvo,
  onCancelar,
}: {
  custo: CustoFixo | null
  planos: string[]
  onSalvo: (custo: CustoFixo) => void
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(custo?.nome ?? '')
  const [dia, setDia] = useState(String(custo?.diaVencimento ?? ''))
  const [valor, setValor] = useState(custo ? String(custo.valor).replace('.', ',') : '')
  const [plano, setPlano] = useState(custo?.planoContasNome ?? '')
  const [banco, setBanco] = useState(custo?.bancoNome ?? '')

  const [listaPlanos, setListaPlanos] = useState(planos)
  const [listaBancos, setListaBancos] = useState(NOMES_BANCOS)

  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(event: React.FormEvent) {
    event.preventDefault()
    setErro(null)
    setSalvando(true)

    /* SUBSTITUIR POR: POST/PUT /financeiro/custos-fixos */
    const r = await salvarCustoFixo({
      id: custo?.id,
      nome,
      diaVencimento: Number(dia),
      valor: paraNumero(valor),
      planoContasNome: plano,
      bancoNome: banco,
    })
    setSalvando(false)

    if (!r.ok) {
      setErro(r.error)
      return
    }

    onSalvo({
      id: r.id,
      nome: nome.trim(),
      diaVencimento: Number(dia),
      valor: paraNumero(valor),
      planoContasId: custo?.planoContasId ?? '',
      planoContasNome: plano,
      bancoId: custo?.bancoId ?? '',
      bancoNome: banco,
    })
  }

  return (
    <div className={styles.dialogRoot}>
      <button
        type="button"
        className={styles.dialogBackdrop}
        onClick={onCancelar}
        aria-label="Fechar"
      />

      <div
        className={`${styles.dialogPainel} ${styles.dialogLargo}`}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.dialogCabecalho}>
          <h2 className={styles.dialogTitulo}>{custo ? 'Editar custo fixo' : 'Novo custo fixo'}</h2>
        </header>

        <form onSubmit={salvar} noValidate className={styles.formCampos}>
          <label className={styles.campo}>
            <span>Nome</span>
            <input
              className={styles.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Aluguel do ponto"
              autoFocus
            />
          </label>

          <div className={styles.formLinha}>
            <label className={styles.campo}>
              <span>Dia do vencimento</span>
              <input
                className={styles.input}
                value={dia}
                onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="5"
                inputMode="numeric"
              />
            </label>

            <label className={styles.campo}>
              <span>Valor</span>
              <input
                className={styles.input}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </label>
          </div>

          <div className={styles.formLinha}>
            <label className={styles.campo}>
              <span>Plano de conta</span>
              <CampoTag
                valor={plano}
                opcoes={listaPlanos}
                onChange={setPlano}
                onCriar={(novo) => setListaPlanos((p) => [...p, novo])}
                ariaLabel="Plano de conta"
              />
            </label>

            <label className={styles.campo}>
              <span>Banco</span>
              <CampoTag
                valor={banco}
                opcoes={listaBancos}
                onChange={setBanco}
                onCriar={(novo) => setListaBancos((b) => [...b, novo])}
                ariaLabel="Banco"
              />
            </label>
          </div>

          {erro ? (
            <p className={styles.baixaErro} role="alert">
              {erro}
            </p>
          ) : null}

          <div className={styles.dialogAcoes}>
            <Button variant="secondary" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner size={15} />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
