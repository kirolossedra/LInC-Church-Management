import { z } from 'zod'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) {
    return false
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value
    .split(':')
    .map(Number)

  return hours * 60 + minutes
}

const recipientSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254),
    name: z
      .string()
      .trim()
      .min(1)
      .max(120),
  })
  .strict()

const meetingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(200),
    date: z
      .string()
      .refine(isValidCalendarDate, {
        message: 'Meeting date must be a valid YYYY-MM-DD date.',
      }),
    startTime: z
      .string()
      .regex(timePattern, {
        message: 'Start time must use 24-hour HH:mm format.',
      }),
    endTime: z
      .string()
      .regex(timePattern, {
        message: 'End time must use 24-hour HH:mm format.',
      }),
    location: z
      .string()
      .trim()
      .max(300),
    meetLink: z
      .union([
        z.literal(''),
        z.string().trim().url().max(2048),
      ]),
  })
  .strict()
  .refine(
    meeting =>
      timeToMinutes(meeting.endTime) >
      timeToMinutes(meeting.startTime),
    {
      message: 'Meeting end time must be after the start time.',
      path: ['endTime'],
    },
  )

export const meetingInvitationRequestSchema = z
  .object({
    locale: z.enum(['en', 'ar']),
    recipients: z
      .array(recipientSchema)
      .min(1)
      .max(50),
    meeting: meetingSchema,
  })
  .strict()

export type MeetingInvitationRequest = z.infer<
  typeof meetingInvitationRequestSchema
>