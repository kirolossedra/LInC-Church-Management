import { z } from 'zod'

import {
  bookingDateSchema,
  bookingTimeSchema,
  timeToMinutes,
} from './booking.schema'

export const pastorCalendarIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).default('')

export const pastorMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalText(4000),
    date: bookingDateSchema,
    startTime: bookingTimeSchema,
    endTime: bookingTimeSchema,
    location: optionalText(500),
    meetLink: optionalText(2000),
    type: z.enum([
      'prayer',
      'counseling',
      'service',
      'other',
    ]),
    participantIds: z
      .array(z.string().trim().min(1).max(128))
      .max(500)
      .default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      timeToMinutes(value.endTime) <=
      timeToMinutes(value.startTime)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'The meeting end time must follow its start time.',
      })
    }
  })

export const pastorCalendarBlockSchema = z
  .object({
    date: bookingDateSchema,
    startTime: bookingTimeSchema,
    endTime: bookingTimeSchema,
    reason: optionalText(1000),
    allDay: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      timeToMinutes(value.endTime) <=
      timeToMinutes(value.startTime)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'The block end time must follow its start time.',
      })
    }
  })

export const meetingRequestDecisionSchema = z
  .object({
    decision: z.enum(['accepted', 'rejected']),
    meetingTitle: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .default('Meeting with Pastor'),
  })
  .strict()

export const firebasePushResponseSchema = z.object({
  name: z.string().min(1),
})
