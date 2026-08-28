import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { contasPagar, contasReceber, produtos } from '@/lib/mock-data'
import { listarVendas } from '@/lib/vendas-api'
import { nivelEstoque } from '@/lib/produtos-api'
import { describeDueDate, daysUntil, formatMoney } from '@/lib/format'
import Cabecalho from '@/components/Cabecalho'
import Sanfona from '@/components/ui/Sanfona'
import { Etiqueta } from '@/components/ui/Cartao'
import { cores, espaco, fonte, peso, raio } from '@/theme/tokens'

/** Data de referencia do app. */
const HOJE = '2026-08-24'

/**
 * Tela principal.
 *
 * No web isto e um painel de "mesas" lado a lado. No celular vira uma
 * pilha de sanfonas: os numeros do dia ficam sempre a vista no topo, e
 * cada assunto abre so quando interessa.
 */
export default function Inicio() {
  const router = useRouter()

  const dados = useMemo(() => {
    const vendas = listarVendas().filter((v) => v.status === 'concluida')
    const hoje = vendas.filter((v) => v.data.startsWith(HOJE))
    const faturamento = hoje.reduce((a, v) => a + v.total, 0)

    const aPagar = contasPagar.filter((c) => c.status !== 'pago')
    const vencidas = aPagar.filter((c) => daysUntil(c.vencimento) < 0)
    const totalPagar = aPagar.reduce((a, c) => a + (c.valor - c.valorPago), 0)

    const aReceber = contasReceber.filter((c) => c.status !== 'pago')
    const totalReceber = aReceber.reduce((a, c) => a + (c.valor - c.valorRecebido), 0)

    const repor = produtos.filter((p) => nivelEstoque(p) !== 'normal')

    return {
      vendas,
      hoje,
      faturamento,
      aPagar,
      vencidas,
      totalPagar,
      aReceber,
      totalReceber,
      repor,
    }
  }, [])

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Cabecalho titulo="Bom dia, Marina" subtitulo="Segunda-feira, 24 de agosto" />

      <ScrollView contentContainerStyle={estilos.conteudo}>
        {/* Numeros do dia: sempre visiveis, sem precisar abrir nada. */}
        <View style={estilos.indicadores}>
          <Indicador
            rotulo="Vendido hoje"
            valor={formatMoney(dados.faturamento)}
            apoio={`${dados.hoje.length} vendas`}
            destaque
          />
          <Indicador
            rotulo="A receber"
            valor={formatMoney(dados.totalReceber)}
            apoio={`${dados.aReceber.length} titulos`}
          />
          <Indicador
            rotulo="A pagar"
            valor={formatMoney(dados.totalPagar)}
            apoio={
              dados.vencidas.length > 0 ? `${dados.vencidas.length} vencido(s)` : 'nada vencido'
            }
            alerta={dados.vencidas.length > 0}
          />
        </View>

        <Pressable
          style={estilos.atalho}
          onPress={() => router.push('/pdv')}
          accessibilityRole="button"
        >
          <Text style={estilos.atalhoTexto}>Abrir o balcao</Text>
          <Text style={estilos.atalhoApoio}>Bipar produto e fechar venda</Text>
        </Pressable>

        <Sanfona
          titulo="Ultimas vendas"
          resumo={`${dados.vendas.length} no historico`}
          inicialAberta
        >
          {dados.vendas.slice(0, 4).map((v) => (
            <View key={v.id} style={estilos.linha}>
              <Text style={estilos.linhaId}>#{v.numero}</Text>
              <Text style={estilos.linhaTexto} numberOfLines={1}>
                {v.clienteNome}
              </Text>
              <Text style={estilos.linhaValor}>{formatMoney(v.total)}</Text>
            </View>
          ))}
        </Sanfona>

        <Sanfona
          titulo="Contas a pagar"
          resumo={formatMoney(dados.totalPagar)}
          etiqueta={
            dados.vencidas.length > 0 ? (
              <Etiqueta tom="atencao">{dados.vencidas.length} vencido</Etiqueta>
            ) : undefined
          }
        >
          {dados.aPagar.slice(0, 5).map((c) => (
            <View key={c.id} style={estilos.linha}>
              <View style={estilos.linhaInfo}>
                <Text style={estilos.linhaTexto} numberOfLines={1}>
                  {c.fornecedor}
                </Text>
                <Text style={estilos.linhaApoio}>{describeDueDate(c.vencimento)}</Text>
              </View>
              <Text style={estilos.linhaValor}>{formatMoney(c.valor - c.valorPago)}</Text>
            </View>
          ))}
        </Sanfona>

        <Sanfona
          titulo="Precisa repor"
          resumo={`${dados.repor.length} produto(s)`}
          etiqueta={
            dados.repor.length > 0 ? <Etiqueta tom="atencao">estoque baixo</Etiqueta> : undefined
          }
        >
          {dados.repor.map((p) => (
            <View key={p.id} style={estilos.linha}>
              <View style={estilos.linhaInfo}>
                <Text style={estilos.linhaTexto} numberOfLines={1}>
                  {p.descricao}
                </Text>
                <Text style={estilos.linhaApoio}>minimo {p.estoqueMinimo} un</Text>
              </View>
              <Text style={[estilos.linhaValor, estilos.alerta]}>{p.estoque} un</Text>
            </View>
          ))}
        </Sanfona>
      </ScrollView>
    </SafeAreaView>
  )
}

function Indicador({
  rotulo,
  valor,
  apoio,
  destaque = false,
  alerta = false,
}: {
  rotulo: string
  valor: string
  apoio?: string
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <View style={[estilos.indicador, destaque && estilos.indicadorDestaque]}>
      <Text style={estilos.indicadorRotulo}>{rotulo}</Text>
      <Text
        style={[
          estilos.indicadorValor,
          destaque && estilos.indicadorValorDestaque,
          alerta && estilos.alerta,
        ]}
      >
        {valor}
      </Text>
      {apoio ? <Text style={estilos.indicadorApoio}>{apoio}</Text> : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },

  indicadores: { gap: espaco.sm },
  indicador: {
    padding: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    gap: 2,
  },
  indicadorDestaque: { borderColor: cores.acento },
  indicadorRotulo: { fontSize: fonte.micro, color: cores.textoFraco },
  indicadorValor: { fontSize: fonte.titulo, fontWeight: peso.pesado, color: cores.texto },
  indicadorValorDestaque: { color: cores.acento, fontSize: 30 },
  indicadorApoio: { fontSize: fonte.micro, color: cores.textoFraco },
  alerta: { color: cores.atencao },

  atalho: {
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.acento,
    gap: 2,
  },
  atalhoTexto: {
    fontSize: fonte.medio,
    fontWeight: peso.pesado,
    color: cores.textoSobreAcento,
  },
  atalhoApoio: { fontSize: fonte.micro, color: cores.textoSobreAcento, opacity: 0.8 },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  linhaInfo: { flex: 1, gap: 1 },
  linhaId: { fontSize: fonte.micro, fontWeight: peso.forte, color: cores.acento },
  linhaTexto: { flex: 1, fontSize: fonte.pequeno, color: cores.texto },
  linhaApoio: { fontSize: fonte.micro, color: cores.textoFraco },
  linhaValor: { fontSize: fonte.pequeno, fontWeight: peso.forte, color: cores.texto },
})
