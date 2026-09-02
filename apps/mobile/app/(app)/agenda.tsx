import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Cabecalho from '@/components/Cabecalho'
import { compromissos } from '@/lib/mock-data'
import { formatDate } from '@/lib/format'
import type { Compromisso } from '@/lib/types'
import { Etiqueta, Vazio } from '@/components/ui/Cartao'
import { cores, espaco, fonte, peso, raio } from '@/theme/tokens'

/** Data de referencia do app (mesma dos mocks). */
const HOJE = '2026-08-24'

const ROTULO_TIPO: Record<Compromisso['tipo'], string> = {
  cobranca: 'Cobranca',
  entrega: 'Entrega',
  reuniao: 'Reuniao',
  pagamento: 'Pagamento',
}

/**
 * Agenda do dia.
 *
 * Versao enxuta: no celular o que importa e "o que tenho para hoje e
 * amanha". Calendario mensal e criacao de compromisso ficam no web.
 */
export default function Agenda() {
  const [concluidos, setConcluidos] = useState<Set<string>>(
    () => new Set(compromissos.filter((c) => c.concluido).map((c) => c.id)),
  )

  const { hoje, proximos } = useMemo(() => {
    const ordenados = [...compromissos].sort((a, b) =>
      (a.data + a.hora).localeCompare(b.data + b.hora),
    )
    return {
      hoje: ordenados.filter((c) => c.data === HOJE),
      proximos: ordenados.filter((c) => c.data > HOJE),
    }
  }, [])

  function alternar(id: string) {
    setConcluidos((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        novo.add(id)
      }
      /* SUBSTITUIR POR: PATCH /agenda/eventos/:id { concluido } */
      return novo
    })
  }

  const pendentesHoje = hoje.filter((c) => !concluidos.has(c.id)).length

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Cabecalho
        titulo="Agenda"
        subtitulo={
          pendentesHoje === 0 ? 'Nada pendente para hoje' : `${pendentesHoje} pendente(s) hoje`
        }
      />

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Secao titulo="Hoje">
          {hoje.length === 0 ? (
            <Vazio titulo="Dia livre" descricao="Nada marcado para hoje." />
          ) : (
            hoje.map((c) => (
              <LinhaCompromisso
                key={c.id}
                item={c}
                concluido={concluidos.has(c.id)}
                onAlternar={() => alternar(c.id)}
              />
            ))
          )}
        </Secao>

        {proximos.length > 0 ? (
          <Secao titulo="Proximos dias">
            {proximos.map((c) => (
              <LinhaCompromisso
                key={c.id}
                item={c}
                concluido={concluidos.has(c.id)}
                onAlternar={() => alternar(c.id)}
                mostrarData
              />
            ))}
          </Secao>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.secaoTitulo}>{titulo}</Text>
      <View style={estilos.secaoItens}>{children}</View>
    </View>
  )
}

function LinhaCompromisso({
  item,
  concluido,
  onAlternar,
  mostrarData = false,
}: {
  item: Compromisso
  concluido: boolean
  onAlternar: () => void
  mostrarData?: boolean
}) {
  return (
    <Pressable
      onPress={onAlternar}
      style={estilos.compromisso}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: concluido }}
      accessibilityLabel={item.titulo}
    >
      {/* Marcar como feito com um toque: no balcao ninguem abre detalhe. */}
      <View style={[estilos.marcador, concluido && estilos.marcadorFeito]}>
        {concluido ? <Text style={estilos.marcadorCheck}>✓</Text> : null}
      </View>

      <View style={estilos.compromissoInfo}>
        <Text
          style={[estilos.compromissoTitulo, concluido && estilos.textoFeito]}
          numberOfLines={2}
        >
          {item.titulo}
        </Text>
        <Text style={estilos.compromissoApoio}>
          {mostrarData ? `${formatDate(item.data)} · ` : ''}
          {item.hora}
          {item.clienteNome ? ` · ${item.clienteNome}` : ''}
        </Text>
      </View>

      <Etiqueta tom={item.tipo === 'cobranca' ? 'atencao' : 'neutro'}>
        {ROTULO_TIPO[item.tipo]}
      </Etiqueta>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },

  cabecalho: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, gap: 2 },
  titulo: { fontSize: fonte.display, fontWeight: peso.pesado, color: cores.texto },
  subtitulo: { fontSize: fonte.pequeno, color: cores.textoFraco },

  conteudo: { padding: espaco.lg, gap: espaco.xl },
  secao: { gap: espaco.md },
  secaoTitulo: {
    fontSize: fonte.micro,
    fontWeight: peso.forte,
    color: cores.textoFraco,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secaoItens: { gap: espaco.sm },

  compromisso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  marcador: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorFeito: { backgroundColor: cores.acento, borderColor: cores.acento },
  marcadorCheck: {
    fontSize: fonte.pequeno,
    fontWeight: peso.pesado,
    color: cores.textoSobreAcento,
  },

  compromissoInfo: { flex: 1, gap: 2 },
  compromissoTitulo: {
    fontSize: fonte.corpo,
    fontWeight: peso.forte,
    color: cores.texto,
  },
  textoFeito: {
    textDecorationLine: 'line-through',
    color: cores.textoFraco,
  },
  compromissoApoio: { fontSize: fonte.micro, color: cores.textoFraco },
})
