import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import AgendaView from '@/components/agenda/AgendaView'

export const metadata: Metadata = {
  title: `Agenda — ${BRAND}`,
  description: 'Compromissos, entregas e vencimentos, com integracao ao Google Agenda.',
}

export default function AgendaPage() {
  return <AgendaView />
}
