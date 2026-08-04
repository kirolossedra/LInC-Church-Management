import { z } from 'zod'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const bookingDateSchema = z
  .string()
  .regex(datePattern)
  .refine(isCalendarDate, 'The date is invalid.')

export const bookingTimeSchema = z.string().regex(timePattern)

export const bookingScheduleQuerySchema = z
  .object({
    start: bookingDateSchema,
    end: bookingDateSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.end < value.start) {
      context.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'The end date must not precede the start date.',
      })
      return
    }

    const start = Date.parse(`${value.start}T00:00:00Z`)
    const end = Date.parse(`${value.end}T00:00:00Z`)
    if ((end - start) / 86_400_000 > 62) {
      context.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'The requested schedule range is too large.',
      })
    }
  })

export const createBookingRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    date: bookingDateSchema,
    startTime: bookingTimeSchema,
    endTime: bookingTimeSchema,
    reason: z.string().trim().min(1).max(2000),
    requesterLocale: z.enum(['en', 'ar']).default('en'),
    website: z.string().max(0).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const start = timeToMinutes(value.startTime)
    const end = timeToMinutes(value.endTime)
    if (end - start !== 30) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'Booking requests must use a 30-minute slot.',
      })
    }
    if (start < 9 * 60 || end > 20 * 60) {
      context.addIssue({
        code: 'custom',
        path: ['startTime'],
        message: 'The requested time is outside booking hours.',
      })
    }
  })

export const firebasePushResponseSchema = z.object({
  name: z.string().min(1),
})

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
