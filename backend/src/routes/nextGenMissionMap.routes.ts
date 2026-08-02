import { Hono, type Context } from 'hono'
import { z } from 'zod'

import {
  createFirebaseAuthMiddleware,
  type FirebaseTokenVerifier,
} from '../security/firebaseAuth'
import type { AppEnv } from '../types/app'

const NEXTGEN_EMAIL_PATTERN =
  /^nextgen@montreal\.ca$/i

const locationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(1).max(120),
    type: z.enum([
      'church',
      'evangelism',
      'home',
      'transit',
      'mall',
      'other',
    ]),
    address: z.string().trim().min(1).max(240),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    notes: z.string().trim().max(600).optional(),
    parking: z.string().trim().max(120).optional(),
    languages: z
      .array(z.string().trim().min(1).max(40))
      .max(10)
      .default([]),
  })
  .strict()

const connectionSchema = z
  .object({
    from: z.string().regex(/^[a-z0-9-]+$/),
    to: z.string().regex(/^[a-z0-9-]+$/),
    minutes: z.number().int().positive().max(240).optional(),
  })
  .strict()

const missionMapSchema = z
  .object({
    locations: z.array(locationSchema).min(1).max(100),
    connections: z.array(connectionSchema).max(200).default([]),
  })
  .strict()
  .superRefine((data, context) => {
    const locationIds = new Set(
      data.locations.map(location => location.id),
    )

    if (locationIds.size !== data.locations.length) {
      context.addIssue({
        code: 'custom',
        message: 'Location IDs must be unique.',
        path: ['locations'],
      })
    }

    data.connections.forEach((connection, index) => {
      if (
        !locationIds.has(connection.from) ||
        !locationIds.has(connection.to)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Connections must reference existing locations.',
          path: ['connections', index],
        })
      }
    })
  })

export type NextGenMissionMapDependencies = {
  verifyToken?: FirebaseTokenVerifier
}

export function createNextGenMissionMapRoutes(
  dependencies: NextGenMissionMapDependencies = {},
) {
  const routes = new Hono<AppEnv>()

  routes.use(
    '*',
    createFirebaseAuthMiddleware(
      dependencies.verifyToken,
    ),
  )

  routes.get('/', context => {
    const user = context.get('firebaseUser')
    const isAuthorized =
      user.email !== null &&
      NEXTGEN_EMAIL_PATTERN.test(user.email.trim()) &&
      user.signInProvider === 'password'

    if (!isAuthorized) {
      return context.json(
        {
          success: false,
          error: {
            code: 'NEXTGEN_MISSION_MAP_ACCESS_REQUIRED',
            message:
              'The Montréal Mission Trip login is required.',
          },
        },
        403,
      )
    }

    const rawMapData =
      context.env.NEXTGEN_MISSION_MAP_DATA?.trim()

    if (!rawMapData) {
      return mapConfigurationError(context)
    }

    let parsedMapData: unknown

    try {
      parsedMapData = JSON.parse(rawMapData)
    } catch {
      return mapConfigurationError(context)
    }

    const validation = missionMapSchema.safeParse(
      parsedMapData,
    )

    if (!validation.success) {
      console.error(
        'NextGen mission-map configuration is invalid:',
        {
          issueCount: validation.error.issues.length,
        },
      )

      return mapConfigurationError(context)
    }

    context.header(
      'Cache-Control',
      'private, no-store, max-age=0',
    )

    return context.json({
      success: true,
      data: validation.data,
    })
  })

  return routes
}

function mapConfigurationError(
  context: Context<AppEnv>,
) {
  return context.json(
    {
      success: false,
      error: {
        code: 'NEXTGEN_MISSION_MAP_UNAVAILABLE',
        message:
          'The Montréal Mission Trip map is not configured.',
      },
    },
    503,
  )
}
