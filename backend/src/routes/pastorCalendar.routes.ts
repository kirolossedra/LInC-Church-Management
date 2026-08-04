import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import { buildCalendarNotificationEmail } from '../emails/calendarNotification.email'
import { normalizePastorCalendarSnapshot } from '../pastorCalendar/pastorCalendar.normalize'
import {
  firebasePushResponseSchema,
  meetingRequestDecisionSchema,
  pastorCalendarBlockSchema,
  pastorCalendarIdSchema,
  pastorMeetingSchema,
} from '../schemas/pastorCalendar.schema'
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
      const [meetings, meetingRequests, availability, unavailability] =
        await Promise.all([
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(REQUESTS_PATH),
          database.get<RawCollection>(AVAILABILITY_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
        ])

      context.header('Cache-Control', 'private, no-store, max-age=0')
      return context.json({
        success: true,
        data: normalizePastorCalendarSnapshot({
          meetings,
          meetingRequests,
          availability,
          unavailability,
        }),
      })
    }),
  )

  routes.post('/meetings', async context => {
    const validation = pastorMeetingSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const result = await database.post<unknown>(MEETINGS_PATH, {
        ...validation.data,
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
      const detailsChanged =
        stringValue(existing.date) !== validation.data.date ||
        stringValue(existing.startTime) !== validation.data.startTime ||
        stringValue(existing.endTime) !== validation.data.endTime ||
        stringValue(existing.location) !== validation.data.location ||
        stringValue(existing.meetLink) !== validation.data.meetLink

      const meetingChanges: RawRecord = {
        ...validation.data,
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
      const sourceRequestId = safeId(existing.sourceRequestId)
      if (sourceRequestId) {
        Object.assign(
          rootChanges,
          prefixChanges(`meetingRequests/${sourceRequestId}`, {
            date: validation.data.date,
            startTime: validation.data.startTime,
            endTime: validation.data.endTime,
            updatedAt: timestamp,
          }),
        )
      }

      await database.patch([], rootChanges)
      return context.json({ success: true, data: { updated: true } })
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

      await database.delete([...MEETINGS_PATH, meetingId])
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
        if (validation.data.decision === 'rejected') {
          await database.patch([...REQUESTS_PATH, requestId], {
            status: 'rejected',
            updatedAt: timestamp,
            updatedBy: actor(context),
          })
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
          acknowledged: true,
          acknowledgedAt: timestamp,
          acknowledgedEmail: stringValue(request.email),
          createdAt: timestamp,
          updatedAt: timestamp,
          updatedBy: actor(context),
        }

        await database.patch([], {
          [`meetings/${meetingId}`]: meeting,
          [`meetingRequests/${requestId}/status`]: 'accepted',
          [`meetingRequests/${requestId}/createdMeetingId`]: meetingId,
          [`meetingRequests/${requestId}/acceptedAt`]: timestamp,
          [`meetingRequests/${requestId}/updatedAt`]: timestamp,
          [`meetingRequests/${requestId}/updatedBy`]: actor(context),
        })

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
      const result = await database.post<unknown>(path, {
        ...validation.data,
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
      await database.patch([...path, blockId], {
        ...validation.data,
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
  kind: 'confirmation' | 'rejection' | 'cancellation',
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
