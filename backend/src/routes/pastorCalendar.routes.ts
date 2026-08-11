import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import { hasCalendarConflict, normalizeRecurringGroupMeetings } from '../booking/booking.service'
import { buildCalendarIcs, type CalendarIcsEvent } from '../calendar/calendar.ics'
import { calendarReservationKey, calendarTemporalFields } from '../calendar/calendar.time'
import { buildCalendarNotificationEmail } from '../emails/calendarNotification.email'
import { normalizePastorCalendarSnapshot } from '../pastorCalendar/pastorCalendar.normalize'
import {
  firebasePushResponseSchema,
  meetingRequestDecisionSchema,
  pastorCalendarBlockSchema,
  pastorCalendarIdSchema,
  pastorMeetingSchema,
} from '../schemas/pastorCalendar.schema'
import { bookingScheduleQuerySchema } from '../schemas/booking.schema'
import {
  createFirebaseAuthMiddleware,
  type FirebaseTokenVerifier,
} from '../security/firebaseAuth'
import { requirePastorAccess } from '../security/pastorAuthorization'
import {
  sendBrevoEmail,
  type BrevoEmailResult,
} from '../services/brevo.service'
import {
  createFirebaseRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv } from '../types/app'

const MEETINGS_PATH = ['meetings'] as const
const REQUESTS_PATH = ['meetingRequests'] as const
const AVAILABILITY_PATH = ['availability'] as const
const UNAVAILABILITY_PATH = ['unavailability'] as const
const PEOPLE_DEVELOPMENT_SCHEDULES_PATH = ['peopleDevelopment', 'meetingSchedules'] as const
const RESERVATIONS_PATH = ['calendarReservations'] as const

type RawRecord = Record<string, unknown>
type RawCollection = Record<string, unknown> | null

export type PastorCalendarDependencies = {
  verifyToken?: FirebaseTokenVerifier
  databaseFetch?: FirebaseDatabaseFetch
  sendNotification?: (
    bindings: AppEnv['Bindings'],
    email: Parameters<typeof sendBrevoEmail>[1],
  ) => Promise<BrevoEmailResult>
  now?: () => number
  createId?: () => string
}

export function createPastorCalendarRoutes(
  dependencies: PastorCalendarDependencies = {},
) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? (() => crypto.randomUUID())

  routes.use(
    '*',
    createFirebaseAuthMiddleware(dependencies.verifyToken),
  )
  routes.use('*', requirePastorAccess())

  routes.get('/', context =>
    withDatabase(context, dependencies, async database => {
      const [meetings, meetingRequests, availability, unavailability, groupMeetingSchedules] =
        await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(AVAILABILITY_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
        ])

      context.header('Cache-Control', 'private, no-store, max-age=0')
      return context.json({
        success: true,
        data: {
          ...normalizePastorCalendarSnapshot({
          meetings,
          meetingRequests,
          availability,
          unavailability,
          }),
          groupMeetingSchedules: normalizeCollectionWithIds(groupMeetingSchedules),
          timeZone: 'America/Toronto',
        },
      })
    }),
  )

  routes.get('/export.ics', async context => {
    const validation = bookingScheduleQuerySchema.safeParse({
      start: context.req.query('start'),
      end: context.req.query('end'),
    })
    if (!validation.success) return validationError(context, validation.error)

    return withDatabase(context, dependencies, async database => {
      const [meetings, meetingRequests, availability, unavailability, groupMeetingSchedules] =
        await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(AVAILABILITY_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
        ])
      const { start, end } = validation.data
      const events: CalendarIcsEvent[] = [
        ...calendarCollectionEvents(meetings, start, end, (id, record) => ({
          id: `meeting-${id}`,
          title: stringValue(record.title) || 'Pastor meeting',
          date: stringValue(record.date),
          startTime: stringValue(record.startTime),
          endTime: stringValue(record.endTime),
          description: stringValue(record.description),
          location: stringValue(record.location),
        })),
        ...calendarCollectionEvents(meetingRequests, start, end, (id, record) => ({
          id: `request-${id}`,
          title: `Pending booking${stringValue(record.name) ? ` — ${stringValue(record.name)}` : ''}`,
          date: stringValue(record.date),
          startTime: stringValue(record.startTime),
          endTime: stringValue(record.endTime),
          description: stringValue(record.reason),
          status: 'TENTATIVE',
        }), record => stringValue(record.status).toLowerCase() === 'pending'),
        ...calendarCollectionEvents(availability, start, end, (id, record) => ({
          id: `availability-${id}`,
          title: 'Booking availability',
          date: stringValue(record.date),
          startTime: stringValue(record.startTime) || '09:00',
          endTime: stringValue(record.endTime) || '20:00',
        })),
        ...calendarCollectionEvents(unavailability, start, end, (id, record) => ({
          id: `unavailable-${id}`,
          title: stringValue(record.reason) || 'Unavailable',
          date: stringValue(record.date),
          startTime: stringValue(record.startTime) || '00:00',
          endTime: stringValue(record.endTime) || '23:59',
        })),
        ...normalizeRecurringGroupMeetings(groupMeetingSchedules, start, end).map((occurrence, index) => ({
          id: `group-${occurrence.date}-${occurrence.startTime}-${index}`,
          title: 'People Development group meeting',
          ...occurrence,
        })),
      ]

      return new Response(buildCalendarIcs(events), {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="linc-pastor-calendar-${start}-${end}.ics"`,
          'Cache-Control': 'private, no-store, max-age=0',
        },
      })
    })
  })

  routes.post('/meetings', async context => {
    const validation = pastorMeetingSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const [meetings, meetingRequests, unavailability, groupMeetingSchedules, reservations] = await Promise.all([
        database.get<RawCollection>(MEETINGS_PATH),
        database.get<RawCollection>(REQUESTS_PATH),
        database.get<RawCollection>(UNAVAILABILITY_PATH),
        database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
        database.get<RawCollection>(RESERVATIONS_PATH),
      ])
      if (hasCalendarConflict({
        date: validation.data.date,
        startTime: validation.data.startTime,
        endTime: validation.data.endTime,
        meetings,
        meetingRequests,
        unavailability,
        peopleDevelopmentSchedules: groupMeetingSchedules,
        reservations,
      })) return calendarConflict(context)
      const result = await database.post<unknown>(MEETINGS_PATH, {
        ...validation.data,
        ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
        acknowledged: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: actor(context),
      })
      const parsed = firebasePushResponseSchema.safeParse(result)
      if (!parsed.success) {
        throw new FirebaseRealtimeDatabaseError(
          502,
          'Firebase did not return a meeting ID.',
        )
      }

      return context.json(
        { success: true, data: { id: parsed.data.name } },
        201,
      )
    })
  })

  routes.patch('/meetings/:meetingId', async context => {
    const meetingId = parseId(context, 'meetingId')
    if (!meetingId) return invalidIdError(context)
    const validation = pastorMeetingSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(context, dependencies, async database => {
      const existing = await database.get<RawRecord>([
        ...MEETINGS_PATH,
        meetingId,
      ])
      if (!existing) return notFound(context, 'MEETING_NOT_FOUND')

      const timestamp = now()
      const sourceRequestId = safeId(existing.sourceRequestId)
      const reservationKey = safeId(existing.reservationKey)
      const nextReservationKey = reservationKey
        ? calendarReservationKey(validation.data.date, validation.data.startTime, validation.data.endTime)
        : null
      const [meetings, meetingRequests, unavailability, groupMeetingSchedules, reservations] = await Promise.all([
        database.get<RawCollection>(MEETINGS_PATH),
        database.get<RawCollection>(REQUESTS_PATH),
        database.get<RawCollection>(UNAVAILABILITY_PATH),
        database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
        database.get<RawCollection>(RESERVATIONS_PATH),
      ])
      if (hasCalendarConflict({
        date: validation.data.date,
        startTime: validation.data.startTime,
        endTime: validation.data.endTime,
        meetings,
        meetingRequests,
        unavailability,
        peopleDevelopmentSchedules: groupMeetingSchedules,
        reservations,
        excludeMeetingId: meetingId,
        excludeRequestId: sourceRequestId || undefined,
        excludeReservationKey: reservationKey || undefined,
      })) return calendarConflict(context)
      const detailsChanged =
        stringValue(existing.date) !== validation.data.date ||
        stringValue(existing.startTime) !== validation.data.startTime ||
        stringValue(existing.endTime) !== validation.data.endTime ||
        stringValue(existing.location) !== validation.data.location ||
        stringValue(existing.meetLink) !== validation.data.meetLink

      const reservationMoved = Boolean(
        reservationKey && nextReservationKey && reservationKey !== nextReservationKey,
      )
      if (reservationMoved && nextReservationKey) {
        const reserved = await database.putIfAbsent(
          [...RESERVATIONS_PATH, nextReservationKey],
          {
            date: validation.data.date,
            startTime: validation.data.startTime,
            endTime: validation.data.endTime,
            status: 'accepted',
            meetingId,
            requestId: sourceRequestId || null,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
          },
        )
        if (!reserved) return calendarConflict(context)
      }

      const meetingChanges: RawRecord = {
        ...validation.data,
        ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
        ...(reservationMoved ? { reservationKey: nextReservationKey } : {}),
        updatedAt: timestamp,
        updatedBy: actor(context),
        ...(detailsChanged
          ? {
              acknowledged: false,
              acknowledgedAt: null,
              acknowledgedEmail: null,
            }
          : {}),
      }
      const rootChanges = prefixChanges(
        `meetings/${meetingId}`,
        meetingChanges,
      )
      if (sourceRequestId) {
        Object.assign(
          rootChanges,
          prefixChanges(`meetingRequests/${sourceRequestId}`, {
            date: validation.data.date,
            startTime: validation.data.startTime,
            endTime: validation.data.endTime,
            ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
            ...(reservationMoved ? { reservationKey: nextReservationKey } : {}),
            updatedAt: timestamp,
          }),
        )
      }

      if (reservationMoved && reservationKey) {
        rootChanges[`calendarReservations/${reservationKey}/status`] = 'released'
        rootChanges[`calendarReservations/${reservationKey}/releasedAt`] = timestamp
        rootChanges[`calendarReservations/${reservationKey}/updatedAt`] = timestamp
      }

      try {
        await database.patch([], rootChanges)
      } catch (error) {
        if (reservationMoved && nextReservationKey) {
          await database.delete([...RESERVATIONS_PATH, nextReservationKey])
        }
        throw error
      }
      const notificationSent = detailsChanged
        ? await notifyRequester(context, dependencies, 'reschedule', { ...existing, ...meetingChanges })
        : false
      return context.json({ success: true, data: { updated: true, notificationSent } })
    })
  })

  routes.delete('/meetings/:meetingId', async context => {
    const meetingId = parseId(context, 'meetingId')
    if (!meetingId) return invalidIdError(context)

    return withDatabase(context, dependencies, async database => {
      const meeting = await database.get<RawRecord>([
        ...MEETINGS_PATH,
        meetingId,
      ])
      if (!meeting) return notFound(context, 'MEETING_NOT_FOUND')

      const timestamp = now()
      const sourceRequestId = safeId(meeting.sourceRequestId)
      const reservationKey = safeId(meeting.reservationKey)
      const rootChanges: Record<string, unknown> = {
        [`meetings/${meetingId}`]: null,
      }
      if (sourceRequestId) {
        rootChanges[`meetingRequests/${sourceRequestId}/status`] = 'cancelled'
        rootChanges[`meetingRequests/${sourceRequestId}/cancelledAt`] = timestamp
        rootChanges[`meetingRequests/${sourceRequestId}/updatedAt`] = timestamp
        rootChanges[`meetingRequests/${sourceRequestId}/updatedBy`] = actor(context)
      }
      if (reservationKey) {
        rootChanges[`calendarReservations/${reservationKey}/status`] = 'released'
        rootChanges[`calendarReservations/${reservationKey}/releasedAt`] = timestamp
      }
      await database.patch([], rootChanges)
      const notificationSent = await notifyRequester(
        context,
        dependencies,
        'cancellation',
        meeting,
      )

      return context.json({
        success: true,
        data: { deleted: true, notificationSent },
      })
    })
  })

  addBlockRoutes({
    routes,
    resource: 'availability',
    path: AVAILABILITY_PATH,
    dependencies,
    now,
  })
  addBlockRoutes({
    routes,
    resource: 'unavailability',
    path: UNAVAILABILITY_PATH,
    dependencies,
    now,
  })

  routes.post(
    '/meeting-requests/:requestId/decision',
    async context => {
      const requestId = parseId(context, 'requestId')
      if (!requestId) return invalidIdError(context)
      const validation = meetingRequestDecisionSchema.safeParse(
        await readJsonBody(context),
      )
      if (!validation.success) {
        return validationError(context, validation.error)
      }

      return withDatabase(context, dependencies, async database => {
        const request = await database.get<RawRecord>([
          ...REQUESTS_PATH,
          requestId,
        ])
        if (!request) {
          return notFound(context, 'MEETING_REQUEST_NOT_FOUND')
        }
        if (stringValue(request.status).toLowerCase() !== 'pending') {
          return context.json(
            {
              success: false,
              error: {
                code: 'MEETING_REQUEST_ALREADY_DECIDED',
                message: 'This meeting request was already decided.',
              },
            },
            409,
          )
        }

        const timestamp = now()
        const reservationKey = safeId(request.reservationKey)
        if (validation.data.decision === 'rejected') {
          const rejectionChanges: Record<string, unknown> = {
            [`meetingRequests/${requestId}/status`]: 'rejected',
            [`meetingRequests/${requestId}/updatedAt`]: timestamp,
            [`meetingRequests/${requestId}/updatedBy`]: actor(context),
          }
          if (reservationKey) {
            rejectionChanges[`calendarReservations/${reservationKey}/status`] = 'rejected'
            rejectionChanges[`calendarReservations/${reservationKey}/releasedAt`] = timestamp
          }
          await database.patch([], rejectionChanges)
          const notificationSent = await notifyRequester(
            context,
            dependencies,
            'rejection',
            request,
          )
          await database.patch([...REQUESTS_PATH, requestId], {
            rejectionEmailSent: notificationSent,
            rejectionEmailSentUsing:
              notificationSent ? 'Brevo' : null,
            rejectionEmailSentAt:
              notificationSent ? timestamp : null,
          })

          return context.json({
            success: true,
            data: { decision: 'rejected', notificationSent },
          })
        }

        const meetingId = createId()
        if (!pastorCalendarIdSchema.safeParse(meetingId).success) {
          throw new FirebaseRealtimeDatabaseError(
            502,
            'The server generated an invalid meeting ID.',
          )
        }

        const [meetings, meetingRequests, unavailability, groupMeetingSchedules, reservations] = await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
          database.get<RawCollection>(RESERVATIONS_PATH),
        ])
        if (hasCalendarConflict({
          date: stringValue(request.date),
          startTime: stringValue(request.startTime),
          endTime: stringValue(request.endTime),
          meetings,
          meetingRequests,
          unavailability,
          peopleDevelopmentSchedules: groupMeetingSchedules,
          reservations,
          excludeRequestId: requestId,
          excludeReservationKey: reservationKey || undefined,
        })) return calendarConflict(context)

        const requesterLocale = localeValue(request.requesterLocale)
        const meeting = {
          title: validation.data.meetingTitle,
          description: '',
          date: stringValue(request.date),
          startTime: stringValue(request.startTime),
          endTime: stringValue(request.endTime),
          location: '',
          meetLink: '',
          type: 'counseling',
          participantIds: [],
          requestName: stringValue(request.name),
          requestEmail: stringValue(request.email),
          requestReason: stringValue(request.reason),
          requesterLocale,
          requesterLanguage:
            stringValue(request.requesterLanguage) ||
            (requesterLocale === 'ar' ? 'Arabic' : 'English'),
          sourceRequestId: requestId,
          reservationKey,
          ...calendarTemporalFields(stringValue(request.date), stringValue(request.startTime), stringValue(request.endTime)),
          acknowledged: true,
          acknowledgedAt: timestamp,
          acknowledgedEmail: stringValue(request.email),
          createdAt: timestamp,
          updatedAt: timestamp,
          updatedBy: actor(context),
        }

        const acceptanceChanges: Record<string, unknown> = {
          [`meetings/${meetingId}`]: meeting,
          [`meetingRequests/${requestId}/status`]: 'accepted',
          [`meetingRequests/${requestId}/createdMeetingId`]: meetingId,
          [`meetingRequests/${requestId}/acceptedAt`]: timestamp,
          [`meetingRequests/${requestId}/updatedAt`]: timestamp,
          [`meetingRequests/${requestId}/updatedBy`]: actor(context),
        }
        if (reservationKey) {
          acceptanceChanges[`calendarReservations/${reservationKey}/status`] = 'accepted'
          acceptanceChanges[`calendarReservations/${reservationKey}/meetingId`] = meetingId
          acceptanceChanges[`calendarReservations/${reservationKey}/updatedAt`] = timestamp
        }
        await database.patch([], acceptanceChanges)

        const notificationSent = await notifyRequester(
          context,
          dependencies,
          'confirmation',
          meeting,
        )
        await database.patch([...REQUESTS_PATH, requestId], {
          confirmationSent: notificationSent,
          confirmationSentUsing:
            notificationSent ? 'Brevo' : null,
          confirmationSentAt:
            notificationSent ? timestamp : null,
        })

        return context.json({
          success: true,
          data: {
            decision: 'accepted',
            meetingId,
            notificationSent,
          },
        })
      })
    },
  )

  return routes
}

function addBlockRoutes({
  routes,
  resource,
  path,
  dependencies,
  now,
}: {
  routes: Hono<AppEnv>
  resource: 'availability' | 'unavailability'
  path: readonly string[]
  dependencies: PastorCalendarDependencies
  now: () => number
}) {
  routes.post(`/${resource}`, async context => {
    const validation = pastorCalendarBlockSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      if (resource === 'unavailability') {
        const [meetings, meetingRequests, unavailability, groupMeetingSchedules, reservations] = await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
          database.get<RawCollection>(RESERVATIONS_PATH),
        ])
        if (hasCalendarConflict({
          ...validation.data,
          meetings,
          meetingRequests,
          unavailability,
          peopleDevelopmentSchedules: groupMeetingSchedules,
          reservations,
        })) return calendarConflict(context)
      }
      const result = await database.post<unknown>(path, {
        ...validation.data,
        ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: actor(context),
      })
      const parsed = firebasePushResponseSchema.safeParse(result)
      if (!parsed.success) {
        throw new FirebaseRealtimeDatabaseError(
          502,
          'Firebase did not return a calendar block ID.',
        )
      }
      return context.json(
        { success: true, data: { id: parsed.data.name } },
        201,
      )
    })
  })

  routes.patch(`/${resource}/:blockId`, async context => {
    const blockId = parseId(context, 'blockId')
    if (!blockId) return invalidIdError(context)
    const validation = pastorCalendarBlockSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }
    return withDatabase(context, dependencies, async database => {
      if (resource === 'unavailability') {
        const [meetings, meetingRequests, unavailability, groupMeetingSchedules, reservations] = await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(PEOPLE_DEVELOPMENT_SCHEDULES_PATH),
          database.get<RawCollection>(RESERVATIONS_PATH),
        ])
        if (hasCalendarConflict({
          ...validation.data,
          meetings,
          meetingRequests,
          unavailability,
          peopleDevelopmentSchedules: groupMeetingSchedules,
          reservations,
          excludeUnavailabilityId: blockId,
        })) return calendarConflict(context)
      }
      await database.patch([...path, blockId], {
        ...validation.data,
        ...calendarTemporalFields(validation.data.date, validation.data.startTime, validation.data.endTime),
        updatedAt: now(),
        updatedBy: actor(context),
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.delete(`/${resource}/:blockId`, async context => {
    const blockId = parseId(context, 'blockId')
    if (!blockId) return invalidIdError(context)
    return withDatabase(context, dependencies, async database => {
      await database.delete([...path, blockId])
      return context.json({ success: true, data: { deleted: true } })
    })
  })
}

async function notifyRequester(
  context: Context<AppEnv>,
  dependencies: PastorCalendarDependencies,
  kind: 'confirmation' | 'rejection' | 'cancellation' | 'reschedule',
  record: RawRecord,
) {
  const recipientEmail =
    stringValue(record.requestEmail) || stringValue(record.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return false
  }

  const content = buildCalendarNotificationEmail({
    kind,
    locale: localeValue(record.requesterLocale),
    name: stringValue(record.requestName) || stringValue(record.name),
    date: stringValue(record.date),
    startTime: stringValue(record.startTime),
    endTime: stringValue(record.endTime),
    location: stringValue(record.location),
    meetLink: stringValue(record.meetLink),
  })

  try {
    const send = dependencies.sendNotification ?? sendBrevoEmail
    await send(context.env, {
      recipientEmail,
      recipientName:
        stringValue(record.requestName) ||
        stringValue(record.name) ||
        'Meeting requester',
      ...content,
    })
    return true
  } catch (error) {
    console.error('Calendar notification failed:', {
      kind,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return false
  }
}

async function withDatabase(
  context: Context<AppEnv>,
  dependencies: PastorCalendarDependencies,
  operation: (
    database: FirebaseRealtimeDatabaseClient,
  ) => Promise<Response>,
) {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) {
      throw new FirebaseRealtimeDatabaseError(
        503,
        'Firebase Realtime Database is not configured.',
      )
    }
    const database = createFirebaseRealtimeDatabaseClient({
      databaseUrl,
      idToken: context.get('firebaseIdToken'),
      fetchImpl: dependencies.databaseFetch,
    })
    return await operation(database)
  } catch (error) {
    console.error('Pastor Calendar database operation failed:', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      upstreamStatus:
        error instanceof FirebaseRealtimeDatabaseError
          ? error.status
          : null,
    })
    if (
      error instanceof FirebaseRealtimeDatabaseError &&
      error.status === 401
    ) {
      return context.json(
        {
          success: false,
          error: {
            code: 'PASTOR_CALENDAR_DATABASE_ACCESS_DENIED',
            message: 'Firebase Rules denied Pastor Calendar access.',
          },
        },
        403,
      )
    }
    return context.json(
      {
        success: false,
        error: {
          code: 'PASTOR_CALENDAR_DATABASE_UNAVAILABLE',
          message: 'Pastor Calendar storage is temporarily unavailable.',
        },
      },
      error instanceof FirebaseRealtimeDatabaseError &&
        error.status === 503
        ? 503
        : 502,
    )
  }
}

async function readJsonBody(context: Context<AppEnv>) {
  try {
    return await context.req.json()
  } catch {
    return undefined
  }
}

function validationError(
  context: Context<AppEnv>,
  error: z.ZodError,
) {
  return context.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The Pastor Calendar request is invalid.',
        details: error.issues,
      },
    },
    400,
  )
}

function parseId(context: Context<AppEnv>, name: string) {
  const validation = pastorCalendarIdSchema.safeParse(
    context.req.param(name),
  )
  return validation.success ? validation.data : null
}

function safeId(value: unknown) {
  const validation = pastorCalendarIdSchema.safeParse(value)
  return validation.success ? validation.data : null
}

function invalidIdError(context: Context<AppEnv>) {
  return context.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A Pastor Calendar identifier is invalid.',
      },
    },
    400,
  )
}

function notFound(context: Context<AppEnv>, code: string) {
  return context.json(
    {
      success: false,
      error: { code, message: 'The requested calendar record was not found.' },
    },
    404,
  )
}

function calendarConflict(context: Context<AppEnv>) {
  return context.json(
    {
      success: false,
      error: {
        code: 'CALENDAR_CONFLICT',
        message: 'This time overlaps another meeting, booking request, group meeting, or blocked period.',
      },
    },
    409,
  )
}

function normalizeCollectionWithIds(collection: RawCollection) {
  if (!collection || typeof collection !== 'object') return []
  return Object.entries(collection).flatMap(([id, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    return [{ id, ...(value as RawRecord) }]
  })
}

function calendarCollectionEvents(
  collection: RawCollection,
  start: string,
  end: string,
  map: (id: string, record: RawRecord) => CalendarIcsEvent,
  include: (record: RawRecord) => boolean = () => true,
) {
  if (!collection || typeof collection !== 'object') return []
  return Object.entries(collection).flatMap(([id, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const record = value as RawRecord
    const date = stringValue(record.date)
    if (!include(record) || date < start || date > end) return []
    const event = map(id, record)
    if (!event.date || !event.startTime || !event.endTime) return []
    return [event]
  })
}

function actor(context: Context<AppEnv>) {
  const user = context.get('firebaseUser')
  return user.email?.trim().toLowerCase() || user.uid
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function localeValue(value: unknown): 'en' | 'ar' {
  return stringValue(value).trim().toLowerCase() === 'ar' ? 'ar' : 'en'
}

function prefixChanges(prefix: string, changes: RawRecord) {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [
      `${prefix}/${key}`,
      value,
    ]),
  )
}
