import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import { normalizePeopleNotes } from '../peopleNotes/peopleNotes.normalize'
import {
  createDevelopmentCommentSchema,
  createDevelopmentItemSchema,
  createPersonSchema,
  firebasePushResponseSchema,
  peopleNotesIdSchema,
  updateFollowUpDateSchema,
} from '../schemas/peopleNotes.schema'
import {
  createFirebaseAuthMiddleware,
  type FirebaseTokenVerifier,
} from '../security/firebaseAuth'
import { requirePastorAccess } from '../security/pastorAuthorization'
import {
  createFirebaseRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv } from '../types/app'

const PEOPLE_NOTES_PATH = ['peopleNotes'] as const

export type PeopleNotesDependencies = {
  verifyToken?: FirebaseTokenVerifier
  fetchImpl?: FirebaseDatabaseFetch
  now?: () => number
}

export function createPeopleNotesRoutes(
  dependencies: PeopleNotesDependencies = {},
) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now

  routes.use(
    '*',
    createFirebaseAuthMiddleware(dependencies.verifyToken),
  )
  routes.use('*', requirePastorAccess())

  routes.get('/', context =>
    withDatabase(context, dependencies, async database => {
      const rawPeople = await database.get(PEOPLE_NOTES_PATH)

      context.header('Cache-Control', 'private, no-store, max-age=0')
      return context.json({
        success: true,
        data: {
          people: normalizePeopleNotes(rawPeople),
        },
      })
    }),
  )

  routes.post('/', async context => {
    const validation = createPersonSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(
      context,
      dependencies,
      async database => {
        const timestamp = now()
        const createdBy = getActor(context)
        const result = await database.post<unknown>(
          PEOPLE_NOTES_PATH,
          {
            ...validation.data,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy,
          },
        )
        const pushResult = parsePushResult(result)

        return context.json(
          {
            success: true,
            data: { id: pushResult.name },
          },
          201,
        )
      },
    )
  })

  routes.post('/:personId/items', async context => {
    const personId = parseId(context, 'personId')
    if (!personId) return invalidIdError(context)

    const validation = createDevelopmentItemSchema.safeParse(
      await readJsonBody(context),
    )
    if (!validation.success) {
      return validationError(context, validation.error)
    }

    return withDatabase(
      context,
      dependencies,
      async database => {
        const timestamp = now()
        const result = await database.post<unknown>(
          [...PEOPLE_NOTES_PATH, personId, 'items'],
          {
            ...validation.data,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: getActor(context),
          },
        )
        const pushResult = parsePushResult(result)

        await database.patch(
          [...PEOPLE_NOTES_PATH, personId],
          { updatedAt: timestamp },
        )

        return context.json(
          {
            success: true,
            data: { id: pushResult.name },
          },
          201,
        )
      },
    )
  })

  routes.post(
    '/:personId/items/:itemId/comments',
    async context => {
      const personId = parseId(context, 'personId')
      const itemId = parseId(context, 'itemId')
      if (!personId || !itemId) return invalidIdError(context)

      const validation = createDevelopmentCommentSchema.safeParse(
        await readJsonBody(context),
      )
      if (!validation.success) {
        return validationError(context, validation.error)
      }

      return withDatabase(
        context,
        dependencies,
        async database => {
          const timestamp = now()
          const result = await database.post<unknown>(
            [
              ...PEOPLE_NOTES_PATH,
              personId,
              'items',
              itemId,
              'comments',
            ],
            {
              text: validation.data.text,
              createdAt: timestamp,
              createdBy: getActor(context),
            },
          )
          const pushResult = parsePushResult(result)

          await database.patch(
            [...PEOPLE_NOTES_PATH, personId],
            {
              [`items/${itemId}/updatedAt`]: timestamp,
              updatedAt: timestamp,
            },
          )

          return context.json(
            {
              success: true,
              data: { id: pushResult.name },
            },
            201,
          )
        },
      )
    },
  )

  routes.patch(
    '/:personId/items/:itemId/follow-up',
    async context => {
      const personId = parseId(context, 'personId')
      const itemId = parseId(context, 'itemId')
      if (!personId || !itemId) return invalidIdError(context)

      const validation = updateFollowUpDateSchema.safeParse(
        await readJsonBody(context),
      )
      if (!validation.success) {
        return validationError(context, validation.error)
      }

      return withDatabase(
        context,
        dependencies,
        async database => {
          const timestamp = now()

          await database.patch(
            [...PEOPLE_NOTES_PATH, personId],
            {
              [`items/${itemId}/latestFollowUpDate`]:
                validation.data.latestFollowUpDate,
              [`items/${itemId}/updatedAt`]: timestamp,
              updatedAt: timestamp,
            },
          )

          return context.json({
            success: true,
            data: { updated: true },
          })
        },
      )
    },
  )

  routes.delete('/:personId', async context => {
    const personId = parseId(context, 'personId')
    if (!personId) return invalidIdError(context)

    return withDatabase(
      context,
      dependencies,
      async database => {
        await database.delete([
          ...PEOPLE_NOTES_PATH,
          personId,
        ])

        return context.json({
          success: true,
          data: { deleted: true },
        })
      },
    )
  })

  routes.delete(
    '/:personId/items/:itemId',
    async context => {
      const personId = parseId(context, 'personId')
      const itemId = parseId(context, 'itemId')
      if (!personId || !itemId) return invalidIdError(context)

      return withDatabase(
        context,
        dependencies,
        async database => {
          const timestamp = now()

          await database.patch(
            [...PEOPLE_NOTES_PATH, personId],
            {
              [`items/${itemId}`]: null,
              updatedAt: timestamp,
            },
          )

          return context.json({
            success: true,
            data: { deleted: true },
          })
        },
      )
    },
  )

  routes.delete(
    '/:personId/items/:itemId/comments/:commentId',
    async context => {
      const personId = parseId(context, 'personId')
      const itemId = parseId(context, 'itemId')
      const commentId = parseId(context, 'commentId')
      if (!personId || !itemId || !commentId) {
        return invalidIdError(context)
      }

      return withDatabase(
        context,
        dependencies,
        async database => {
          const timestamp = now()

          await database.patch(
            [...PEOPLE_NOTES_PATH, personId],
            {
              [`items/${itemId}/comments/${commentId}`]: null,
              [`items/${itemId}/updatedAt`]: timestamp,
              updatedAt: timestamp,
            },
          )

          return context.json({
            success: true,
            data: { deleted: true },
          })
        },
      )
    },
  )

  return routes
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

function parseId(
  context: Context<AppEnv>,
  name: string,
): string | null {
  const validation = peopleNotesIdSchema.safeParse(
    context.req.param(name),
  )
  return validation.success ? validation.data : null
}

function getActor(context: Context<AppEnv>): string {
  const user = context.get('firebaseUser')
  return user.email?.trim().toLowerCase() || user.uid
}

function parsePushResult(value: unknown) {
  const validation = firebasePushResponseSchema.safeParse(value)

  if (!validation.success) {
    throw new FirebaseRealtimeDatabaseError(
      502,
      'Firebase did not return a generated ID.',
    )
  }

  return validation.data
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
        message: 'The People Notes request is invalid.',
        details: error.issues,
      },
    },
    400,
  )
}

function invalidIdError(context: Context<AppEnv>) {
  return context.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A People Notes identifier is invalid.',
      },
    },
    400,
  )
}

async function withDatabase(
  context: Context<AppEnv>,
  dependencies: PeopleNotesDependencies,
  operation: (
    database: FirebaseRealtimeDatabaseClient,
  ) => Promise<Response>,
): Promise<Response> {
  try {
    const databaseUrl =
      context.env.FIREBASE_DATABASE_URL?.trim()

    if (!databaseUrl) {
      throw new FirebaseRealtimeDatabaseError(
        503,
        'Firebase Realtime Database is not configured.',
      )
    }

    const database = createFirebaseRealtimeDatabaseClient({
      databaseUrl,
      idToken: context.get('firebaseIdToken'),
      fetchImpl: dependencies.fetchImpl,
    })

    return await operation(database)
  } catch (error) {
    console.error('People Notes database operation failed:', {
      errorName:
        error instanceof Error ? error.name : 'UnknownError',
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
            code: 'PEOPLE_NOTES_DATABASE_ACCESS_DENIED',
            message:
              'Firebase Rules denied access to People Notes.',
          },
        },
        403,
      )
    }

    if (
      error instanceof FirebaseRealtimeDatabaseError &&
      (error.status === 404 || error.status === 503)
    ) {
      return context.json(
        {
          success: false,
          error: {
            code: 'PEOPLE_NOTES_DATABASE_UNAVAILABLE',
            message:
              'People Notes storage is temporarily unavailable.',
          },
        },
        503,
      )
    }

    return context.json(
      {
        success: false,
        error: {
          code: 'PEOPLE_NOTES_DATABASE_REQUEST_FAILED',
          message:
            'The People Notes database request failed.',
        },
      },
      502,
    )
  }
}
