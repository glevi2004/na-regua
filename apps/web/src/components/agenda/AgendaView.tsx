'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  conectarGoogle,
  criarEvento,
  DIAS_SEMANA,
  desconectarGoogle,
  excluirEvento,
  HOJE,
  LEMBRETES,
  listarEventos,
  montarMes,
  NOMES_MESES,
  statusGoogle,
  type Evento,
  type StatusGoogle,
} from '@/lib/agenda-api'
import { formatDate } from '@/lib/format'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/UI'
import { Button } from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { Spinner } from '@/components/auth/Fields'
import ConfirmarDialog from '@/components/app/ConfirmarDialog'
import { IconBell, IconCalendar, IconClose, IconPlus } from '@/components/Icons'
import styles from './agenda.module.css'

/** Mes exibido inicialmente — o da data de referencia do app. */
const [ANO_INICIAL, MES_INICIAL] = [Number(HOJE.slice(0, 4)), Number(HOJE.slice(5, 7)) - 1]

export default function AgendaView() {
  const [eventos, setEventos] = useState<Evento[]>(() => listarEventos())
  const [ano, setAno] = useState(ANO_INICIAL)
  const [mes, setMes] = useState(MES_INICIAL)
  const [diaSelecionado, setDiaSelecionado] = useState(HOJE)

  const [google, setGoogle] = useState<StatusGoogle | null>(null)
  const [mexendoGoogle, setMexendoGoogle] = useState(false)

  const [criando, setCriando] = useState(false)
  const [excluindo, setExcluindo] = useState<Evento | null>(null)
  const [processando, setProcessando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  /* SUBSTITUIR POR: GET /agenda/google/status */
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const s = await statusGoogle()
      if (!cancelado) setGoogle(s)
    }
    void carregar()
    return () => {
      cancelado = true
    }
  }, [])

  const grade = useMemo(() => montarMes(ano, mes), [ano, mes])

  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>()
    for (const e of eventos) {
      const lista = mapa.get(e.data) ?? []
      lista.push(e)
      mapa.set(e.data, lista)
    }
    /* Ordena por horario dentro de cada dia. */
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    }
    return mapa
  }, [eventos])

  const proximos = useMemo(
    () =>
      eventos
        .filter((e) => e.data >= HOJE)
        .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio))
        .slice(0, 5),
    [eventos],
  )

  const doDia = porDia.get(diaSelecionado) ?? []
  const eventosHoje = porDia.get(HOJE) ?? []

  function mudarMes(delta: number) {
    const d = new Date(Date.UTC(ano, mes + delta, 1))
    setAno(d.getUTCFullYear())
    setMes(d.getUTCMonth())
  }

  /* ---------------------------------------------------------------- *
   * Google
   * ---------------------------------------------------------------- */

  async function conectar() {
    setMexendoGoogle(true)
    /* SUBSTITUIR POR: window.location.href = "/agenda/google/authorize" */
    const r = await conectarGoogle()
    setMexendoGoogle(false)
    setGoogle(r.status)
    setToast({ msg: 'Google Agenda conectado.', tone: 'success' })
  }

  async function desconectar() {
    setMexendoGoogle(true)
    /* SUBSTITUIR POR: DELETE /agenda/google */
    await desconectarGoogle()
    setMexendoGoogle(false)
    setGoogle({ conectado: false, conta: null, ultimaSincronizacao: null })
    /* Eventos vindos do Google saem da lista ao desconectar. */
    setEventos((atual) => atual.filter((e) => e.origem !== 'google'))
    setToast({ msg: 'Google Agenda desconectado.', tone: 'success' })
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    setProcessando(true)
    await excluirEvento(excluindo.id)
    setProcessando(false)
    setEventos((atual) => atual.filter((e) => e.id !== excluindo.id))
    setExcluindo(null)
    setToast({ msg: 'Compromisso excluido.', tone: 'success' })
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Compromissos, entregas e vencimentos"
        actions={
          <Button onClick={() => setCriando(true)}>
            <IconPlus size={17} />
            Novo compromisso
          </Button>
        }
      />

      {/* --- Conexao com o Google --- */}
      <div className={styles.googleBox}>
        {google === null ? (
          <p className={styles.googleCarregando}>
            <Spinner size={15} />
            Verificando conexao...
          </p>
        ) : google.conectado ? (
          <>
            <span className={styles.googleIcone} aria-hidden="true">
              <IconCalendar size={18} />
            </span>
            <div className={styles.googleTexto}>
              <strong>Google Agenda conectado</strong>
              <span>
                {google.conta}
                {google.ultimaSincronizacao
                  ? ` · sincronizado as ${google.ultimaSincronizacao.slice(11, 16)}`
                  : ''}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={desconectar} disabled={mexendoGoogle}>
              {mexendoGoogle ? <Spinner size={14} /> : null}
              Desconectar
            </Button>
          </>
        ) : (
          <>
            <span className={`${styles.googleIcone} ${styles.googleOff}`} aria-hidden="true">
              <IconCalendar size={18} />
            </span>
            <div className={styles.googleTexto}>
              <strong>Google Agenda desconectado</strong>
              <span>
                Conecte para que os compromissos apareçam nos dois lugares, sem digitar duas vezes.
              </span>
            </div>
            <Button size="sm" onClick={conectar} disabled={mexendoGoogle}>
              {mexendoGoogle ? (
                <>
                  <Spinner size={14} />
                  Conectando...
                </>
              ) : (
                'Conectar'
              )}
            </Button>
          </>
        )}
      </div>

      <div className={styles.grid}>
        {/* --- Calendario --- */}
        <Card className={styles.calendarioCard}>
          <div className={styles.calendarioTopo}>
            <button
              type="button"
              className={styles.navMes}
              onClick={() => mudarMes(-1)}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <h2 className={styles.mesTitulo}>
              {NOMES_MESES[mes]} de {ano}
            </h2>
            <button
              type="button"
              className={styles.navMes}
              onClick={() => mudarMes(1)}
              aria-label="Proximo mes"
            >
              ›
            </button>
          </div>

          <div className={styles.semana} aria-hidden="true">
            {DIAS_SEMANA.map((d) => (
              <span key={d} className={styles.diaSemana}>
                {d}
              </span>
            ))}
          </div>

          <div className={styles.mes}>
            {grade.map((d) => {
              const doDiaLista = porDia.get(d.data) ?? []
              const selecionado = d.data === diaSelecionado

              return (
                <button
                  key={d.data}
                  type="button"
                  className={`${styles.dia} ${d.doMes ? '' : styles.diaForaDoMes} ${
                    d.hoje ? styles.diaHoje : ''
                  } ${selecionado ? styles.diaSelecionado : ''}`}
                  onClick={() => setDiaSelecionado(d.data)}
                  aria-label={`${d.dia} — ${doDiaLista.length} compromisso(s)`}
                  aria-pressed={selecionado}
                >
                  <span className={styles.diaNumero}>{d.dia}</span>
                  {doDiaLista.length > 0 ? (
                    <span className={styles.diaMarcas} aria-hidden="true">
                      {doDiaLista.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`${styles.diaMarca} ${
                            e.origem === 'google' ? styles.marcaGoogle : ''
                          }`}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </Card>

        {/* --- Dia selecionado --- */}
        <Card title={`Compromissos de ${formatDate(diaSelecionado)}`}>
          {doDia.length === 0 ? (
            <EmptyState
              title="Nada marcado"
              description="Nenhum compromisso neste dia."
              action={
                <Button variant="secondary" onClick={() => setCriando(true)}>
                  <IconPlus size={16} />
                  Marcar algo
                </Button>
              }
            />
          ) : (
            <ul className={styles.eventos}>
              {doDia.map((e) => (
                <li key={e.id} className={styles.evento}>
                  <span className={styles.eventoHora}>
                    {e.horaInicio}
                    <span>{e.horaFim}</span>
                  </span>

                  <span className={styles.eventoPrincipal}>
                    <strong>{e.titulo}</strong>
                    {e.descricao ? <span>{e.descricao}</span> : null}
                    {e.local ? <span className={styles.eventoLocal}>{e.local}</span> : null}
                  </span>

                  <span className={styles.eventoTags}>
                    {/* Distingue o que veio do Google do que nasceu aqui */}
                    {e.origem === 'google' ? (
                      <Badge tone="info">Google</Badge>
                    ) : (
                      <Badge>No app</Badge>
                    )}
                    {e.lembreteMinutos !== null ? (
                      <span className={styles.eventoLembrete}>
                        <IconBell size={12} />
                        {e.lembreteMinutos >= 1440 ? '1 dia' : `${e.lembreteMinutos} min`}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={styles.eventoExcluir}
                      onClick={() => setExcluindo(e)}
                      aria-label={`Excluir ${e.titulo}`}
                    >
                      <IconClose size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* --- Proximos --- */}
        <Card title="Proximos compromissos" className={styles.proximosCard}>
          {eventosHoje.length > 0 ? (
            <p className={styles.destaqueHoje}>
              <strong>{eventosHoje.length}</strong> compromisso(s) hoje
            </p>
          ) : null}

          {proximos.length === 0 ? (
            <EmptyState title="Agenda livre" description="Nada marcado daqui pra frente." />
          ) : (
            <ul className={styles.proximos}>
              {proximos.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={styles.proximo}
                    onClick={() => {
                      setDiaSelecionado(e.data)
                      const [a, m] = [Number(e.data.slice(0, 4)), Number(e.data.slice(5, 7)) - 1]
                      setAno(a)
                      setMes(m)
                    }}
                  >
                    <span className={styles.proximoData}>
                      <strong>{e.data.slice(8, 10)}</strong>
                      <span>{NOMES_MESES[Number(e.data.slice(5, 7)) - 1].slice(0, 3)}</span>
                    </span>
                    <span className={styles.proximoTexto}>
                      <strong>{e.titulo}</strong>
                      <span>
                        {e.data === HOJE ? 'hoje' : formatDate(e.data)} · {e.horaInicio}
                      </span>
                    </span>
                    {e.origem === 'google' ? (
                      <span className={styles.proximoGoogle} title="Do Google Agenda">
                        G
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {criando ? (
        <FormCompromisso
          dataInicial={diaSelecionado}
          onCriado={(novo) => {
            setEventos((atual) => [...atual, novo])
            setCriando(false)
            setToast({
              msg: google?.conectado
                ? 'Compromisso criado e enviado ao Google Agenda.'
                : 'Compromisso criado.',
              tone: 'success',
            })
          }}
          onCancelar={() => setCriando(false)}
        />
      ) : null}

      {excluindo ? (
        <ConfirmarDialog
          titulo="Excluir compromisso"
          descricao={
            excluindo.origem === 'google'
              ? 'O compromisso sera removido tambem do Google Agenda.'
              : 'O compromisso sera removido da agenda.'
          }
          tom="perigo"
          rotuloConfirmar="Excluir"
          processando={processando}
          detalhe={
            <div className={styles.excluirDetalhe}>
              <strong>{excluindo.titulo}</strong>
              <span>
                {formatDate(excluindo.data)} · {excluindo.horaInicio}
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
 * Formulario de compromisso
 * ================================================================== */

function FormCompromisso({
  dataInicial,
  onCriado,
  onCancelar,
}: {
  dataInicial: string
  onCriado: (evento: Evento) => void
  onCancelar: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(dataInicial)
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [local, setLocal] = useState('')
  const [lembrete, setLembrete] = useState<number | null>(30)

  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(event: React.FormEvent) {
    event.preventDefault()
    setErro(null)
    setSalvando(true)

    /* SUBSTITUIR POR: POST /agenda/eventos */
    const r = await criarEvento({
      titulo,
      descricao,
      data,
      horaInicio,
      horaFim,
      local,
      lembreteMinutos: lembrete,
    })
    setSalvando(false)

    if (!r.ok) {
      setErro(r.error)
      return
    }

    onCriado({
      id: r.id,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data,
      horaInicio,
      horaFim,
      local: local.trim(),
      origem: 'app',
      lembreteMinutos: lembrete,
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
        className={styles.dialogPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-compromisso"
      >
        <h2 id="novo-compromisso" className={styles.dialogTitulo}>
          Novo compromisso
        </h2>

        <form onSubmit={salvar} noValidate className={styles.formCampos}>
          <label className={styles.campo}>
            <span>Titulo</span>
            <input
              className={styles.input}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Entrega, reuniao, cobranca..."
              autoFocus
            />
          </label>

          <label className={styles.campo}>
            <span>Data</span>
            <input
              type="date"
              className={styles.input}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </label>

          <div className={styles.formLinha}>
            <label className={styles.campo}>
              <span>Inicio</span>
              <input
                type="time"
                className={styles.input}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </label>

            <label className={styles.campo}>
              <span>Fim</span>
              <input
                type="time"
                className={styles.input}
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </label>
          </div>

          <label className={styles.campo}>
            <span>Local ou link</span>
            <input
              className={styles.input}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Endereco ou link da reuniao"
            />
          </label>

          <label className={styles.campo}>
            <span>Lembrete no WhatsApp</span>
            <select
              className={styles.input}
              value={lembrete === null ? '' : String(lembrete)}
              onChange={(e) => setLembrete(e.target.value ? Number(e.target.value) : null)}
            >
              {LEMBRETES.map((l) => (
                <option key={l.rotulo} value={l.valor === null ? '' : String(l.valor)}>
                  {l.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Descricao</span>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </label>

          {erro ? (
            <p className={styles.erro} role="alert">
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
                'Criar compromisso'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
