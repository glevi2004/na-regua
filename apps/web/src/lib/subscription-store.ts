/**
 * Guarda o status da assinatura entre o login e o painel.
 *
 * TEMPORARIO: enquanto nao ha sessao real, o status fica no localStorage do
 * navegador. Quando o backend existir, isto deve ser trocado por:
 *   - o status vindo no token/sessao (cookie httpOnly), ou
 *   - uma chamada a GET /billing/subscription no layout do painel.
 * Nenhuma tela le o localStorage diretamente — todas passam por aqui.
 *
 * A leitura e exposta como um "external store" (getSnapshot/subscribe) para
 * ser consumida com useSyncExternalStore, que trata hidratacao corretamente.
 */

import type { SubscriptionStatus } from './auth-api'

const KEY = 'demo:subscription-status'

/** Snapshot em cache: getSnapshot precisa devolver valor estavel. */
let cache: SubscriptionStatus | null = null
const listeners = new Set<() => void>()

function leDoStorage(): SubscriptionStatus {
  try {
    const value = window.localStorage.getItem(KEY)
    if (value === 'overdue' || value === 'trial' || value === 'active') {
      return value
    }
  } catch {
    /* Sem acesso ao storage (aba privada, cookies bloqueados). */
  }
  return 'active'
}

/** Valor lido no cliente. */
export function getSubscriptionSnapshot(): SubscriptionStatus {
  if (cache === null) cache = leDoStorage()
  return cache
}

/** Valor usado no HTML do servidor e durante a hidratacao. */
export function getSubscriptionServerSnapshot(): SubscriptionStatus {
  return 'active'
}

export function subscribeSubscription(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function saveSubscriptionStatus(status: SubscriptionStatus): void {
  cache = status
  try {
    window.localStorage.setItem(KEY, status)
  } catch {
    /* Segue apenas em memoria se o storage nao estiver disponivel. */
  }
  listeners.forEach((listener) => listener())
}

export function clearSubscriptionStatus(): void {
  cache = 'active'
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignorado */
  }
  listeners.forEach((listener) => listener())
}
