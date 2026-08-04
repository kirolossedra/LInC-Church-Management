import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import {
  buildPublicBookingSchedule,
  isBookingSlotAvailable,
} from '../booking/booking.service'
import { buildBookingRequestEmail } from '../emails/bookingRequest.email'
import {
  bookingScheduleQuerySchema,
  createBookingRequestSchema,
  firebasePushResponseSchema,
} from '../schemas/booking.schema'
import {
  FirebaseServiceAccountError,
  getFirebaseServiceAccountAccessToken,
} from '../security/firebaseServiceAccount'
import {
  sendBrevoEmail,
  type BrevoEmailResult,
} from '../services/brevo.service'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const AVAILABILITY_PATH = ['availability'] as const
const UNAVAILABILITY_PATH = ['unavailability'] as const
const MEETINGS_PATH = ['meetings'] as const
const MEETING_REQUESTS_PATH = ['meetingRequests'] as const

type RawCollection = Record<string, unknown> | null

export type BookingDependencies = {
  getAccessToken?: (
    bindings: FirebaseBindings,
  ) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  sendNotification?: (
    bindings: AppEnv['Bindings'],
    email: Parameters<typeof sendBrevoEmail>[1],
  ) => Promise<BrevoEmailResult>
  now?: () => number
}

export function createBookingRoutes(
  dependencies: BookingDependencies = {},
) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now

  routes.get('/schedule', async context => {
    const validation = bookingScheduleQuerySchema.safeParse({
      start: context.req.query('start'),
      end: context.req.query('end'),
    })

    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(context, dependencies, async database => {
      const [availability, unavailability, meetings, meetingRequests] =
        await Promise.all([
          database.get<RawCollection>(AVAILABILITY_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(MEETING_REQUESTS_PATH),
        ])

      context.header('Cache-Control', 'public, max-age=15')
      return context.json({
        success: true,
        data: buildPublicBookingSchedule({
          availability,
          unavailability,
          meetings,
          meetingRequests,
          start: validation.data.start,
          end: validation.data.end,
        }),
      })
    })
  })

  routes.post('/requests', async context => {
    const validation = createBookingRequestSchema.safeParse(
      await readJsonBody(context),
    )

    if (!validation.success) {
      return validationError(context, validation.error)
    }

    const request = validation.data
    const timestamp = now()

    if (request.date < dateInToronto(timestamp)) {
      return context.json(
        {
          success: false,
          error: {
            code: 'BOOKING_DATE_PASSED',
            message: 'The selected booking date has passed.',
          },
        },
        409,
      )
    }

    return withDatabase(context, dependencies, async database => {
      const [availability, unavailability, meetings, meetingRequests] =
        await Promise.all([
          database.get<RawCollection>(AVAILABILITY_PATH),
          database.get<RawCollection>(UNAVAILABILITY_PATH),
          database.get<RawCollection>(MEETINGS_PATH),
          database.get<RawCollection>(MEETING_REQUESTS_PATH),
        ])

      if (
        !isBookingSlotAvailable({
          date: request.date,
          startTime: request.startTime,
          endTime: request.endTime,
          availability,
          unavailability,
          meetings,
          meetingRequests,
        })
      ) {
        return context.json(
          {
            success: false,
            error: {
              code: 'BOOKING_SLOT_UNAVAILABLE',
              message:
                'The selected time is no longer available.',
            },
          },
          409,
        )
      }

      const storedRequest = {
        name: request.name,
        email: request.email,
        date: request.date,
        startTime: request.startTime,
        endTime: request.endTime,
        reason: request.reason,
        requesterLocale: request.requesterLocale,
        requesterLanguage:
          request.requesterLocale === 'ar' ? 'Arabic' : 'English',
        status: 'pending',
        source: 'hono-public-booking',
        createdAt: timestamp,
        createdAtISO: new Date(timestamp).toISOString(),
        updatedAt: timestamp,
      }

      const postResult = await database.post<unknown>(
        MEETING_REQUESTS_PATH,
        storedRequest,
      )
      const parsedPushResult =
        firebasePushResponseSchema.safeParse(postResult)

      if (!parsedPushResult.success) {
        throw new FirebaseRealtimeDatabaseError(
          502,
          'Firebase did not return a booking request ID.',
        )
      }

      const notificationSent = await notifyPastor(
        context,
        dependencies,
        request,
      )

      return context.json(
        {
          success: true,
          data: {
            id: parsedPushResult.data.name,
            status: 'pending',
            notificationSent,
          },
        },
        201,
      )
    })
  })

  return routes
}

async function notifyPastor(
  context: Context<AppEnv>,
  dependencies: BookingDependencies,
  request: z.infer<typeof createBookingRequestSchema>,
): Promise<boolean> {
  const recipientEmail =
    context.env.BOOKING_NOTIFICATION_EMAIL?.trim() ||
    'rev.ibrahim@lincministry.com'
  const email = buildBookingRequestEmail({
    ...request,
    locale: request.requesterLocale,
  })

  try {
    const sendNotification =
      dependencies.sendNotification ?? sendBrevoEmail
    await sendNotification(context.env, {
      recipientEmail,
      recipientName: 'Pastor Ibrahim',
      ...email,
    })
    return true
  } catch (error) {
    console.error('Booking request notification failed:', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return false
  }
}

async function withDatabase(
  context: Context<AppEnv>,
  dependencies: BookingDependencies,
  operation: (
    database: FirebaseRealtimeDatabaseClient,
  ) => Promise<Response>,
): Promise<Response> {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) {
      throw new FirebaseRealtimeDatabaseError(
        503,
        'Firebase Realtime Database is not configured.',
      )
    }

    const getAccessToken =
      dependencies.getAccessToken ??
      (bindings => getFirebaseServiceAccountAccessToken(bindings))
    const accessToken = await getAccessToken(context.env)
    const database = createFirebaseAdminRealtimeDatabaseClient({
      databaseUrl,
      getAccessToken: async () => accessToken,
      fetchImpl: dependencies.databaseFetch,
    })

    return await operation(database)
  } catch (error) {
    console.error('Booking database operation failed:', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      upstreamStatus:
        error instanceof FirebaseRealtimeDatabaseError
          ? error.status
          : null,
    })

    if (error instanceof FirebaseServiceAccountError) {
      return context.json(
        {
          success: false,
          error: {
            code: 'BOOKING_SERVER_AUTH_UNAVAILABLE',
            message: 'Booking storage authentication is unavailable.',
          },
        },
        503,
      )
    }

    if (
      error instanceof FirebaseRealtimeDatabaseError &&
      (error.status === 401 || error.status === 403)
    ) {
      return context.json(
        {
          success: false,
          error: {
            code: 'BOOKING_DATABASE_ACCESS_DENIED',
            message: 'Booking storage denied the server request.',
          },
        },
        503,
      )
    }

    return context.json(
      {
        success: false,
        error: {
          code: 'BOOKING_DATABASE_UNAVAILABLE',
          message: 'Booking storage is temporarily unavailable.',
        },
      },
      error instanceof FirebaseRealtimeDatabaseError &&
        error.status === 503
        ? 503
        : 502,
    )
  }
}

async function readJsonBody(
  context: Context<AppEnv>,
): Promise<unknown> {
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
        message: 'The booking request is invalid.',
        details: error.issues,
      },
    },
    400,
  )
}

function dateInToronto(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}
