import type { AppointmentOutput } from '@na-regua/contracts'
import type { AppointmentRepository, NewAppointment, ReminderScheduler } from '@na-regua/core'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerRateLimit } from '../plugins/rate-limit.js'
import { type AgendaDeps, registerAgendaRoutes } from './agenda.js'

/**
 * As rotas da agenda pelo ciclo real do Fastify.
 *
 * Repositorio em memoria: o que estas rotas prometem e um par status + corpo, e
 * provar isso nao precisa de Postgres. O repositorio de verdade
 * (`appointment-repository.ts`) e exercitado pelas suites de `db`, que rodam na
 * CI com banco.
 */

const PRINCIPAL: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

function agendaEmMemoria() {
  const guardados = new Map<string, AppointmentOutput & { companyId: string }>()
  const lembretes = new Map<string, Date>()
  let sequencia = 0

  const appointments: AppointmentRepository = {
    save: async (a: NewAppointment) => {
      sequencia += 1
      const gravado = {
        id: `apt-${sequencia}`,
        companyId: a.companyId,
        title: a.title,
        startsAt: a.startsAt.toISOString(),
        customerId: a.customerId ?? null,
        notes: a.notes ?? null,
        reminderMinutesBefore: a.reminderMinutesBefore ?? null,
        status: 'scheduled' as const,
        createdAt: a.createdAt.toISOString(),
      }
      guardados.set(gravado.id, gravado)
      return gravado
    },
    findById: async (companyId, id) => {
      const a = guardados.get(id)
      /* Filtra por empresa de verdade: um falso que ignorasse isso faria o
         teste de isolamento medir o vazio. */
      return a === undefined || a.companyId !== companyId ? undefined : a
    },
    listBetween: async (companyId, from, to) =>
      [...guardados.values()]
        .filter(
          (a) =>
            a.companyId === companyId &&
            a.status === 'scheduled' &&
            new Date(a.startsAt) >= from &&
            new Date(a.startsAt) <= to,
        )
        /* Ordenar e responsabilidade do REPOSITORIO — a porta diz "em ordem de
           horario", e o de verdade usa ORDER BY. Um falso sem isso deixaria
           passar um caso de uso que assume ordenacao sem pedir. */
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    cancel: async (_companyId, id) => {
      const a = guardados.get(id)!
      const cancelado = { ...a, status: 'cancelled' as const }
      guardados.set(id, cancelado)
      return cancelado
    },
  }

  const reminders: ReminderScheduler = {
    schedule: async ({ appointmentId, fireAt }) => void lembretes.set(appointmentId, fireAt),
    cancel: async (_c, appointmentId) => void lembretes.delete(appointmentId),
  }

  return { appointments, reminders, lembretes }
}

async function buildApp(principal: AuthenticatedPrincipal | null = PRINCIPAL) {
  const memoria = agendaEmMemoria()
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  await registerRateLimit(app)
  app.addHook('onRequest', async (request) => {
    if (principal !== null) request.principal = principal
  })
  registerAgendaRoutes(app, memoria as unknown as AgendaDeps)
  return { app, memoria }
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

const AMANHA = '2026-12-10T14:00:00.000Z'

const marcar = (a: FastifyInstance, body: Record<string, unknown>) =>
  a.inject({ method: 'POST', url: '/agenda', payload: body })

describe('marcar — RF-089', () => {
  it('cria e responde 201', async () => {
    const c = await buildApp()
    app = c.app

    const r = await marcar(app, { title: 'Entrega Padaria Sol', startsAt: AMANHA })

    expect(r.statusCode).toBe(201)
    expect(r.json().status).toBe('scheduled')
  })

  it('vincula ao cliente — RF-090', async () => {
    const c = await buildApp()
    app = c.app

    const r = await marcar(app, { title: 'Visita', startsAt: AMANHA, customerId: 'cliente-7' })

    expect(r.json().customerId).toBe('cliente-7')
  })

  it('agenda o lembrete na antecedencia pedida — RF-091', async () => {
    const c = await buildApp()
    app = c.app

    const r = await marcar(app, {
      title: 'Entrega',
      startsAt: AMANHA,
      reminderMinutesBefore: 30,
    })

    expect(c.memoria.lembretes.get(r.json().id)?.toISOString()).toBe('2026-12-10T13:30:00.000Z')
  })

  it('corpo invalido responde 400', async () => {
    const c = await buildApp()
    app = c.app

    expect((await marcar(app, { title: 'x' })).statusCode).toBe(400)
  })

  it('campo desconhecido e recusado — o schema e strict', async () => {
    const c = await buildApp()
    app = c.app

    const r = await marcar(app, { title: 'Entrega', startsAt: AMANHA, cor: 'azul' })

    expect(r.statusCode).toBe(400)
  })

  it('sem sessao responde 401', async () => {
    const c = await buildApp(null)
    app = c.app

    expect((await marcar(app, { title: 'Entrega', startsAt: AMANHA })).statusCode).toBe(401)
  })

  /* A alcada vive em `core`, e a rota so traduz — e o que faz o canal WhatsApp
     recusar igual. */
  it('accountant recebe 403 — somente leitura', async () => {
    const c = await buildApp({ ...PRINCIPAL, role: 'accountant' })
    app = c.app

    expect((await marcar(app, { title: 'Entrega', startsAt: AMANHA })).statusCode).toBe(403)
  })
})

describe('agenda do dia — RF-093', () => {
  it('traz os do dia, em ordem de horario', async () => {
    const c = await buildApp()
    app = c.app
    await marcar(app, { title: 'Tarde', startsAt: '2026-12-10T16:00:00.000Z' })
    await marcar(app, { title: 'Manha', startsAt: '2026-12-10T08:00:00.000Z' })

    const r = await app.inject({ method: 'GET', url: '/agenda?dia=2026-12-10' })

    expect(r.json().appointments.map((a: AppointmentOutput) => a.title)).toEqual(['Manha', 'Tarde'])
  })

  /* O ultimo instante do dia entra: o `core` passa o fim inclusive, e o
     repositorio usa `<=`. Com `<`, um compromisso as 23:59:59.999 sumiria. */
  it('inclui o ultimo instante do dia', async () => {
    const c = await buildApp()
    app = c.app
    await marcar(app, { title: 'Virada', startsAt: '2026-12-10T23:59:59.999Z' })

    const r = await app.inject({ method: 'GET', url: '/agenda?dia=2026-12-10' })

    expect(r.json().appointments).toHaveLength(1)
  })

  /* Diz "esta livre" explicitamente, em vez de deixar a tela deduzir de uma
     lista vazia — que e o que ela receberia tambem se a consulta falhasse. */
  it('dia livre responde isEmpty, e nao so lista vazia', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/agenda?dia=2026-12-10' })

    expect(r.json().isEmpty).toBe(true)
    expect(r.json().day).toBe('2026-12-10')
  })

  it.each(['', '?dia=10/12/2026', '?dia=2026-13-40'])(
    'dia invalido "%s" responde 400',
    async (q) => {
      const c = await buildApp()
      app = c.app

      expect((await app.inject({ method: 'GET', url: `/agenda${q}` })).statusCode).toBe(400)
    },
  )

  /* Somente leitura nao e sem acesso. */
  it('accountant consulta a agenda', async () => {
    const c = await buildApp({ ...PRINCIPAL, role: 'accountant' })
    app = c.app

    expect((await app.inject({ method: 'GET', url: '/agenda?dia=2026-12-10' })).statusCode).toBe(
      200,
    )
  })
})

describe('cancelar — RF-092', () => {
  async function comCompromisso(reminderMinutesBefore?: number) {
    const c = await buildApp()
    app = c.app
    const r = await marcar(app, {
      title: 'Entrega',
      startsAt: AMANHA,
      ...(reminderMinutesBefore === undefined ? {} : { reminderMinutesBefore }),
    })
    return { c, id: r.json().id as string }
  }

  /* POST /cancelar e nao DELETE: nada e apagado (RNF-040), e DELETE prometeria
     o contrario. */
  it('marca como cancelado e responde 200', async () => {
    const { id } = await comCompromisso()

    const r = await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    expect(r.statusCode).toBe(200)
    expect(r.json().status).toBe('cancelled')
  })

  it('cancela o lembrete junto', async () => {
    const { c, id } = await comCompromisso(30)
    expect(c.memoria.lembretes.has(id)).toBe(true)

    await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    expect(c.memoria.lembretes.has(id)).toBe(false)
  })

  it('o cancelado some da agenda do dia, mas nao foi apagado', async () => {
    const { id } = await comCompromisso()
    await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    const dia = await app.inject({ method: 'GET', url: '/agenda?dia=2026-12-10' })

    expect(dia.json().appointments).toHaveLength(0)
  })

  it('cancelar duas vezes responde 409', async () => {
    const { id } = await comCompromisso()
    await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    const r = await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    expect(r.statusCode).toBe(409)
  })

  it('compromisso inexistente responde 404', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'POST', url: '/agenda/apt-nenhum/cancelar', payload: {} })

    expect(r.statusCode).toBe(404)
  })

  /* 404 e nao 403: 403 confirmaria que o id existe em outra loja. */
  it('compromisso de outra empresa responde 404', async () => {
    const { id } = await comCompromisso()
    await app.close()

    const outra = await buildApp({ ...PRINCIPAL, companyId: 'empresa-2' })
    app = outra.app

    const r = await app.inject({ method: 'POST', url: `/agenda/${id}/cancelar`, payload: {} })

    expect(r.statusCode).toBe(404)
  })
})
