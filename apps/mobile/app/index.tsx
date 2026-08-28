import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import { lerSessao } from '@/lib/session'
import { cores } from '@/theme/tokens'

/**
 * Porta de entrada: decide entre login e app conforme haja sessao.
 *
 * A leitura do AsyncStorage e assincrona, entao existe um instante sem
 * resposta — mostrar o indicador evita a piscada de tela de login para
 * quem ja esta logado.
 */
export default function Entrada() {
  const [estado, setEstado] = useState<'verificando' | 'logado' | 'deslogado'>('verificando')

  useEffect(() => {
    let cancelado = false

    async function verificar() {
      const sessao = await lerSessao()
      if (!cancelado) setEstado(sessao ? 'logado' : 'deslogado')
    }

    void verificar()
    return () => {
      cancelado = true
    }
  }, [])

  if (estado === 'verificando') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={cores.acento} />
      </View>
    )
  }

  return <Redirect href={estado === 'logado' ? '/inicio' : '/login'} />
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
})
