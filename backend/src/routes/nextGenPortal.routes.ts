import { Hono, type Context } from 'hono'
import { z } from 'zod'

import {
  completeNextGenFile,
  createNextGenFolder,
  createPendingNextGenFile,
  deleteNextGenFileRecord,
  deleteNextGenFolder,
  getNextGenFile,
  listNextGenFiles,
  listNextGenFolders,
  NextGenFileError,
  type NextGenFile,
} from '../nextgen/nextGenFiles'
import {
  createEmailVoteKey,
  createQaQuestion,
  createQaSession,
  ensureLegacyQaSession,
  getMemberSessionView,
  getPastorSessionView,
  getQaSession,
  listQaSessions,
  NextGenPortalError,
  recordQaVote,
  updateParticipantStatus,
} from '../nextgen/nextGenPortal'
import { requireAdminAuthority } from '../admin/adminAuthorization'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { FirebaseServiceAccountError, getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { isPastorUser } from '../security/pastorAuthorization'
import { ArchiveStorageError, createBackblazeArchiveStorage, type ArchiveStorage } from '../services/backblazeArchive.service'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const idSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)
const sessionSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1_000).default(''),
  status: z.enum(['draft', 'open', 'closed']).default('draft'),
}).strict()
const sessionUpdateSchema = sessionSchema.partial().refine(value => Object.keys(value).length > 0)
const questionSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(180)).min(2).max(8)
    .refine(options => new Set(options.map(option => option.toLowerCase())).size === options.length, 'Answer options must be unique.'),
}).strict()
const voteSchema = z.object({ optionId: z.string().trim().regex(/^option-[1-8]$/) }).strict()
const participantStatusSchema = z.object({ status: z.enum(['verified', 'discarded']) }).strict()
const folderSchema = z.object({
  name: z.string().trim().min(1).max(80).refine(value => value !== '.' && value !== '..' && !/[\\/]/.test(value)),
  parentId: idSchema.nullable().default(null),
}).strict()
const uploadSchema = z.object({
  name: z.string().trim().min(1).max(255).refine(value =>
    value !== '.' &&
    value !== '..' &&
    ![...value].some(character => {
      const code = character.charCodeAt(0)
      return character === '/' || character === '\\' || code <= 31 || code === 127
    }),
  ),
  folderId: idSchema.nullable().default(null),
  size: z.number().int().min(0).max(5_000_000_000),
  contentType: z.string().trim().max(150).default('application/octet-stream'),
}).strict()

export type NextGenPortalDependencies = {
  verifyToken?: FirebaseTokenVerifier
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  archiveStorage?: ArchiveStorage
  now?: () => number
  generateId?: () => string
}

export function createNextGenPortalRoutes(dependencies: NextGenPortalDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now
  const generateId = dependencies.generateId ?? (() => crypto.randomUUID())

  routes.get('/health', context => {
    context.header('Cache-Control', 'no-store, max-age=0')
    return context.json({
      success: true,
      data: {
        service: 'nextgen',
        status: 'ok',
        contractVersion: 1,
      },
    })
  })

  routes.use('*', createFirebaseAuthMiddleware(dependencies.verifyToken))

  routes.get('/session', context => {
    const user = context.get('firebaseUser')
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return context.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        pastor: isPastorUser(user),
      },
    })
  })

  routes.get('/qa/sessions', context => withDatabase(context, dependencies, async database => {
    await ensureLegacyQaSession({ database, timestamp: now() })
    const sessions = (await listQaSessions(database)).filter(session => session.status !== 'draft')
    return context.json({ success: true, data: { sessions } })
  }))

  routes.get('/qa/sessions/:sessionId', context => withMemberSession(context, dependencies, async (database, session, emailVoteKey) => {
    return context.json({ success: true, data: await getMemberSessionView({ database, session, emailVoteKey }) })
  }))

  routes.post('/qa/sessions/:sessionId/questions/:questionId/votes', async context => {
    const questionId = idSchema.safeParse(context.req.param('questionId'))
    const body = voteSchema.safeParse(await readJson(context))
    if (!questionId.success || !body.success) return validationError(context)
    return withMemberSession(context, dependencies, async (database, session, emailVoteKey) => {
      try {
        const view = await getMemberSessionView({ database, session, emailVoteKey })
        const question = view.questions.find(candidate => candidate.id === questionId.data)
        if (!question) throw new NextGenPortalError('NEXTGEN_QA_QUESTION_NOT_FOUND', 'The question was not found.', 404)
        const user = context.get('firebaseUser')
        await recordQaVote({
          database,
          session,
          question,
          participant: {
            uid: user.uid,
            email: user.email!,
            name: user.name?.trim() || user.email!,
          },
          optionId: body.data.optionId,
          emailVoteKey,
          timestamp: now(),
        })
        return context.json({ success: true, data: { submitted: true } }, 201)
      } catch (error) {
        return portalError(context, error)
      }
    })
  })

  routes.get('/pastor/qa/sessions', context => withQaManager(context, dependencies, async database => {
    await ensureLegacyQaSession({ database, timestamp: now() })
    const sessions = await listQaSessions(database)
    const summaries = await Promise.all(sessions.map(async session => {
      const detail = await getPastorSessionView(database, session)
      return {
        ...session,
        questionCount: detail.questions.length,
        participantCount: detail.participants.length,
        pendingParticipantCount: detail.participants.filter(participant => participant.status === 'pending').length,
      }
    }))
    return context.json({ success: true, data: { sessions: summaries } })
  }))

  routes.post('/pastor/qa/sessions', async context => {
    const body = sessionSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withQaManager(context, dependencies, async database => {
      const session = await createQaSession({
        database,
        id: generateId(),
        ...body.data,
        userUid: context.get('firebaseUser').uid,
        timestamp: now(),
      })
      return context.json({ success: true, data: { session } }, 201)
    })
  })

  routes.patch('/pastor/qa/sessions/:sessionId', async context => {
    const sessionId = idSchema.safeParse(context.req.param('sessionId'))
    const body = sessionUpdateSchema.safeParse(await readJson(context))
    if (!sessionId.success || !body.success) return validationError(context)
    return withQaManager(context, dependencies, async database => {
      const session = await getQaSession(database, sessionId.data)
      if (!session) return notFound(context, 'NEXTGEN_QA_SESSION_NOT_FOUND', 'The QA session was not found.')
      const updated = { ...session, ...body.data, updatedAt: now() }
      await database.patch(['nextGenPortal', 'qa', 'sessions', session.id], updated)
      return context.json({ success: true, data: { session: updated } })
    })
  })

  routes.post('/pastor/qa/sessions/:sessionId/questions', async context => {
    const sessionId = idSchema.safeParse(context.req.param('sessionId'))
    const body = questionSchema.safeParse(await readJson(context))
    if (!sessionId.success || !body.success) return validationError(context)
    return withQaManager(context, dependencies, async database => {
      const session = await getQaSession(database, sessionId.data)
      if (!session) return notFound(context, 'NEXTGEN_QA_SESSION_NOT_FOUND', 'The QA session was not found.')
      if (session.status === 'closed') {
        return context.json({ success: false, error: { code: 'NEXTGEN_QA_SESSION_CLOSED', message: 'Reopen this QA session before adding questions.' } }, 409)
      }
      const question = await createQaQuestion({
        database,
        session,
        id: generateId(),
        prompt: body.data.prompt,
        optionLabels: body.data.options,
        userUid: context.get('firebaseUser').uid,
        timestamp: now(),
      })
      return context.json({ success: true, data: { question } }, 201)
    })
  })

  routes.get('/pastor/qa/sessions/:sessionId', context => {
    const sessionId = idSchema.safeParse(context.req.param('sessionId'))
    if (!sessionId.success) return validationError(context)
    return withQaManager(context, dependencies, async database => {
      const session = await getQaSession(database, sessionId.data)
      if (!session) return notFound(context, 'NEXTGEN_QA_SESSION_NOT_FOUND', 'The QA session was not found.')
      return context.json({ success: true, data: await getPastorSessionView(database, session) })
    })
  })

  routes.patch('/pastor/qa/sessions/:sessionId/participants/:participantUid', async context => {
    const sessionId = idSchema.safeParse(context.req.param('sessionId'))
    const participantUid = idSchema.safeParse(context.req.param('participantUid'))
    const body = participantStatusSchema.safeParse(await readJson(context))
    if (!sessionId.success || !participantUid.success || !body.success) return validationError(context)
    return withQaManager(context, dependencies, async database => {
      try {
        const participant = await updateParticipantStatus({
          database,
          sessionId: sessionId.data,
          participantUid: participantUid.data,
          status: body.data.status,
          pastorUid: context.get('firebaseUser').uid,
          timestamp: now(),
        })
        return context.json({ success: true, data: { participant } })
      } catch (error) {
        return portalError(context, error)
      }
    })
  })

  routes.get('/files/folders', context => withDatabase(context, dependencies, async database => {
    return context.json({ success: true, data: { folders: await listNextGenFolders(database) } })
  }))

  routes.post('/files/folders', async context => {
    const body = folderSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withDatabase(context, dependencies, async database => {
      try {
        const folder = await createNextGenFolder({ database, id: generateId(), ...body.data, userUid: context.get('firebaseUser').uid, timestamp: now() })
        return context.json({ success: true, data: { folder } }, 201)
      } catch (error) { return fileError(context, error) }
    })
  })

  routes.delete('/files/folders/:folderId', context => {
    const folderId = idSchema.safeParse(context.req.param('folderId'))
    if (!folderId.success) return validationError(context)
    return withDatabase(context, dependencies, async database => {
      try {
        await deleteNextGenFolder(database, folderId.data)
        return context.json({ success: true, data: { deleted: true } })
      } catch (error) { return fileError(context, error) }
    })
  })

  routes.get('/files', context => withDatabase(context, dependencies, async database => {
    return context.json({ success: true, data: { files: (await listNextGenFiles(database)).map(publicFile) } })
  }))

  routes.post('/files/upload-url', async context => {
    const body = uploadSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withDatabase(context, dependencies, async database => {
      let file: NextGenFile | null = null
      try {
        file = await createPendingNextGenFile({ database, fileId: generateId(), ...body.data, userUid: context.get('firebaseUser').uid, timestamp: now() })
        const signed = await storage(context, dependencies, now).createUploadUrl(file.objectKey)
        return context.json({ success: true, data: { file: publicFile(file), uploadUrl: signed.url, expiresAt: signed.expiresAt } }, 201)
      } catch (error) {
        if (file) try { await deleteNextGenFileRecord(database, file.id) } catch { /* original error wins */ }
        return storageOrFileError(context, error)
      }
    })
  })

  routes.post('/files/:fileId/complete', context => withFile(context, dependencies, async (database, file) => {
    try {
      if (file.status === 'ready') return context.json({ success: true, data: { file: publicFile(file) } })
      const stored = await storage(context, dependencies, now).inspectObject(file.objectKey)
      if (stored.size !== file.size) return context.json({ success: false, error: { code: 'NEXTGEN_FILE_SIZE_MISMATCH', message: 'The uploaded file size does not match.' } }, 409)
      const completed = await completeNextGenFile(database, file, stored.size, stored.contentType, now())
      return context.json({ success: true, data: { file: publicFile(completed) } })
    } catch (error) { return storageOrFileError(context, error) }
  }))

  routes.get('/files/:fileId/download-url', context => withFile(context, dependencies, async (_database, file) => {
    if (file.status !== 'ready') return context.json({ success: false, error: { code: 'NEXTGEN_FILE_NOT_READY', message: 'This file is not ready.' } }, 409)
    try {
      const signed = await storage(context, dependencies, now).createDownloadUrl(file.objectKey, file.name)
      return context.json({ success: true, data: { downloadUrl: signed.url, expiresAt: signed.expiresAt } })
    } catch (error) { return storageOrFileError(context, error) }
  }))

  routes.delete('/files/:fileId', context => withFile(context, dependencies, async (database, file) => {
    try {
      await storage(context, dependencies, now).deleteObject(file.objectKey)
      await deleteNextGenFileRecord(database, file.id)
      return context.json({ success: true, data: { deleted: true } })
    } catch (error) { return storageOrFileError(context, error) }
  }))

  routes.all('*', context => context.json({
    success: false,
    error: {
      code: 'NEXTGEN_ROUTE_NOT_FOUND',
      message: 'The requested NextGen backend endpoint does not exist.',
    },
  }, 404))

  return routes
}

async function withMemberSession(context: Context<AppEnv>, dependencies: NextGenPortalDependencies, operation: (database: FirebaseRealtimeDatabaseClient, session: NonNullable<Awaited<ReturnType<typeof getQaSession>>>, emailVoteKey: string) => Promise<Response>) {
  const sessionId = idSchema.safeParse(context.req.param('sessionId'))
  const email = context.get('firebaseUser').email?.trim().toLowerCase()
  if (!sessionId.success) return validationError(context)
  if (!email) return context.json({ success: false, error: { code: 'NEXTGEN_EMAIL_REQUIRED', message: 'A Firebase account with an email is required.' } }, 403)
  return withDatabase(context, dependencies, async database => {
    const session = await getQaSession(database, sessionId.data)
    if (!session || session.status !== 'open') return notFound(context, 'NEXTGEN_QA_SESSION_NOT_FOUND', 'The open QA session was not found.')
    return operation(database, session, await createEmailVoteKey(email))
  })
}

async function withQaManager(context: Context<AppEnv>, dependencies: NextGenPortalDependencies, operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>) {
  return withDatabase(context, dependencies, async database => {
    const user = context.get('firebaseUser')
    if (isPastorUser(user)) return operation(database)
    const authorization = await requireAdminAuthority(database, user, 'manageNextGenQa')
    if (!authorization.allowed) {
      return context.json({ success: false, error: { code: 'NEXTGEN_QA_MANAGEMENT_ACCESS_REQUIRED', message: 'Pastor or allocated administrator access is required to manage QA sessions.' } }, 403)
    }
    return operation(database)
  })
}

async function withFile(context: Context<AppEnv>, dependencies: NextGenPortalDependencies, operation: (database: FirebaseRealtimeDatabaseClient, file: NextGenFile) => Promise<Response>) {
  const fileId = idSchema.safeParse(context.req.param('fileId'))
  if (!fileId.success) return validationError(context)
  return withDatabase(context, dependencies, async database => {
    const file = await getNextGenFile(database, fileId.data)
    if (!file) return notFound(context, 'NEXTGEN_FILE_NOT_FOUND', 'The file was not found.')
    return operation(database, file)
  })
}

async function withDatabase(context: Context<AppEnv>, dependencies: NextGenPortalDependencies, operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>) {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) throw new Error('Firebase database URL is missing.')
    const getAccessToken = dependencies.getAccessToken ?? (bindings => getFirebaseServiceAccountAccessToken(bindings))
    const token = await getAccessToken(context.env)
    const database = createFirebaseAdminRealtimeDatabaseClient({ databaseUrl, getAccessToken: async () => token, fetchImpl: dependencies.databaseFetch })
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return await operation(database)
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const databaseStatus = error instanceof FirebaseRealtimeDatabaseError ? error.status : null
    console.error('NextGen backend operation failed:', errorName, databaseStatus ?? '')
    if (error instanceof FirebaseServiceAccountError) {
      return context.json({ success: false, error: { code: 'NEXTGEN_FIREBASE_AUTH_UNAVAILABLE', message: 'Firebase server authentication is temporarily unavailable.' } }, 503)
    }
    if (error instanceof FirebaseRealtimeDatabaseError) {
      return context.json({ success: false, error: { code: 'NEXTGEN_DATABASE_REQUEST_FAILED', message: `Firebase database request failed (HTTP ${error.status}).` } }, 503)
    }
    return context.json({ success: false, error: { code: 'NEXTGEN_SERVICE_UNAVAILABLE', message: 'NextGen services are temporarily unavailable.' } }, 503)
  }
}

function storage(context: Context<AppEnv>, dependencies: NextGenPortalDependencies, now: () => number) {
  return dependencies.archiveStorage ?? createBackblazeArchiveStorage(context.env, now)
}
function publicFile(file: NextGenFile) {
  return {
    id: file.id,
    folderId: file.folderId,
    name: file.name,
    size: file.size,
    contentType: file.contentType,
    status: file.status,
    createdAt: file.createdAt,
    createdByUid: file.createdByUid,
    updatedAt: file.updatedAt,
  }
}
function validationError(context: Context<AppEnv>) { return context.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The NextGen request is invalid.' } }, 400) }
function notFound(context: Context<AppEnv>, code: string, message: string) { return context.json({ success: false, error: { code, message } }, 404) }
async function readJson(context: Context<AppEnv>) { try { return await context.req.json() } catch { return undefined } }
function portalError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof NextGenPortalError) return context.json({ success: false, error: { code: error.code, message: error.message } }, error.status)
  throw error
}
function fileError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof NextGenFileError) return context.json({ success: false, error: { code: error.code, message: error.message } }, error.status)
  throw error
}
function storageOrFileError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof NextGenFileError) return fileError(context, error)
  if (error instanceof ArchiveStorageError) {
    const missing = error.code.startsWith('ARCHIVE_STORAGE_CONFIGURATION')
    const pending = error.code === 'ARCHIVE_OBJECT_NOT_FOUND'
    return context.json({ success: false, error: { code: error.code, message: missing ? 'NextGen storage is not configured.' : pending ? 'The upload is still being verified.' : 'NextGen storage is temporarily unavailable.' } }, missing ? 503 : pending ? 409 : 502)
  }
  throw error
}
