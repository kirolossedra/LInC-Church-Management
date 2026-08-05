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
import {
  AdminArchiveError,
  completeArchiveFile,
  createPendingArchiveFile,
  createArchiveFolder,
  deleteArchiveFileMetadata,
  deleteArchiveFolder,
  getArchiveFile,
  hasInvalidArchiveNameCharacter,
  listArchiveFiles,
  listArchiveFolders,
  type AdminArchiveFile,
} from '../admin/adminArchives'
import { requireAdminAuthority } from '../admin/adminAuthorization'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { isPastorUser } from '../security/pastorAuthorization'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import {
  ArchiveStorageError,
  createBackblazeArchiveStorage,
  type ArchiveStorage,
} from '../services/backblazeArchive.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const authoritySchema = z.object({
  manageAssessmentForms: z.boolean(),
  manageCarousel: z.boolean(),
  manageAttendance: z.boolean(),
  manageArchives: z.boolean(),
}).strict().refine(value => Object.values(value).some(Boolean), {
  message: 'At least one administrator authority is required.',
})
const uidSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)
const archiveFolderIdSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)
const archiveFolderSchema = z.object({
  name: z.string().trim().min(1).max(80).refine(
    value => value !== '.' && value !== '..' && !/[\\/]/.test(value),
    'Folder names cannot contain slashes.',
  ),
  parentId: archiveFolderIdSchema.nullable().default(null),
}).strict()
const archiveFileIdSchema = archiveFolderIdSchema
const archiveUploadSchema = z.object({
  name: z.string().trim().min(1).max(255).refine(
    value => value !== '.' && value !== '..' && !hasInvalidArchiveNameCharacter(value),
    'File names cannot contain slashes or control characters.',
  ),
  folderId: archiveFolderIdSchema.nullable().default(null),
  size: z.number().int().min(0).max(5_000_000_000),
  contentType: z.string().trim().max(150).default('application/octet-stream'),
}).strict()

export type AdminDependencies = {
  verifyToken?: FirebaseTokenVerifier
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  now?: () => number
  generateId?: () => string
  archiveStorage?: ArchiveStorage
}

export function createAdminRoutes(dependencies: AdminDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now
  const generateId = dependencies.generateId ?? (() => crypto.randomUUID())
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

  routes.get('/archives/folders', context => withArchiveAuthority(
    context,
    dependencies,
    async database => context.json({
      success: true,
      data: { folders: await listArchiveFolders(database) },
    }),
  ))

  routes.post('/archives/folders', async context => {
    const body = archiveFolderSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      try {
        const folder = await createArchiveFolder({
          database,
          id: generateId(),
          name: body.data.name,
          parentId: body.data.parentId,
          userUid: context.get('firebaseUser').uid,
          timestamp: now(),
        })
        return context.json({ success: true, data: { folder } }, 201)
      } catch (error) {
        return archiveError(context, error)
      }
    })
  })

  routes.delete('/archives/folders/:folderId', context => {
    const folderId = archiveFolderIdSchema.safeParse(context.req.param('folderId'))
    if (!folderId.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      try {
        await deleteArchiveFolder(database, folderId.data)
        return context.json({ success: true, data: { deleted: true } })
      } catch (error) {
        return archiveError(context, error)
      }
    })
  })

  routes.get('/archives/files', context => withArchiveAuthority(
    context,
    dependencies,
    async database => context.json({
      success: true,
      data: {
        files: (await listArchiveFiles(database)).map(publicArchiveFile),
      },
    }),
  ))

  routes.post('/archives/files/upload-url', async context => {
    const body = archiveUploadSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      let file: AdminArchiveFile | null = null
      try {
        file = await createPendingArchiveFile({
          database,
          fileId: generateId(),
          folderId: body.data.folderId,
          name: body.data.name,
          contentType: body.data.contentType,
          declaredSize: body.data.size,
          userUid: context.get('firebaseUser').uid,
          timestamp: now(),
        })
        const signed = await archiveStorage(context, dependencies, now)
          .createUploadUrl(file.objectKey)
        return context.json({
          success: true,
          data: {
            file: publicArchiveFile(file),
            uploadUrl: signed.url,
            expiresAt: signed.expiresAt,
          },
        }, 201)
      } catch (error) {
        if (file) {
          try { await deleteArchiveFileMetadata(database, file.id) } catch { /* database handler reports failures */ }
        }
        return archiveOperationError(context, error)
      }
    })
  })

  routes.post('/archives/files/:fileId/complete', context => {
    const fileId = archiveFileIdSchema.safeParse(context.req.param('fileId'))
    if (!fileId.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      try {
        const file = await getArchiveFile(database, fileId.data)
        if (!file) throw archiveFileNotFound()
        if (file.status === 'ready') {
          return context.json({ success: true, data: { file: publicArchiveFile(file) } })
        }
        const stored = await archiveStorage(context, dependencies, now)
          .inspectObject(file.objectKey)
        if (stored.size !== file.size) {
          throw new AdminArchiveError(
            'ARCHIVE_UPLOAD_SIZE_MISMATCH',
            'The uploaded file size does not match the selected file.',
            409,
          )
        }
        const completed = await completeArchiveFile({
          database,
          file,
          size: stored.size,
          contentType: stored.contentType || file.contentType,
          timestamp: now(),
        })
        return context.json({
          success: true,
          data: { file: publicArchiveFile(completed) },
        })
      } catch (error) {
        return archiveOperationError(context, error)
      }
    })
  })

  routes.get('/archives/files/:fileId/download-url', context => {
    const fileId = archiveFileIdSchema.safeParse(context.req.param('fileId'))
    if (!fileId.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      try {
        const file = await getArchiveFile(database, fileId.data)
        if (!file) throw archiveFileNotFound()
        if (file.status !== 'ready') {
          throw new AdminArchiveError(
            'ARCHIVE_FILE_NOT_READY',
            'This archive file has not finished uploading.',
            409,
          )
        }
        const signed = await archiveStorage(context, dependencies, now)
          .createDownloadUrl(file.objectKey, file.name)
        return context.json({
          success: true,
          data: { downloadUrl: signed.url, expiresAt: signed.expiresAt },
        })
      } catch (error) {
        return archiveOperationError(context, error)
      }
    })
  })

  routes.delete('/archives/files/:fileId', context => {
    const fileId = archiveFileIdSchema.safeParse(context.req.param('fileId'))
    if (!fileId.success) return validationError(context)

    return withArchiveAuthority(context, dependencies, async database => {
      try {
        const file = await getArchiveFile(database, fileId.data)
        if (!file) throw archiveFileNotFound()
        await archiveStorage(context, dependencies, now).deleteObject(file.objectKey)
        await deleteArchiveFileMetadata(database, file.id)
        return context.json({ success: true, data: { deleted: true } })
      } catch (error) {
        return archiveOperationError(context, error)
      }
    })
  })

  return routes
}

function archiveStorage(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  now: () => number,
) {
  return dependencies.archiveStorage ?? createBackblazeArchiveStorage(context.env, now)
}

function publicArchiveFile(file: AdminArchiveFile) {
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

function archiveFileNotFound() {
  return new AdminArchiveError(
    'ARCHIVE_FILE_NOT_FOUND',
    'The archive file no longer exists.',
    404,
  )
}

async function withArchiveAuthority(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    context.header('Cache-Control', 'private, no-store, max-age=0')
    const { allowed } = await requireAdminAuthority(
      database,
      context.get('firebaseUser'),
      'manageArchives',
    )
    if (!allowed) {
      return context.json({
        success: false,
        error: {
          code: 'ADMIN_ARCHIVES_ACCESS_REQUIRED',
          message: 'LInC Archives administrator authority is required.',
        },
      }, 403)
    }
    return operation(database)
  })
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

function archiveError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof AdminArchiveError) {
    return context.json({
      success: false,
      error: { code: error.code, message: error.message },
    }, error.status)
  }
  throw error
}

function archiveOperationError(context: Context<AppEnv>, error: unknown) {
  if (error instanceof AdminArchiveError) return archiveError(context, error)
  if (error instanceof ArchiveStorageError) {
    console.error('Archive storage operation failed:', error.code, error.message)
    const configurationFailure = error.code.startsWith('ARCHIVE_STORAGE_CONFIGURATION')
    const verificationPending = error.code === 'ARCHIVE_OBJECT_NOT_FOUND'
    return context.json({
      success: false,
      error: {
        code: error.code,
        message: configurationFailure
          ? 'Archive storage is not configured.'
          : verificationPending
            ? 'The file reached Backblaze, but verification is still pending. Try Verify upload.'
            : 'Archive storage is temporarily unavailable.',
      },
    }, configurationFailure ? 503 : verificationPending ? 409 : 502)
  }
  throw error
}
