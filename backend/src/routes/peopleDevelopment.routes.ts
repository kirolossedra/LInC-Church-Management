import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import {
  asRecord,
  extractResponseValue,
  normalizeAssignments,
  normalizeGroup,
  normalizeMembers,
  normalizePersonalNotes,
  normalizeSchedules,
  safeFirebaseKey,
} from '../peopleDevelopment/peopleDevelopment.normalize'
import {
  assignMemberSchema,
  createAssignmentSchema,
  createPersonalNoteSchema,
  createScheduleSchema,
  firebasePushResponseSchema,
  idSchema,
  portalAccessSchema,
  replaceAssignmentAttachmentsSchema,
  updateScheduleSchema,
} from '../schemas/peopleDevelopment.schema'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { FirebaseServiceAccountError, getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { requirePastorAccess } from '../security/pastorAuthorization'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const ROOT = ['peopleDevelopment'] as const
const MEMBERS = [...ROOT, 'members'] as const
const ASSIGNMENTS = [...ROOT, 'assignments'] as const
const PERSONAL_NOTES = [...ROOT, 'personalNotes'] as const
const SCHEDULES = [...ROOT, 'meetingSchedules'] as const

export type PeopleDevelopmentDependencies = {
  verifyToken?: FirebaseTokenVerifier
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  now?: () => number
  checkPortalRateLimit?: (clientKey: string, timestamp: number) => {
    allowed: boolean
    retryAfterSeconds: number
  }
}

export function createPeopleDevelopmentRoutes(dependencies: PeopleDevelopmentDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now
  const checkPortalRateLimit = dependencies.checkPortalRateLimit ?? createPortalRateLimiter()

  routes.post('/portal', async context => {
    const validation = portalAccessSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    const rateLimit = checkPortalRateLimit(getPortalClientKey(context), now())
    if (!rateLimit.allowed) {
      context.header('Retry-After', String(rateLimit.retryAfterSeconds))
      return context.json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many access attempts. Please try again later.' },
      }, 429)
    }

    return withDatabase(context, dependencies, async database => {
      const member = await findPortalMember(database, validation.data.identifier)
      if (!member) {
        return context.json({
          success: false,
          error: { code: 'GROUP_ACCESS_NOT_FOUND', message: 'The identifier could not be authorized.' },
        }, 404)
      }
      if (!member.group) {
        context.header('Cache-Control', 'private, no-store, max-age=0')
        return context.json({ success: true, data: { profile: member, assignments: [], schedules: [] } })
      }
      const memberGroup = member.group

      const [rawAssignments, rawSchedules] = await Promise.all([
        database.get(ASSIGNMENTS),
        database.get(SCHEDULES),
      ])
      const assignments = normalizeAssignments(rawAssignments)
        .filter(entry => entry.groups.includes(memberGroup))
      const schedules = normalizeSchedules(rawSchedules)
        .filter(schedule => schedule.active && (schedule.audience === 'shared' || schedule.group === memberGroup))

      context.header('Cache-Control', 'private, no-store, max-age=0')
      return context.json({ success: true, data: { profile: member, assignments, schedules } })
    })
  })

  const pastor = new Hono<AppEnv>()
  pastor.use('*', createFirebaseAuthMiddleware(dependencies.verifyToken))
  pastor.use('*', requirePastorAccess())

  pastor.get('/snapshot', context => withDatabase(context, dependencies, async database => {
    const [members, assignments, personalNotes, schedules] = await Promise.all([
      database.get(MEMBERS), database.get(ASSIGNMENTS), database.get(PERSONAL_NOTES), database.get(SCHEDULES),
    ])
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return context.json({ success: true, data: {
      members: normalizeMembers(members),
      assignments: normalizeAssignments(assignments),
      personalNotes: normalizePersonalNotes(personalNotes),
      schedules: normalizeSchedules(schedules),
    } })
  }))

  pastor.patch('/members/:memberKey/group', async context => {
    const memberKey = parseId(context, 'memberKey')
    if (!memberKey) return invalidId(context)
    const validation = assignMemberSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)

    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const timestampISO = new Date(timestamp).toISOString()
      const input = validation.data
      const sourceKeys = Array.from(new Set(input.sourceKeys))
      const updates: Record<string, unknown> = {
        [`peopleDevelopment/members/${memberKey}`]: {
          memberKey,
          identifier: input.identifier,
          fullName: input.fullName,
          email: input.email,
          primaryGift: input.primaryGift,
          group: input.group,
          groupLabel: input.groupLabel,
          sourcePath: input.sourcePath,
          sourceKeys,
          updatedAt: timestamp,
          updatedAtISO: timestampISO,
        },
      }
      for (const sourceKey of sourceKeys) {
        const prefix = `${input.sourcePath}/${sourceKey}`
        updates[`${prefix}/peopleDevelopmentGroup`] = input.group
        updates[`${prefix}/peopleDevelopment`] = {
          group: input.group, groupLabel: input.groupLabel, memberKey,
          identifier: input.identifier, updatedAt: timestamp, updatedAtISO: timestampISO,
        }
        updates[`${prefix}/fields/peopleDevelopment/group`] = {
          fieldEnglish: 'People Development Group', fieldArabic: 'مجموعة نمو الأشخاص',
          value: input.group, label: input.groupLabel, updatedAt: timestamp, updatedAtISO: timestampISO,
        }
      }
      await database.patch([], updates)
      return context.json({ success: true, data: { updated: true } })
    })
  })

  pastor.post('/assignments', async context => {
    const validation = createAssignmentSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const groups = Array.from(new Set(validation.data.groups))
      const record = {
        group: groups[0], groups, groupLabel: validation.data.groupLabel,
        text: validation.data.text, date: torontoDateKey(timestamp),
        createdAt: timestamp, createdAtISO: new Date(timestamp).toISOString(),
        updatedAt: timestamp, updatedAtISO: new Date(timestamp).toISOString(),
        attachments: validation.data.attachments,
        hasAttachments: validation.data.attachments.length > 0,
        source: validation.data.source,
      }
      const result = firebasePushResponseSchema.safeParse(await database.post(ASSIGNMENTS, record))
      if (!result.success) throw new FirebaseRealtimeDatabaseError(502, 'Firebase did not return an assignment ID.')
      return context.json({ success: true, data: { id: result.data.name, assignment: { id: result.data.name, ...record } } }, 201)
    })
  })

  pastor.patch('/assignments/:assignmentId/attachments', async context => {
    const id = parseId(context, 'assignmentId')
    if (!id) return invalidId(context)
    const validation = replaceAssignmentAttachmentsSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      await database.patch([...ASSIGNMENTS, id], {
        attachments: validation.data.attachments,
        hasAttachments: validation.data.attachments.length > 0,
        updatedAt: timestamp,
        updatedAtISO: new Date(timestamp).toISOString(),
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  pastor.delete('/assignments/:assignmentId', context => deleteById(context, dependencies, ASSIGNMENTS, 'assignmentId'))

  pastor.post('/personal-notes', async context => {
    const validation = createPersonalNoteSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const record = { ...validation.data, date: torontoDateKey(timestamp), createdAt: timestamp, createdAtISO: new Date(timestamp).toISOString() }
      const result = firebasePushResponseSchema.safeParse(await database.post(PERSONAL_NOTES, record))
      if (!result.success) throw new FirebaseRealtimeDatabaseError(502, 'Firebase did not return a note ID.')
      return context.json({ success: true, data: { id: result.data.name, note: { id: result.data.name, ...record } } }, 201)
    })
  })

  pastor.delete('/personal-notes/:noteId', context => deleteById(context, dependencies, PERSONAL_NOTES, 'noteId'))

  pastor.post('/schedules', async context => {
    const validation = createScheduleSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const draft = { ...validation.data, group: validation.data.audience === 'shared' ? '' : validation.data.group }
      const record = { ...draft, createdAt: timestamp, createdAtISO: new Date(timestamp).toISOString(), updatedAt: timestamp, updatedAtISO: new Date(timestamp).toISOString() }
      const result = firebasePushResponseSchema.safeParse(await database.post(SCHEDULES, record))
      if (!result.success) throw new FirebaseRealtimeDatabaseError(502, 'Firebase did not return a schedule ID.')
      return context.json({ success: true, data: { id: result.data.name, schedule: { id: result.data.name, ...record } } }, 201)
    })
  })

  pastor.patch('/schedules/:scheduleId', async context => {
    const id = parseId(context, 'scheduleId')
    if (!id) return invalidId(context)
    const validation = updateScheduleSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const timestamp = now()
      const updates = { ...validation.data, ...(validation.data.audience === 'shared' ? { group: '' } : {}), updatedAt: timestamp, updatedAtISO: new Date(timestamp).toISOString() }
      await database.patch([...SCHEDULES, id], updates)
      return context.json({ success: true, data: { updated: true } })
    })
  })

  pastor.delete('/schedules/:scheduleId', context => deleteById(context, dependencies, SCHEDULES, 'scheduleId'))
  routes.route('/pastor', pastor)
  return routes
}

async function findPortalMember(database: FirebaseRealtimeDatabaseClient, identifier: string) {
  const normalized = identifier.trim().toLowerCase()
  const directKey = `identifier_${safeFirebaseKey(normalized)}`
  const direct = await database.get([...MEMBERS, directKey])
  let memberKey = directKey
  let raw = direct

  if (!raw) {
    const members = asRecord(await database.get(MEMBERS))
    const match = Object.entries(members).find(([, value]) => String(asRecord(value).identifier || '').trim().toLowerCase() === normalized)
    if (match) [memberKey, raw] = match
  }

  if (!raw) {
    const forms = asRecord(await database.get(['form']))
    const match = Object.entries(forms).find(([, value]) => extractResponseValue(value, ['userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId']).trim().toLowerCase() === normalized)
    if (match) {
      const [formId, form] = match
      const record = asRecord(form)
      const group = normalizeGroup(extractResponseValue(record, ['peopleDevelopmentGroup', 'group']))
      return {
        memberKey: directKey,
        identifier: identifier.trim(),
        fullName: extractResponseValue(record, ['fullName', 'full_name', 'name', 'firstName', 'lastName']),
        email: extractResponseValue(record, ['email', 'emailAddress', 'userEmail']),
        primaryGift: '', group, groupLabel: '', sourcePath: 'form', sourceKeys: [formId],
      }
    }
  }

  if (!raw) return null
  const member = asRecord(raw)
  return {
    memberKey,
    identifier: String(member.identifier || identifier).trim(),
    fullName: String(member.fullName || member.name || '').trim(),
    email: String(member.email || '').trim(),
    primaryGift: String(member.primaryGift || '').trim(),
    group: normalizeGroup(member.group),
    groupLabel: String(member.groupLabel || '').trim(),
    sourcePath: String(member.sourcePath || 'form').trim(),
    sourceKeys: Array.isArray(member.sourceKeys) ? member.sourceKeys.map(String) : [],
  }
}

async function deleteById(context: Context<AppEnv>, dependencies: PeopleDevelopmentDependencies, path: readonly string[], param: string) {
  const id = parseId(context, param)
  if (!id) return invalidId(context)
  return withDatabase(context, dependencies, async database => {
    await database.delete([...path, id])
    return context.json({ success: true, data: { deleted: true } })
  })
}

async function readJson(context: Context<AppEnv>) { try { return await context.req.json() } catch { return undefined } }
function parseId(context: Context<AppEnv>, name: string) { const result = idSchema.safeParse(context.req.param(name)); return result.success ? result.data : null }
function invalidId(context: Context<AppEnv>) { return context.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A People Development identifier is invalid.' } }, 400) }
function validationError(context: Context<AppEnv>, error: z.ZodError) { return context.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The People Development request is invalid.', details: error.issues } }, 400) }
function torontoDateKey(timestamp: number) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp)) }

function getPortalClientKey(context: Context<AppEnv>) {
  return context.req.header('CF-Connecting-IP')?.trim()
    || context.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown-client'
}

function createPortalRateLimiter(maxAttempts = 10, windowMilliseconds = 60_000) {
  const clients = new Map<string, { attempts: number, resetsAt: number }>()
  return (clientKey: string, timestamp: number) => {
    const current = clients.get(clientKey)
    if (!current || timestamp >= current.resetsAt) {
      clients.set(clientKey, { attempts: 1, resetsAt: timestamp + windowMilliseconds })
      return { allowed: true, retryAfterSeconds: 0 }
    }
    if (current.attempts >= maxAttempts) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - timestamp) / 1000)) }
    }
    current.attempts += 1
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

async function withDatabase(context: Context<AppEnv>, dependencies: PeopleDevelopmentDependencies, operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>): Promise<Response> {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) throw new FirebaseRealtimeDatabaseError(503, 'Firebase database is not configured.')
    const getAccessToken = dependencies.getAccessToken ?? (bindings => getFirebaseServiceAccountAccessToken(bindings))
    const token = await getAccessToken(context.env)
    const database = createFirebaseAdminRealtimeDatabaseClient({ databaseUrl, getAccessToken: async () => token, fetchImpl: dependencies.databaseFetch })
    return await operation(database)
  } catch (error) {
    console.error('People Development database operation failed:', { errorName: error instanceof Error ? error.name : 'UnknownError' })
    const status = error instanceof FirebaseServiceAccountError || (error instanceof FirebaseRealtimeDatabaseError && error.status === 503) ? 503 : 502
    return context.json({ success: false, error: { code: status === 503 ? 'PEOPLE_DEVELOPMENT_DATABASE_UNAVAILABLE' : 'PEOPLE_DEVELOPMENT_DATABASE_REQUEST_FAILED', message: status === 503 ? 'People Development storage is temporarily unavailable.' : 'The People Development database request failed.' } }, status)
  }
}
