'use client'

import { useEffect, useState } from 'react'
import {
  emitirNota,
  situacaoCertificado,
  type EstadoEmissao,
  type NotaEmitida,
  type SituacaoCertificado,
  type TipoNotaFiscal,
} from '@/lib/vendas-api'
import { formatMoney } from '@/lib/format'
import { Card } from '@/components/ui/UI'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Spinner } from '@/components/auth/Fields'
import { IconCheck, IconReceipt, IconShield } from '@/components/Icons'
import styles from './vendas.module.css'

export default function EtapaFiscal({
  vendaId,
  vendaNumero,
  total,
  onConcluir,
}: {
  vendaId: string
  vendaNumero: string
  total: number
  onConcluir: () => void
}) {
  const [certificado, setCertificado] = useState<SituacaoCertificado | null>(null)
  const [estado, setEstado] = useState<EstadoEmissao>('ocioso')
  const [nota, setNota] = useState<NotaEmitida | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  /* SUBSTITUIR POR: GET /empresa/certificado */
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const s = await situacaoCertificado()
      if (!cancelado) setCertificado(s)
    }
    void carregar()
    return () => {
      cancelado = true
    }
  }, [])

  async function emitir(tipo: TipoNotaFiscal) {
    setEstado('processando')
    setErro(null)

    /* SUBSTITUIR POR: POST /vendas/:id/notas */
    const r = await emitirNota(vendaId, tipo, total)

    if (!r.ok) {
      setErro(r.error)
      setEstado('erro')
      return
    }

    setNota(r.nota)
    setEstado('emitida')
  }

  const podeEmitir = certificado === 'valido'

  return (
    <div className={styles.fiscalGrid}>
      {/* ============ Venda fechada ============ */}
      <Card>
        <div className={styles.vendaFechada}>
          <span className={styles.vendaFechadaIcone}>
            <IconCheck size={26} />
          </span>
          <div>
            <strong>Venda #{vendaNumero} fechada</strong>
            <span>{formatMoney(total)} · o valor liquido ja entrou em contas a receber</span>
          </div>
        </div>
      </Card>

      {/* ============ Documentos fiscais ============ */}
      <Card title="Documentos fiscais">
        {certificado === null ? (
          <p className={styles.carregando}>
            <Spinner size={15} />
            Verificando certificado digital...
          </p>
        ) : !podeEmitir ? (
          /* Sem certificado valido nao adianta deixar tentar: o provedor
             recusaria e o erro chegaria sem explicacao util. */
          <div className={styles.semCertificado}>
            <span className={styles.semCertificadoIcone}>
              <IconShield size={22} />
            </span>

            <div className={styles.semCertificadoTexto}>
              <strong>
                {certificado === 'expirado'
                  ? 'Certificado digital expirado'
                  : 'Nenhum certificado digital cadastrado'}
              </strong>
              <p>
                A emissao de NFC-e e NFS-e depende de um certificado A1 valido. A venda ja esta
                registrada — assim que o certificado for enviado, da para emitir a nota por esta
                mesma tela.
              </p>
            </div>

            <div className={styles.semCertificadoAcoes}>
              <ButtonLink href="/app/empresa">
                {certificado === 'expirado' ? 'Trocar certificado' : 'Cadastrar certificado'}
              </ButtonLink>
              <Button variant="secondary" onClick={onConcluir}>
                Concluir sem nota
              </Button>
            </div>
          </div>
        ) : estado === 'emitida' && nota ? (
          /* --- Emitida --- */
          <div className={styles.notaEmitida}>
            <span className={styles.notaIcone}>
              <IconCheck size={22} />
            </span>
            <strong className={styles.notaTitulo}>
              {nota.tipo === 'nfce' ? 'NFC-e' : 'NFS-e'} {nota.numero} emitida
            </strong>
            <p className={styles.notaChave}>{nota.chave}</p>

            <h3 className={styles.impostosTitulo}>Impostos apurados</h3>
            <ul className={styles.impostos}>
              {nota.impostos.map((i) => (
                <li key={i.nome}>
                  <span>{i.nome}</span>
                  <strong>{formatMoney(i.valor)}</strong>
                </li>
              ))}
              <li className={styles.impostoTotal}>
                <span>Total</span>
                <strong>{formatMoney(nota.impostos.reduce((a, i) => a + i.valor, 0))}</strong>
              </li>
            </ul>
            <p className={styles.impostosNota}>Guardados na venda para consulta e relatorio.</p>

            <div className={styles.notaAcoes}>
              <Button variant="secondary">Baixar PDF</Button>
              <Button onClick={onConcluir}>Concluir venda</Button>
            </div>
          </div>
        ) : estado === 'processando' ? (
          /* --- Processando --- */
          <div className={styles.emitindo}>
            <Spinner size={26} />
            <strong>Emitindo a nota...</strong>
            <span>Isso costuma levar alguns segundos.</span>
          </div>
        ) : (
          /* --- Escolha do tipo --- */
          <>
            {estado === 'erro' ? (
              <p className={styles.erro} role="alert">
                {erro ?? 'Nao foi possivel emitir a nota.'}
              </p>
            ) : null}

            <div className={styles.tiposNota}>
              <button type="button" className={styles.tipoNota} onClick={() => emitir('nfce')}>
                <span className={styles.tipoNotaIcone}>
                  <IconReceipt size={20} />
                </span>
                <strong>NFC-e</strong>
                <span>Para os produtos vendidos</span>
              </button>

              <button type="button" className={styles.tipoNota} onClick={() => emitir('nfse')}>
                <span className={styles.tipoNotaIcone}>
                  <IconReceipt size={20} />
                </span>
                <strong>NFS-e</strong>
                <span>Para servicos prestados</span>
              </button>
            </div>

            <Button variant="ghost" block onClick={onConcluir}>
              Concluir sem emitir nota
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
