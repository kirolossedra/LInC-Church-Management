import { Hono, type Context } from 'hono'
import { z } from 'zod'

import {
  ADMIN_HIERARCHY_PATH,
  EMPTY_ADMIN_AUTHORITY,
  FULL_ADMIN_AUTHORITY,
  getAdminAccount,
  normalizeAdminAccount,
  type AdminAccount,
} from '../admin/adminAuthorization'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { isPastorUser } from '../security/pastorAuthorization'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const authoritySchema = z.object({
  manageAssessmentForms: z.boolean(),
  manageCarousel: z.boolean(),
  manageAttendance: z.boolean(),
}).strict().refine(value => Object.values(value).some(Boolean), {
  message: 'At least one administrator authority is required.',
})
const uidSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)

export type AdminDependencies = {
  verifyToken?: FirebaseTokenVerifier
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  now?: () => number
}

export function createAdminRoutes(dependencies: AdminDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now
  routes.use('*', createFirebaseAuthMiddleware(dependencies.verifyToken))

  routes.get('/session', context => withDatabase(context, dependencies, async database => {
    const user = context.get('firebaseUser')
    const timestamp = now()
    let chiefUid = await database.get<string>([...ADMIN_HIERARCHY_PATH, 'chiefUid'])
    let account = await getAdminAccount(database, user.uid)

    if (!chiefUid && isPastorUser(user)) {
      chiefUid = user.uid
      await database.patch(ADMIN_HIERARCHY_PATH, { chiefUid })
    }

    if (!account) {
      const isChief = chiefUid === user.uid
      account = {
        uid: user.uid,
        email: user.email?.trim().toLowerCase() || '',
        role: isChief ? 'chief' : 'administrator',
        status: isChief ? 'active' : 'pending',
        authority: isChief ? { ...FULL_ADMIN_AUTHORITY } : { ...EMPTY_ADMIN_AUTHORITY },
        firstSignedInAt: timestamp,
        lastSignedInAt: timestamp,
        updatedAt: timestamp,
        ...(isChief ? { approvedAt: timestamp, approvedByUid: user.uid } : {}),
      }
      await database.patch([...ADMIN_HIERARCHY_PATH, 'users', user.uid], account)
    } else {
      const isChief = chiefUid === user.uid
      await database.patch([...ADMIN_HIERARCHY_PATH, 'users', user.uid], {
        email: user.email?.trim().toLowerCase() || account.email,
        lastSignedInAt: timestamp,
        updatedAt: timestamp,
        ...(isChief ? {
          role: 'chief',
          status: 'active',
          authority: FULL_ADMIN_AUTHORITY,
        } : {}),
      })
      account = { ...account, lastSignedInAt: timestamp, updatedAt: timestamp }
      if (isChief) account = { ...account, role: 'chief', status: 'active', authority: { ...FULL_ADMIN_AUTHORITY } }
    }

    const adminAccounts = account.role === 'chief'
      ? normalizeAccounts(await database.get([...ADMIN_HIERARCHY_PATH, 'users']))
      : []
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return context.json({ success: true, data: { account, adminAccounts } })
  }))

  routes.patch('/users/:uid/authority', async context => {
    const uid = uidSchema.safeParse(context.req.param('uid'))
    const body = authoritySchema.safeParse(await readJson(context))
    if (!uid.success || !body.success) return validationError(context)
    return withChief(context, dependencies, async (database, chief) => {
      const target = await getAdminAccount(database, uid.data)
      if (!target || target.role === 'chief') return notFound(context)
      const timestamp = now()
      await database.patch([...ADMIN_HIERARCHY_PATH, 'users', uid.data], {
        role: 'administrator', status: 'active', authority: body.data,
        approvedAt: timestamp, approvedByUid: chief.uid, updatedAt: timestamp,
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.patch('/users/:uid/suspend', context => {
    const uid = uidSchema.safeParse(context.req.param('uid'))
    if (!uid.success) return validationError(context)
    return withChief(context, dependencies, async database => {
      const target = await getAdminAccount(database, uid.data)
      if (!target || target.role === 'chief') return notFound(context)
      await database.patch([...ADMIN_HIERARCHY_PATH, 'users', uid.data], {
        status: 'suspended', authority: EMPTY_ADMIN_AUTHORITY, updatedAt: now(),
      })
      return context.json({ success: true, data: { suspended: true } })
    })
  })

  return routes
}

async function withChief(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient, chief: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    const account = await getAdminAccount(database, context.get('firebaseUser').uid)
    if (!account || account.role !== 'chief') {
      return context.json({ success: false, error: { code: 'CHIEF_ACCESS_REQUIRED', message: 'Chief administrator access is required.' } }, 403)
    }
    return operation(database, account)
  })
}

async function withDatabase(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>,
) {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) throw new Error('Firebase database URL is missing.')
    const getAccessToken = dependencies.getAccessToken ?? (bindings => getFirebaseServiceAccountAccessToken(bindings))
    const token = await getAccessToken(context.env)
    const database = createFirebaseAdminRealtimeDatabaseClient({
      databaseUrl, getAccessToken: async () => token, fetchImpl: dependencies.databaseFetch,
    })
    return await operation(database)
  } catch (error) {
    console.error('Admin database operation failed:', error instanceof Error ? error.name : 'UnknownError')
    return context.json({ success: false, error: { code: 'ADMIN_DATABASE_UNAVAILABLE', message: 'Administrator storage is temporarily unavailable.' } }, 503)
  }
}

function normalizeAccounts(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .map(([uid, account]) => normalizeAdminAccount(uid, account))
    .filter((account): account is AdminAccount => account !== null)
    .sort((a, b) => a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'chief' ? -1 : 1)
}

async function readJson(context: Context<AppEnv>) {
  try { return await context.req.json() } catch { return undefined }
}
function validationError(context: Context<AppEnv>) {
  return context.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The administrator request is invalid.' } }, 400)
}
function notFound(context: Context<AppEnv>) {
  return context.json({ success: false, error: { code: 'ADMIN_NOT_FOUND', message: 'The administrator account was not found.' } }, 404)
}

