import { Hono, type Context } from 'hono'
import { z } from 'zod'

import {
  runPastorAgent,
  runPublicBookingAgent,
  type PastorAgentResult,
  type PublicBookingAgentResult,
} from '../bezalel/bezalel.ai'
import { buildPublicBookingSchedule } from '../booking/booking.service'
import { bookingDateSchema, bookingTimeSchema, createBookingRequestSchema } from '../schemas/booking.schema'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { requirePastorAccess } from '../security/pastorAuthorization'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  createFirebaseRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import { GeminiServiceError } from '../services/gemini.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const conversationSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2_000),
  }).strict()).min(1).max(12),
  locale: z.enum(['en', 'ar']).default('en'),
}).strict()

type RawCollection = Record<string, unknown> | null

export type BezalelDependencies = {
  verifyToken?: FirebaseTokenVerifier
  databaseFetch?: FirebaseDatabaseFetch
  geminiFetch?: typeof fetch
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  pastorAgent?: typeof runPastorAgent
  bookingAgent?: typeof runPublicBookingAgent
  now?: () => number
}

export function createBezalelRoutes(dependencies: BezalelDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now

  routes.post(
    '/pastor/chat',
    createFirebaseAuthMiddleware(dependencies.verifyToken),
    requirePastorAccess(),
    async context => {
      const input = conversationSchema.safeParse(await readJson(context))
      if (!input.success) return validationError(context)

      try {
        const databaseUrl = requiredDatabaseUrl(context)
        const database = createFirebaseRealtimeDatabaseClient({
          databaseUrl,
          idToken: context.get('firebaseIdToken'),
          fetchImpl: dependencies.databaseFetch,
        })
        const calendar = await pastorCalendarContext(database)
        const agent = dependencies.pastorAgent ?? runPastorAgent
        const result = validatePastorAction(await agent(
          context.env,
          {
            messages: input.data.messages,
            calendar,
            today: dateInToronto(now()),
          },
          dependencies.geminiFetch,
        ))
        context.header('Cache-Control', 'private, no-store, max-age=0')
        return context.json({ success: true, data: result })
      } catch (error) {
        return agentError(context, error)
      }
    },
  )

  routes.post('/booking/chat', async context => {
    const input = conversationSchema.safeParse(await readJson(context))
    if (!input.success) return validationError(context)

    try {
      const databaseUrl = requiredDatabaseUrl(context)
      const getAccessToken = dependencies.getAccessToken ??
        (bindings => getFirebaseServiceAccountAccessToken(bindings))
      const accessToken = await getAccessToken(context.env)
      const database = createFirebaseAdminRealtimeDatabaseClient({
        databaseUrl,
        getAccessToken: async () => accessToken,
        fetchImpl: dependencies.databaseFetch,
      })
      const start = dateInToronto(now())
      const end = addDays(start, 62)
      const schedule = await publicScheduleContext(database, start, end)
      const agent = dependencies.bookingAgent ?? runPublicBookingAgent
      const rawResult = await agent(
        context.env,
        {
          messages: input.data.messages,
          schedule,
          today: start,
          locale: input.data.locale,
        },
        dependencies.geminiFetch,
      )
      const result = validatePublicBooking(rawResult, input.data.locale)
      context.header('Cache-Control', 'no-store, max-age=0')
      return context.json({ success: true, data: result })
    } catch (error) {
      return agentError(context, error)
    }
  })

  return routes
}

async function pastorCalendarContext(database: FirebaseRealtimeDatabaseClient) {
  const [meetings, meetingRequests, availability, unavailability, groupMeetingSchedules] = await Promise.all([
    database.get<RawCollection>(['meetings']),
    database.get<RawCollection>(['meetingRequests']),
    database.get<RawCollection>(['availability']),
    database.get<RawCollection>(['unavailability']),
    database.get<RawCollection>(['peopleDevelopment', 'meetingSchedules']),
  ])
  return {
    meetings: safeRecords(meetings, ['title', 'date', 'startTime', 'endTime', 'type']),
    meetingRequests: safeRecords(meetingRequests, ['name', 'date', 'startTime', 'endTime', 'status']),
    availability: safeRecords(availability, ['date', 'startTime', 'endTime', 'reason', 'allDay']),
    unavailability: safeRecords(unavailability, ['date', 'startTime', 'endTime', 'reason', 'allDay']),
    groupMeetingSchedules: safeRecords(groupMeetingSchedules, ['audience', 'group', 'weekday', 'ordinal', 'startTime', 'durationMinutes', 'active']),
  }
}

async function publicScheduleContext(database: FirebaseRealtimeDatabaseClient, start: string, end: string) {
  const [availability, unavailability, meetings, meetingRequests, groupMeetingSchedules, reservations] = await Promise.all([
    database.get<RawCollection>(['availability']),
    database.get<RawCollection>(['unavailability']),
    database.get<RawCollection>(['meetings']),
    database.get<RawCollection>(['meetingRequests']),
    database.get<RawCollection>(['peopleDevelopment', 'meetingSchedules']),
    database.get<RawCollection>(['calendarReservations']),
  ])
  return buildPublicBookingSchedule({
    availability,
    unavailability,
    meetings,
    meetingRequests,
    peopleDevelopmentSchedules: groupMeetingSchedules,
    reservations,
    start,
    end,
  })
}

function safeRecords(collection: RawCollection, fields: string[]) {
  if (!collection || typeof collection !== 'object') return []
  return Object.entries(collection).slice(0, 500).flatMap(([id, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const record = value as Record<string, unknown>
    return [{ id, ...Object.fromEntries(fields.map(field => [field, record[field] ?? null])) }]
  })
}

function validatePastorAction(result: PastorAgentResult): PastorAgentResult {
  const timedAction = result.action === 'open_availability' || result.action === 'block_time'
  const targetedAction = result.action === 'delete_availability' || result.action === 'delete_unavailability' || result.action === 'accept_request' || result.action === 'reject_request'
  if (timedAction && (
    !bookingDateSchema.safeParse(result.date).success ||
    !bookingTimeSchema.safeParse(result.startTime).success ||
    !bookingTimeSchema.safeParse(result.endTime).success
  )) return { ...result, action: 'none' }
  if (targetedAction && !/^[A-Za-z0-9_-]{1,128}$/.test(result.targetId)) {
    return { ...result, action: 'none' }
  }
  return result
}

function validatePublicBooking(result: PublicBookingAgentResult, locale: 'en' | 'ar'): PublicBookingAgentResult {
  if (result.stage !== 'ready_to_book') return result
  const valid = createBookingRequestSchema.safeParse({
    ...result.booking,
    requesterLocale: locale,
    website: '',
  }).success
  return valid ? result : { ...result, stage: 'collect' }
}

function requiredDatabaseUrl(context: Context<AppEnv>) {
  const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
  if (!databaseUrl) throw new FirebaseRealtimeDatabaseError(503, 'Firebase Realtime Database is not configured.')
  return databaseUrl
}

function agentError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof GeminiServiceError) {
    return context.json({ success: false, error: { code: error.code, message: error.message } }, error.status as 429 | 503)
  }
  console.error('Bezalel backend operation failed:', error instanceof Error ? error.name : 'UnknownError')
  return context.json({
    success: false,
    error: {
      code: error instanceof FirebaseRealtimeDatabaseError ? 'BEZALEL_DATABASE_UNAVAILABLE' : 'BEZALEL_SERVICE_UNAVAILABLE',
      message: error instanceof FirebaseRealtimeDatabaseError
        ? 'Bezalel could not read the calendar right now.'
        : 'Bezalel is temporarily unavailable.',
    },
  }, 503)
}

function validationError(context: Context<AppEnv>) {
  return context.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The Bezalel request is invalid.' } }, 400)
}

async function readJson(context: Context<AppEnv>) {
  try { return await context.req.json() } catch { return undefined }
}

function dateInToronto(timestamp: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
