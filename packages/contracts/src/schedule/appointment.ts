import { z } from 'zod'
import { dateTimeSchema, idSchema } from '../common/primitives.js'

/** Compromisso da agenda — glossario `Appointment`. RF-089 a RF-093. */

export const createAppointmentInputSchema = z
  .object({
    title: z.string().trim().min(2, 'Titulo muito curto.').max(140, 'Titulo muito longo.'),
    /** Instante do compromisso, com fuso. Armazenado em UTC. */
    startsAt: dateTimeSchema,
    /** Vincula ao cliente para aparecer no cadastro dele — RF-090. */
    customerId: idSchema.optional(),
    notes: z.string().trim().max(500, 'Observacao muito longa.').optional(),
    /**
     * Antecedencia do lembrete, em minutos — RF-091.
     *
     * Ausente = sem lembrete. Zero seria "avise na hora", que nao lembra
     * ninguem de nada, entao o minimo e 1.
     */
    reminderMinutesBefore: z
      .number()
      .int('A antecedencia do lembrete deve ser em minutos inteiros.')
      .min(1, 'A antecedencia minima do lembrete e 1 minuto.')
      .max(10_080, 'A antecedencia maxima do lembrete e 7 dias.')
      .optional(),
  })
  .strict()

export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>

/** Nada e apagado: compromisso e cancelado — RNF-040. */
export const cancelAppointmentInputSchema = z
  .object({
    appointmentId: idSchema,
    reason: z.string().trim().max(280, 'Motivo muito longo.').optional(),
  })
  .strict()

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentInputSchema>

/** Compromissos de um dia, em ordem de horario — RF-093. */
export const listDayAppointmentsInputSchema = z
  .object({
    /** Dia no fuso de exibicao da empresa, nao em UTC. */
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dia invalido. Use o formato AAAA-MM-DD.'),
  })
  .strict()

export type ListDayAppointmentsInput = z.infer<typeof listDayAppointmentsInputSchema>

export const appointmentStatusSchema = z.enum(['scheduled', 'cancelled'])
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>

export const appointmentOutputSchema = z.object({
  id: idSchema,
  title: z.string(),
  startsAt: z.string(),
  customerId: idSchema.nullable(),
  notes: z.string().nullable(),
  reminderMinutesBefore: z.number().int().nullable(),
  status: appointmentStatusSchema,
  createdAt: z.string(),
})

export type AppointmentOutput = z.infer<typeof appointmentOutputSchema>
