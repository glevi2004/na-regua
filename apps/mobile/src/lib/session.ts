/**
 * Sessao do usuario no mobile.
 *
 * Diferente do web, que guarda a sessao em cookie para o `proxy.ts` do
 * Next conseguir ler no servidor, aqui nao ha servidor no meio: o app
 * fala direto com a API. Por isso o armazenamento e o AsyncStorage.
 *
 * QUANDO O BACKEND EXISTIR: o que fica guardado aqui passa a ser o token
 * devolvido pelo POST /auth/login. Para producao, token deve ir em
 * `expo-secure-store` (Keychain no iOS, Keystore no Android) e nao em
 * AsyncStorage, que e texto puro — trocar antes de sair do prototipo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const CHAVE = 'eibuddy:sessao'

export type Sessao = {
  nome: string
  email: string
  empresa: string
}

export async function abrirSessao(sessao: Sessao): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    /* Falha de storage nao derruba o login — a sessao vale ate fechar. */
  }
}

export async function lerSessao(): Promise<Sessao | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Sessao) : null
  } catch {
    return null
  }
}

export async function encerrarSessao(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE)
  } catch {
    /* ignorado */
  }
}
