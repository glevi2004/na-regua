import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { contasPagar, contasReceber } from '@/lib/mock-data'
import {
  baixarTitulo,
  estornarTitulo,
  situacaoDoTitulo,
  ROTULO_SITUACAO,
} from '@/lib/financeiro-api'
import type { StatusTitulo } from '@/lib/types'
import { daysUntil, describeDueDate, formatDate, formatMoney } from '@/lib/format'
import Cabecalho from '@/components/Cabecalho'
import Sanfona from '@/components/ui/Sanfona'
import Botao from '@/components/ui/Botao'
import { Etiqueta, Vazio } from '@/components/ui/Cartao'
import { cores, espaco, fonte, peso, raio } from '@/theme/tokens'

/** Forma comum entre conta a pagar e a receber. */
type Linha = {
  id: string
  contraparte: string
  descricao: string
  vencimento: string
  valor: number
  baixado: number
  status: StatusTitulo
}

/**
 * Contas a pagar / a receber.
 *
 * As duas telas sao a mesma estrutura — muda a contraparte e o verbo —
 * entao compartilham este componente, como no web.
 *
 * Agrupado em sanfonas por situacao: no celular, uma lista corrida de
 * titulos mistura o que vence hoje com o que ja foi pago. Vencidos ficam
 * abertos por padrao, que e o que exige acao.
 */
export default function ContasView({ tipo }: { tipo: 'pagar' | 'receber' }) {
  const pagar = tipo === 'pagar'

  const [linhas, setLinhas] = useState<Linha[]>(() =>
    pagar
      ? contasPagar.map((c) => ({
          id: c.id,
          contraparte: c.fornecedor,
          descricao: c.descricao,
          vencimento: c.vencimento,
          valor: c.valor,
          baixado: c.valorPago,
          status: c.status,
        }))
      : contasReceber.map((c) => ({
          id: c.id,
          contraparte: c.clienteNome,
          descricao: c.referente,
          vencimento: c.vencimento,
          valor: c.valor,
          baixado: c.valorRecebido,
          status: c.status,
        })),
  )

  const grupos = useMemo(() => {
    const abertos = linhas.filter((l) => l.status !== 'pago')
    return {
      vencidos: abertos.filter((l) => daysUntil(l.vencimento) < 0),
      aVencer: abertos.filter((l) => daysUntil(l.vencimento) >= 0),
      quitados: linhas.filter((l) => l.status === 'pago'),
    }
  }, [linhas])

  const soma = (lista: Linha[]) => lista.reduce((a, l) => a + (l.valor - l.baixado), 0)

  function pedirBaixa(linha: Linha) {
    const saldo = linha.valor - linha.baixado

    /* Baixa mexe em dinheiro: confirma antes, com o valor a vista.
       A baixa parcial fica no web — no celular, digitar valor com fila
       atras e mais risco que ajuda. */
    Alert.alert(
      pagar ? 'Baixar pagamento' : 'Baixar recebimento',
      `${linha.contraparte}\n${linha.descricao}\n\n${formatMoney(saldo)}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            /* SUBSTITUIR POR: POST /financeiro/titulos/:id/baixas */
            const r = await baixarTitulo(linha.id, saldo, saldo)
            if (!r.ok) {
              Alert.alert('Nao deu certo', r.error)
              return
            }
            setLinhas((atual) =>
              atual.map((l) =>
                l.id === linha.id ? { ...l, baixado: l.valor, status: r.status } : l,
              ),
            )
          },
        },
      ],
    )
  }

  function pedirEstorno(linha: Linha) {
    Alert.alert(
      'Estornar baixa',
      `A baixa sera desfeita e o titulo volta para em aberto.\n\n${linha.contraparte}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Estornar',
          style: 'destructive',
          onPress: async () => {
            /* SUBSTITUIR POR: DELETE /financeiro/titulos/:id/baixas/:baixaId */
            const r = await estornarTitulo(linha.id)
            if (!r.ok) {
              Alert.alert('Nao deu certo', r.error)
              return
            }
            setLinhas((atual) =>
              atual.map((l) =>
                l.id === linha.id
                  ? {
                      ...l,
                      baixado: 0,
                      status: daysUntil(l.vencimento) < 0 ? 'vencido' : 'aberto',
                    }
                  : l,
              ),
            )
          },
        },
      ],
    )
  }

  const totalAberto = soma([...grupos.vencidos, ...grupos.aVencer])

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Cabecalho
        titulo={pagar ? 'Contas a pagar' : 'Contas a receber'}
        subtitulo={`${formatMoney(totalAberto)} em aberto`}
      />

      <ScrollView contentContainerStyle={estilos.conteudo}>
        {linhas.length === 0 ? (
          <Vazio
            titulo={pagar ? 'Nenhuma conta a pagar' : 'Nenhuma conta a receber'}
            descricao="Lancamentos aparecem aqui conforme forem criados."
          />
        ) : (
          <>
            <Sanfona
              titulo="Vencidos"
              resumo={
                grupos.vencidos.length
                  ? `${grupos.vencidos.length} · ${formatMoney(soma(grupos.vencidos))}`
                  : 'nada em atraso'
              }
              etiqueta={
                grupos.vencidos.length > 0 ? (
                  <Etiqueta tom="atencao">{grupos.vencidos.length}</Etiqueta>
                ) : undefined
              }
              /* Abre sozinho: e o grupo que pede acao. */
              inicialAberta={grupos.vencidos.length > 0}
            >
              {grupos.vencidos.length === 0 ? (
                <Text style={estilos.vazioTexto}>Nada em atraso.</Text>
              ) : (
                grupos.vencidos.map((l) => (
                  <LinhaTitulo
                    key={l.id}
                    linha={l}
                    onBaixar={() => pedirBaixa(l)}
                    onEstornar={() => pedirEstorno(l)}
                  />
                ))
              )}
            </Sanfona>

            <Sanfona
              titulo="A vencer"
              resumo={`${grupos.aVencer.length} · ${formatMoney(soma(grupos.aVencer))}`}
              inicialAberta={grupos.vencidos.length === 0}
            >
              {grupos.aVencer.length === 0 ? (
                <Text style={estilos.vazioTexto}>Nada a vencer.</Text>
              ) : (
                grupos.aVencer.map((l) => (
                  <LinhaTitulo
                    key={l.id}
                    linha={l}
                    onBaixar={() => pedirBaixa(l)}
                    onEstornar={() => pedirEstorno(l)}
                  />
                ))
              )}
            </Sanfona>

            <Sanfona
              titulo={pagar ? 'Pagos' : 'Recebidos'}
              resumo={`${grupos.quitados.length} titulo(s)`}
            >
              {grupos.quitados.length === 0 ? (
                <Text style={estilos.vazioTexto}>Nada baixado ainda.</Text>
              ) : (
                grupos.quitados.map((l) => (
                  <LinhaTitulo
                    key={l.id}
                    linha={l}
                    onBaixar={() => pedirBaixa(l)}
                    onEstornar={() => pedirEstorno(l)}
                  />
                ))
              )}
            </Sanfona>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function LinhaTitulo({
  linha,
  onBaixar,
  onEstornar,
}: {
  linha: Linha
  onBaixar: () => void
  onEstornar: () => void
}) {
  const saldo = linha.valor - linha.baixado
  const quitado = linha.status === 'pago'
  const situacao = situacaoDoTitulo(linha.status, linha.vencimento, daysUntil(linha.vencimento))

  const tom =
    situacao === 'vencido'
      ? 'erro'
      : situacao === 'aVencer'
        ? 'atencao'
        : situacao === 'quitado'
          ? 'sucesso'
          : 'neutro'

  return (
    <View style={estilos.titulo}>
      <View style={estilos.tituloTopo}>
        <View style={estilos.tituloInfo}>
          <Text style={estilos.tituloNome} numberOfLines={1}>
            {linha.contraparte}
          </Text>
          <Text style={estilos.tituloApoio} numberOfLines={1}>
            {linha.descricao}
          </Text>
        </View>
        <Text style={estilos.tituloValor}>{formatMoney(quitado ? linha.valor : saldo)}</Text>
      </View>

      <View style={estilos.tituloRodape}>
        <View style={estilos.tituloSituacao}>
          <Etiqueta tom={tom}>{ROTULO_SITUACAO[situacao]}</Etiqueta>
          <Text style={estilos.tituloData}>
            {quitado ? formatDate(linha.vencimento) : describeDueDate(linha.vencimento)}
          </Text>
        </View>

        <Pressable
          onPress={quitado || linha.baixado > 0 ? onEstornar : onBaixar}
          style={[estilos.acao, quitado && estilos.acaoSecundaria]}
          accessibilityRole="button"
        >
          <Text style={[estilos.acaoTexto, quitado && estilos.acaoTextoSecundario]}>
            {quitado || linha.baixado > 0 ? 'Estornar' : 'Baixar'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  vazioTexto: { fontSize: fonte.pequeno, color: cores.textoFraco },

  titulo: {
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  tituloTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  tituloInfo: { flex: 1, gap: 1 },
  tituloNome: { fontSize: fonte.pequeno, fontWeight: peso.forte, color: cores.texto },
  tituloApoio: { fontSize: fonte.micro, color: cores.textoFraco },
  tituloValor: { fontSize: fonte.corpo, fontWeight: peso.pesado, color: cores.texto },

  tituloRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  tituloSituacao: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  tituloData: { fontSize: fonte.micro, color: cores.textoFraco },

  acao: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderRadius: raio.pill,
    backgroundColor: cores.acento,
    minHeight: 36,
    justifyContent: 'center',
  },
  acaoSecundaria: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: cores.borda,
  },
  acaoTexto: {
    fontSize: fonte.micro,
    fontWeight: peso.forte,
    color: cores.textoSobreAcento,
  },
  acaoTextoSecundario: { color: cores.textoFraco },
})
