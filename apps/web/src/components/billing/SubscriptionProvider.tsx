'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { SubscriptionStatus } from '@/lib/auth-api'
import {
  getSubscriptionServerSnapshot,
  getSubscriptionSnapshot,
  saveSubscriptionStatus,
  subscribeSubscription,
} from '@/lib/subscription-store'

type SubscriptionContextValue = {
  status: SubscriptionStatus
  /** true quando o acesso deve ficar restrito. */
  bloqueado: boolean
  setStatus: (status: SubscriptionStatus) => void
  /** Abre o modal de "pagamento necessario" a partir de qualquer tela. */
  pedirRegularizacao: () => void
  modalAberto: boolean
  fecharModal: () => void
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  /* Le o status como store externo: o servidor renderiza "active" e o
     cliente reconcilia com o valor real logo apos a hidratacao, sem
     setState em efeito. SUBSTITUIR A FONTE POR: GET /billing/subscription. */
  const status = useSyncExternalStore(
    subscribeSubscription,
    getSubscriptionSnapshot,
    getSubscriptionServerSnapshot,
  )

  const [modalAberto, setModalAberto] = useState(false)

  const setStatus = useCallback((next: SubscriptionStatus) => {
    saveSubscriptionStatus(next)
  }, [])

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      status,
      bloqueado: status === 'overdue',
      setStatus,
      pedirRegularizacao: () => setModalAberto(true),
      modalAberto,
      fecharModal: () => setModalAberto(false),
    }),
    [status, setStatus, modalAberto],
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription precisa estar dentro de SubscriptionProvider')
  }
  return ctx
}
