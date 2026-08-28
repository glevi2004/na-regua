import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Cabecalho from '@/components/Cabecalho'
import Sanfona from '@/components/ui/Sanfona'
import Campo from '@/components/ui/Campo'
import Botao from '@/components/ui/Botao'
import { Etiqueta, Vazio } from '@/components/ui/Cartao'
import { formatDate } from '@/lib/format'
import { cores, espaco, fonte, peso, raio } from '@/theme/tokens'

type Status = 'aberto' | 'andamento' | 'respondido' | 'encerrado'

type Chamado = {
  id: string
  assunto: string
  categoria: string
  status: Status
  atualizado: string
  mensagens: { de: 'usuario' | 'suporte'; texto: string; data: string }[]
}

const ROTULO_STATUS: Record<Status, string> = {
  aberto: 'Aberto',
  andamento: 'Em andamento',
  respondido: 'Respondido',
  encerrado: 'Encerrado',
}

const CATEGORIAS = ['Financeiro', 'Cadastro', 'Vendas', 'Tecnico', 'Outro']

/** SUBSTITUIR POR: GET /suporte/chamados */
const CHAMADOS_INICIAIS: Chamado[] = [
  {
    id: 'ch-1',
    assunto: 'Nota fiscal nao emitiu',
    categoria: 'Vendas',
    status: 'respondido',
    atualizado: '2026-08-23',
    mensagens: [
      {
        de: 'usuario',
        texto: 'Tentei emitir a NFC-e da venda 1839 e deu erro de certificado.',
        data: '2026-08-22',
      },
      {
        de: 'suporte',
        texto:
          'O certificado da empresa venceu em 20/08. Envie o novo em Empresa que a emissao volta a funcionar.',
        data: '2026-08-23',
      },
    ],
  },
  {
    id: 'ch-2',
    assunto: 'Importacao de planilha parou na metade',
    categoria: 'Cadastro',
    status: 'andamento',
    atualizado: '2026-08-24',
    mensagens: [
      {
        de: 'usuario',
        texto: 'Importei 300 clientes e so entraram 180.',
        data: '2026-08-24',
      },
    ],
  },
]

/**
 * Suporte.
 *
 * Abertura de chamado e acompanhamento. Cada chamado e uma sanfona com a
 * conversa dentro — no celular, abrir tela de detalhe para ler duas
 * mensagens e um toque a mais sem ganho.
 */
export default function Suporte() {
  const [chamados, setChamados] = useState<Chamado[]>(CHAMADOS_INICIAIS)
  const [assunto, setAssunto] = useState('')
  const [categoria, setCategoria] = useState('Tecnico')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)

  const abertos = chamados.filter((c) => c.status !== 'encerrado').length

  async function abrirChamado() {
    if (!assunto.trim() || !descricao.trim()) {
      Alert.alert('Faltam dados', 'Informe o assunto e descreva o problema.')
      return
    }

    setEnviando(true)
    /* SUBSTITUIR POR: POST /suporte/chamados — o chamado precisa ficar
       no banco para o time responder pelo painel administrativo. */
    await new Promise((r) => setTimeout(r, 800))
    setEnviando(false)

    setChamados((atual) => [
      {
        id: `ch-${Date.now()}`,
        assunto: assunto.trim(),
        categoria,
        status: 'aberto',
        atualizado: '2026-08-24',
        mensagens: [{ de: 'usuario', texto: descricao.trim(), data: '2026-08-24' }],
      },
      ...atual,
    ])

    setAssunto('')
    setDescricao('')
    Alert.alert('Chamado aberto', 'O time responde por aqui e por e-mail.')
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Cabecalho
        titulo="Suporte"
        subtitulo={abertos > 0 ? `${abertos} em aberto` : 'nenhum em aberto'}
      />

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Sanfona titulo="Abrir chamado" resumo="descreva o problema">
          <Campo
            rotulo="Assunto"
            valor={assunto}
            onChange={setAssunto}
            placeholder="Resumo em uma linha"
          />

          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.categorias}>
            {CATEGORIAS.map((c) => (
              <Botao
                key={c}
                variante={categoria === c ? 'primario' : 'secundario'}
                onPress={() => setCategoria(c)}
              >
                {c}
              </Botao>
            ))}
          </View>

          <Campo
            rotulo="O que aconteceu"
            valor={descricao}
            onChange={setDescricao}
            placeholder="Conte o que voce fez e o que apareceu"
          />

          <Botao onPress={abrirChamado} carregando={enviando} largura>
            {enviando ? 'Enviando...' : 'Abrir chamado'}
          </Botao>
        </Sanfona>

        {chamados.length === 0 ? (
          <Vazio
            titulo="Nenhum chamado"
            descricao="Quando precisar de ajuda, abra um chamado acima."
          />
        ) : (
          chamados.map((c) => (
            <Sanfona
              key={c.id}
              titulo={c.assunto}
              resumo={`${c.categoria} · ${formatDate(c.atualizado)}`}
              etiqueta={
                <Etiqueta
                  tom={
                    c.status === 'respondido'
                      ? 'sucesso'
                      : c.status === 'encerrado'
                        ? 'neutro'
                        : 'atencao'
                  }
                >
                  {ROTULO_STATUS[c.status]}
                </Etiqueta>
              }
              inicialAberta={c.status === 'respondido'}
            >
              {c.mensagens.map((m, i) => (
                <View
                  key={i}
                  style={[estilos.mensagem, m.de === 'suporte' && estilos.mensagemSuporte]}
                >
                  <Text style={estilos.mensagemDe}>
                    {m.de === 'usuario' ? 'Voce' : 'Suporte'} · {formatDate(m.data)}
                  </Text>
                  <Text style={estilos.mensagemTexto}>{m.texto}</Text>
                </View>
              ))}
            </Sanfona>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },

  rotulo: { fontSize: fonte.pequeno, fontWeight: peso.medio, color: cores.textoFraco },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },

  mensagem: {
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.campo,
    gap: espaco.xs,
  },
  mensagemSuporte: {
    backgroundColor: cores.sucessoFundo,
  },
  mensagemDe: { fontSize: 11, fontWeight: peso.forte, color: cores.textoFraco },
  mensagemTexto: { fontSize: fonte.micro, lineHeight: 19, color: cores.texto },
})
