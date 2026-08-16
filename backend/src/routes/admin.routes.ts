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
import { ADMIN_AUDIT_PATH, normalizeAdminAuditEvents, writeAdminAudit } from '../admin/adminAudit'
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
  createFirebaseIdentityToolkitClient,
  FirebaseIdentityError,
  type FirebaseIdentityFetch,
} from '../services/firebaseIdentityToolkit.service'
import {
  sendPeopleAccessInvitation,
  type PeopleAccessInvitationInput,
} from '../services/peopleAccessInvitation.service'
import { generateMemorableTemporaryPassword } from '../services/peopleAccessPassword.service'
import type { BrevoEmailResult } from '../services/brevo.service'
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
  manageNextGenQa: z.boolean(),
  managePeopleAccess: z.boolean(),
}).strict().refine(value => Object.values(value).some(Boolean), {
  message: 'At least one administrator authority is required.',
})
const peopleAccessEmailSchema = z.string().trim().toLowerCase().email().max(254)
const peopleAccessEmailUpdateSchema = z.object({ email: peopleAccessEmailSchema }).strict()
const uidSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)
const peopleAccessMigrationSchema = z.object({
  memberKeys: z.array(uidSchema).max(100).optional(),
}).strict()
const archiveFolderIdSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/)
const archiveFolderSchema = z.object({
  name: z.string().trim().min(1).max(80).refine(
    value => value !== '.' && value !== '..' && !/[\\/]/.test(value),
    'Folder names cannot contain slashes.',
  ),
  parentId: archiveFolderIdSchema.nullable().default(null),
}).strict()
const archiveFileIdSchema = archiveFolderIdSchema
const attendancePersonIdSchema = uidSchema
const attendancePersonSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  arabicFirstName: z.string().trim().max(80).default(''),
  arabicLastName: z.string().trim().max(80).default(''),
  phoneNumber: z.string().trim().max(50).default(''),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]).default(''),
  photoBase64: z.string().max(4_100_000).refine(
    value => value === '' || /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value),
    'The attendance photo must be a Base64 image data URL.',
  ).default(''),
}).strict()
const attendanceUpdateSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isSundayDateKey),
  attended: z.boolean(),
}).strict()
const carouselPhotoSchema = z.object({
  id: uidSchema,
  url: z.string().max(4_100_000).refine(value => /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value)),
  altEn: z.string().trim().max(300).default(''),
  altAr: z.string().trim().max(300).default(''),
}).strict()
const carouselUploadSchema = z.object({ photos: z.array(carouselPhotoSchema).min(1).max(12) }).strict()
const carouselVisibilitySchema = z.object({ enabled: z.boolean() }).strict()
const carouselTextSchema = z.object({ altEn: z.string().trim().max(300), altAr: z.string().trim().max(300) }).strict()
const carouselOrderSchema = z.object({ photoIds: z.array(uidSchema).max(12).refine(ids => new Set(ids).size === ids.length) }).strict()
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
  identityFetch?: FirebaseIdentityFetch
  generateTemporaryPassword?: () => string
  sendPeopleAccessInvitation?: (
    bindings: AppEnv['Bindings'],
    input: PeopleAccessInvitationInput,
  ) => Promise<BrevoEmailResult>
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

  routes.get('/audit', context => withActiveAdmin(context, dependencies, async (database, account) => {
    const events = normalizeAdminAuditEvents(await database.get(ADMIN_AUDIT_PATH))
      .filter(event => account.role === 'chief' || event.actorUid === account.uid)
      .slice(0, 500)
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return context.json({ success: true, data: { events } })
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
      await audit(context, database, chief, generateId, now, {
        action: 'administrator.authority.updated', targetType: 'administrator', targetId: uid.data,
        targetLabel: target.email, summary: `Updated administrator authority for ${target.email || uid.data}.`,
        changes: {
          status: { before: target.status, after: 'active' },
          authority: { before: target.authority, after: body.data },
        },
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.patch('/users/:uid/suspend', context => {
    const uid = uidSchema.safeParse(context.req.param('uid'))
    if (!uid.success) return validationError(context)
    return withChief(context, dependencies, async (database, chief) => {
      const target = await getAdminAccount(database, uid.data)
      if (!target || target.role === 'chief') return notFound(context)
      await database.patch([...ADMIN_HIERARCHY_PATH, 'users', uid.data], {
        status: 'suspended', authority: EMPTY_ADMIN_AUTHORITY, updatedAt: now(),
      })
      await audit(context, database, chief, generateId, now, {
        action: 'administrator.suspended', targetType: 'administrator', targetId: uid.data,
        targetLabel: target.email, summary: `Suspended administrator ${target.email || uid.data}.`,
        changes: {
          status: { before: target.status, after: 'suspended' },
          authority: { before: target.authority, after: EMPTY_ADMIN_AUTHORITY },
        },
      })
      return context.json({ success: true, data: { suspended: true } })
    })
  })

  routes.get('/attendance/people', context => withAttendanceAuthority(
    context,
    dependencies,
    async database => {
      const value = await database.get<unknown>(['attendance', 'people'])
      return context.json({ success: true, data: { people: attendancePeople(value) } })
    },
  ))

  routes.post('/attendance/people', async context => {
    const body = attendancePersonSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withAttendanceAuthority(context, dependencies, async (database, account) => {
      const personId = generateId()
      const timestamp = now()
      const person = {
        firebaseId: personId,
        ...body.data,
        daysOfAttendance: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await database.patch(['attendance', 'people', personId], attendanceStoredPerson(person))
      await audit(context, database, account, generateId, now, {
        action: 'attendance.person.created', targetType: 'attendancePerson', targetId: personId,
        targetLabel: `${person.firstName} ${person.lastName}`.trim(),
        summary: `Created attendance person ${person.firstName} ${person.lastName}.`,
        metadata: { email: person.email, phoneNumber: person.phoneNumber, hasPhoto: !!person.photoBase64 },
      })
      return context.json({ success: true, data: { person } }, 201)
    })
  })

  routes.patch('/attendance/people/:personId', async context => {
    const personId = attendancePersonIdSchema.safeParse(context.req.param('personId'))
    const body = attendancePersonSchema.safeParse(await readJson(context))
    if (!personId.success || !body.success) return validationError(context)
    return withAttendanceAuthority(context, dependencies, async (database, account) => {
      const existing = normalizeAttendancePerson(
        personId.data,
        await database.get<unknown>(['attendance', 'people', personId.data]),
      )
      if (!existing) return attendancePersonNotFound(context)
      const person = { ...existing, ...body.data, updatedAt: now() }
      await database.patch(['attendance', 'people', personId.data], {
        ...body.data,
        updatedAt: person.updatedAt,
      })
      await audit(context, database, account, generateId, now, {
        action: 'attendance.person.updated', targetType: 'attendancePerson', targetId: personId.data,
        targetLabel: `${person.firstName} ${person.lastName}`.trim(),
        summary: `Updated attendance person ${person.firstName} ${person.lastName}.`,
        changes: attendancePersonChanges(existing, person),
        metadata: { hasPhoto: !!person.photoBase64 },
      })
      return context.json({ success: true, data: { person } })
    })
  })

  routes.patch('/attendance/people/:personId/attendance', async context => {
    const personId = attendancePersonIdSchema.safeParse(context.req.param('personId'))
    const body = attendanceUpdateSchema.safeParse(await readJson(context))
    if (!personId.success || !body.success) return validationError(context)
    return withAttendanceAuthority(context, dependencies, async (database, account) => {
      const existing = normalizeAttendancePerson(
        personId.data,
        await database.get<unknown>(['attendance', 'people', personId.data]),
      )
      if (!existing) return attendancePersonNotFound(context)
      const dates = new Set(attendanceDates(existing.daysOfAttendance))
      if (body.data.attended) dates.add(body.data.dateKey)
      else dates.delete(body.data.dateKey)
      const person = {
        ...existing,
        daysOfAttendance: [...dates].sort().join(', '),
        updatedAt: now(),
      }
      await database.patch(['attendance', 'people', personId.data], {
        daysOfAttendance: person.daysOfAttendance,
        updatedAt: person.updatedAt,
      })
      await audit(context, database, account, generateId, now, {
        action: body.data.attended ? 'attendance.date.marked' : 'attendance.date.removed',
        targetType: 'attendancePerson', targetId: personId.data,
        targetLabel: `${person.firstName} ${person.lastName}`.trim(),
        summary: `${body.data.attended ? 'Marked' : 'Removed'} attendance for ${body.data.dateKey}.`,
        changes: { attendance: { before: !body.data.attended, after: body.data.attended } },
        metadata: { dateKey: body.data.dateKey },
      })
      return context.json({ success: true, data: { person } })
    })
  })

  routes.get('/carousel', context => withCarouselAuthority(context, dependencies, async database => {
    const value = recordValue(await database.get(['landingPage', 'carousel'])) || {}
    const photos = normalizeCarouselPhotos(value.photos)
    return context.json({ success: true, data: { enabled: value.enabled !== false, photos } })
  }))

  routes.patch('/carousel/visibility', async context => {
    const body = carouselVisibilitySchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withCarouselAuthority(context, dependencies, async (database, account) => {
      const current = recordValue(await database.get(['landingPage', 'carousel'])) || {}
      const before = current.enabled !== false
      await database.patch(['landingPage', 'carousel'], { enabled: body.data.enabled, updatedAt: now() })
      await audit(context, database, account, generateId, now, {
        action: 'carousel.visibility.updated', targetType: 'carousel', targetId: 'landingPage',
        targetLabel: 'Landing-page carousel', summary: `Turned the landing-page carousel ${body.data.enabled ? 'on' : 'off'}.`,
        changes: { enabled: { before, after: body.data.enabled } },
      })
      return context.json({ success: true, data: { enabled: body.data.enabled } })
    })
  })

  routes.post('/carousel/photos', async context => {
    const body = carouselUploadSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withCarouselAuthority(context, dependencies, async (database, account) => {
      const current = normalizeCarouselPhotos(await database.get(['landingPage', 'carousel', 'photos']))
      if (current.length + body.data.photos.length > 12) return validationError(context)
      const timestamp = now()
      const additions = body.data.photos.map((photo, index) => ({ ...photo, order: current.length + index, createdAt: timestamp, updatedAt: timestamp }))
      await database.patch(['landingPage', 'carousel', 'photos'], Object.fromEntries(additions.map(photo => [photo.id, photo])))
      await database.patch(['landingPage', 'carousel'], { updatedAt: timestamp })
      await audit(context, database, account, generateId, now, {
        action: 'carousel.photos.uploaded', targetType: 'carousel', targetId: 'landingPage',
        targetLabel: 'Landing-page carousel', summary: `Uploaded ${additions.length} carousel photo${additions.length === 1 ? '' : 's'}.`,
        metadata: { photoIds: additions.map(photo => photo.id), photoCount: additions.length },
      })
      return context.json({ success: true, data: { photos: additions } }, 201)
    })
  })

  routes.patch('/carousel/photos/:photoId/text', async context => {
    const photoId = uidSchema.safeParse(context.req.param('photoId'))
    const body = carouselTextSchema.safeParse(await readJson(context))
    if (!photoId.success || !body.success) return validationError(context)
    return withCarouselAuthority(context, dependencies, async (database, account) => {
      const existing = normalizeCarouselPhoto(photoId.data, await database.get(['landingPage', 'carousel', 'photos', photoId.data]))
      if (!existing) return carouselPhotoNotFound(context)
      await database.patch(['landingPage', 'carousel', 'photos', photoId.data], { ...body.data, updatedAt: now() })
      await audit(context, database, account, generateId, now, {
        action: 'carousel.photo.text.updated', targetType: 'carouselPhoto', targetId: photoId.data,
        targetLabel: existing.altEn || photoId.data, summary: 'Updated a carousel photo description.',
        changes: {
          altEn: { before: existing.altEn, after: body.data.altEn },
          altAr: { before: existing.altAr, after: body.data.altAr },
        },
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.patch('/carousel/photos/order', async context => {
    const body = carouselOrderSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withCarouselAuthority(context, dependencies, async (database, account) => {
      const photos = normalizeCarouselPhotos(await database.get(['landingPage', 'carousel', 'photos']))
      const currentIds = photos.map(photo => photo.id)
      if (body.data.photoIds.length !== currentIds.length || body.data.photoIds.some(id => !currentIds.includes(id))) return validationError(context)
      await database.patch(['landingPage', 'carousel', 'photos'], Object.fromEntries(body.data.photoIds.map((id, order) => [`${id}/order`, order])))
      await audit(context, database, account, generateId, now, {
        action: 'carousel.photos.reordered', targetType: 'carousel', targetId: 'landingPage',
        targetLabel: 'Landing-page carousel', summary: 'Reordered landing-page carousel photos.',
        changes: { order: { before: currentIds, after: body.data.photoIds } },
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.delete('/carousel/photos/:photoId', context => {
    const photoId = uidSchema.safeParse(context.req.param('photoId'))
    if (!photoId.success) return validationError(context)
    return withCarouselAuthority(context, dependencies, async (database, account) => {
      const photos = normalizeCarouselPhotos(await database.get(['landingPage', 'carousel', 'photos']))
      const existing = photos.find(photo => photo.id === photoId.data)
      if (!existing) return carouselPhotoNotFound(context)
      await database.delete(['landingPage', 'carousel', 'photos', photoId.data])
      const remaining = photos.filter(photo => photo.id !== photoId.data)
      if (remaining.length) await database.patch(['landingPage', 'carousel', 'photos'], Object.fromEntries(remaining.map((photo, order) => [`${photo.id}/order`, order])))
      await audit(context, database, account, generateId, now, {
        action: 'carousel.photo.deleted', targetType: 'carouselPhoto', targetId: photoId.data,
        targetLabel: existing.altEn || photoId.data, summary: 'Deleted a landing-page carousel photo.',
        metadata: { hadArabicDescription: !!existing.altAr },
      })
      return context.json({ success: true, data: { deleted: true } })
    })
  })

  routes.get('/people-access', context => withPeopleAccessAuthority(
    context,
    dependencies,
    async database => {
      const [members, assessmentResponses] = await Promise.all([
        database.get(['peopleDevelopment', 'members']),
        database.get(['form']),
      ])
      return context.json({
        success: true,
        data: { people: peopleAccessRows(members, assessmentResponses).map(publicPeopleAccessRow) },
      })
    },
  ))

  routes.patch('/people-access/:memberKey/email', async context => {
    const memberKey = uidSchema.safeParse(context.req.param('memberKey'))
    const body = peopleAccessEmailUpdateSchema.safeParse(await readJson(context))
    if (!memberKey.success || !body.success) return validationError(context)
    return withPeopleAccessAuthority(context, dependencies, async (database, account) => {
      const raw = await database.get<unknown>(['peopleDevelopment', 'members', memberKey.data])
      const member = recordValue(raw)
      if (!member) return peopleAccessNotFound(context)
      if (typeof member.firebaseUid === 'string' && member.firebaseUid) {
        return context.json({
          success: false,
          error: { code: 'PEOPLE_ACCESS_ALREADY_REGISTERED', message: 'This person is already linked to Firebase Authentication.' },
        }, 409)
      }
      await database.patch(['peopleDevelopment', 'members', memberKey.data], {
        authEmail: body.data.email,
        authMigration: { status: 'pending', updatedAt: now(), updatedByUid: context.get('firebaseUser').uid },
      })
      await audit(context, database, account, generateId, now, {
        action: 'peopleAccess.email.updated', targetType: 'peopleDevelopmentMember', targetId: memberKey.data,
        targetLabel: typeof member.fullName === 'string' ? member.fullName : memberKey.data,
        summary: `Updated the access email for ${typeof member.fullName === 'string' ? member.fullName : memberKey.data}.`,
        changes: { authEmail: { before: typeof member.authEmail === 'string' ? member.authEmail : member.email, after: body.data.email } },
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.post('/people-access/migrate', async context => {
    const body = peopleAccessMigrationSchema.safeParse(await readJson(context))
    if (!body.success) return validationError(context)
    return withPeopleAccessAuthority(context, dependencies, async (database, account) => {
      const [membersValue, assessmentResponses] = await Promise.all([
        database.get<unknown>(['peopleDevelopment', 'members']),
        database.get<unknown>(['form']),
      ])
      const rawMembers = recordValue(membersValue) || {}
      const people = peopleAccessRows(rawMembers, assessmentResponses)
      const requestedKeys = body.data.memberKeys ? new Set(body.data.memberKeys) : null
      const selected = people.filter(person => !requestedKeys || requestedKeys.has(person.memberKey))
      const getAccessToken = dependencies.getAccessToken ?? (bindings => getFirebaseServiceAccountAccessToken(bindings))
      let identity: ReturnType<typeof createFirebaseIdentityToolkitClient>
      try {
        identity = createFirebaseIdentityToolkitClient({
          bindings: context.env,
          accessToken: await getAccessToken(context.env),
          fetchImpl: dependencies.identityFetch,
        })
      } catch (error) {
        return peopleAccessConfigurationError(context, error)
      }

      const claimedUids = new Map(
        people.filter(person => person.firebaseUid).map(person => [person.firebaseUid, person.memberKey]),
      )
      const results: Array<{ memberKey: string; status: string; message: string }> = []
      const generateTemporaryPassword = dependencies.generateTemporaryPassword ?? generateMemorableTemporaryPassword
      const sendInvitation = dependencies.sendPeopleAccessInvitation ?? sendPeopleAccessInvitation
      const administratorUid = context.get('firebaseUser').uid

      for (const person of selected) {
        if (person.status === 'complete') {
          results.push({ memberKey: person.memberKey, status: 'already_complete', message: 'Firebase access and its email are already complete.' })
          continue
        }
        if (person.status === 'missing_email' || person.status === 'invalid_email') {
          results.push({ memberKey: person.memberKey, status: person.status, message: person.problem })
          continue
        }

        let firebaseUid = person.firebaseUid
        let migrationMethod = person.migrationMethod
        let temporaryPassword: string | undefined
        let justProvisioned = false

        try {
          if (!firebaseUid) {
            let firebaseUser = await identity.findByEmail(person.authEmail)
            migrationMethod = 'linked_existing'
            if (firebaseUser) {
              const owner = claimedUids.get(firebaseUser.localId)
              if (owner && owner !== person.memberKey) {
                throw new FirebaseIdentityError(
                  'FIREBASE_UID_CONFLICT',
                  'That Firebase account is already linked to another person.',
                  409,
                )
              }
            } else {
              temporaryPassword = generateTemporaryPassword()
              firebaseUser = await identity.createUser({
                email: person.authEmail,
                password: temporaryPassword,
                displayName: person.fullName,
              })
              migrationMethod = 'created'
            }

            firebaseUid = firebaseUser.localId
            justProvisioned = true
            const timestamp = now()
            await database.patch(['peopleDevelopment', 'members', person.memberKey], {
              authEmail: person.authEmail,
              authLocale: person.authLocale,
              firebaseUid,
              authMigration: {
                status: 'firebase_ready',
                method: migrationMethod,
                firebaseProvisionedAt: timestamp,
                invitationStatus: 'pending',
                updatedAt: timestamp,
                updatedByUid: administratorUid,
              },
            })
            claimedUids.set(firebaseUid, person.memberKey)
          } else if (migrationMethod === 'created') {
            temporaryPassword = generateTemporaryPassword()
            await identity.updatePassword(firebaseUid, temporaryPassword)
          }

          const timestamp = now()
          await database.patch(['peopleDevelopment', 'members', person.memberKey, 'authMigration'], {
            status: 'firebase_ready',
            method: migrationMethod || 'linked_existing',
            invitationStatus: 'pending',
            errorCode: null,
            errorMessage: null,
            updatedAt: timestamp,
            updatedByUid: administratorUid,
          })
        } catch (error) {
          const normalized = error instanceof FirebaseIdentityError
            ? error
            : new FirebaseIdentityError('PEOPLE_ACCESS_REGISTRATION_FAILED', 'Firebase registration failed.', 502)
          await database.patch(['peopleDevelopment', 'members', person.memberKey, 'authMigration'], {
            status: 'firebase_failed',
            errorCode: normalized.code,
            errorMessage: normalized.message,
            updatedAt: now(),
            updatedByUid: administratorUid,
          })
          results.push({ memberKey: person.memberKey, status: 'firebase_failed', message: normalized.message })
          continue
        }

        try {
          const emailResult = await sendInvitation(context.env, {
            fullName: person.fullName,
            email: person.authEmail,
            locale: person.authLocale,
            ...(temporaryPassword ? { temporaryPassword } : {}),
          })
          const timestamp = now()
          await database.patch(['peopleDevelopment', 'members', person.memberKey], {
            authLocale: person.authLocale,
            authMigration: {
              status: 'complete',
              method: migrationMethod || 'linked_existing',
              invitationStatus: 'sent',
              invitationSentAt: timestamp,
              invitationMessageId: emailResult.messageId,
              completedAt: timestamp,
              errorCode: null,
              errorMessage: null,
              updatedAt: timestamp,
              updatedByUid: administratorUid,
            },
          })
          results.push({
            memberKey: person.memberKey,
            status: 'complete',
            message: migrationMethod === 'created'
              ? `${justProvisioned ? 'Firebase account created' : 'Existing Firebase account kept and temporary password refreshed'}; access email sent.`
              : 'Existing Firebase account linked; access email sent.',
          })
        } catch {
          await database.patch(['peopleDevelopment', 'members', person.memberKey], {
            authLocale: person.authLocale,
            authMigration: {
              status: 'email_failed',
              method: migrationMethod || 'linked_existing',
              invitationStatus: 'failed',
              errorCode: 'PEOPLE_ACCESS_EMAIL_FAILED',
              errorMessage: 'Firebase access is ready, but the access email could not be sent.',
              updatedAt: now(),
              updatedByUid: administratorUid,
            },
          })
          results.push({
            memberKey: person.memberKey,
            status: 'email_failed',
            message: 'Firebase access is ready, but the access email could not be sent.',
          })
        }
      }

      const summary = results.reduce<Record<string, number>>((totals, result) => {
        totals[result.status] = (totals[result.status] || 0) + 1
        return totals
      }, {})
      await audit(context, database, account, generateId, now, {
        action: 'peopleAccess.migration.run', targetType: 'peopleAccessMigration', targetId: generateId(),
        targetLabel: 'People Access migration', summary: `Processed ${results.length} People Access record${results.length === 1 ? '' : 's'}.`,
        metadata: { memberKeys: selected.map(person => person.memberKey), summary },
      })
      return context.json({
        success: true,
        data: {
          results,
          summary,
        },
      })
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
      try {
        const folder = await createArchiveFolder({
          database,
          id: generateId(),
          name: body.data.name,
          parentId: body.data.parentId,
          userUid: context.get('firebaseUser').uid,
          timestamp: now(),
        })
        await audit(context, database, account, generateId, now, {
          action: 'archive.folder.created', targetType: 'archiveFolder', targetId: folder.id,
          targetLabel: folder.name, summary: `Created archive folder ${folder.name}.`,
          metadata: { parentId: folder.parentId },
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
      try {
        const folder = (await listArchiveFolders(database)).find(item => item.id === folderId.data)
        await deleteArchiveFolder(database, folderId.data)
        await audit(context, database, account, generateId, now, {
          action: 'archive.folder.deleted', targetType: 'archiveFolder', targetId: folderId.data,
          targetLabel: folder?.name || folderId.data, summary: `Deleted archive folder ${folder?.name || folderId.data}.`,
          metadata: { parentId: folder?.parentId || null },
        })
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
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
        await audit(context, database, account, generateId, now, {
          action: 'archive.file.upload.prepared', targetType: 'archiveFile', targetId: file.id,
          targetLabel: file.name, summary: `Prepared upload for archive file ${file.name}.`,
          metadata: { folderId: file.folderId, size: file.size, contentType: file.contentType },
        })
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
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
        await audit(context, database, account, generateId, now, {
          action: 'archive.file.upload.completed', targetType: 'archiveFile', targetId: completed.id,
          targetLabel: completed.name, summary: `Completed archive upload for ${completed.name}.`,
          changes: { status: { before: file.status, after: completed.status } },
          metadata: { folderId: completed.folderId, size: completed.size, contentType: completed.contentType },
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
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
        await audit(context, database, account, generateId, now, {
          action: 'archive.file.download.requested', targetType: 'archiveFile', targetId: file.id,
          targetLabel: file.name, summary: `Requested a download for archive file ${file.name}.`,
          metadata: { folderId: file.folderId, size: file.size },
        })
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

    return withArchiveAuthority(context, dependencies, async (database, account) => {
      try {
        const file = await getArchiveFile(database, fileId.data)
        if (!file) throw archiveFileNotFound()
        await archiveStorage(context, dependencies, now).deleteObject(file.objectKey)
        await deleteArchiveFileMetadata(database, file.id)
        await audit(context, database, account, generateId, now, {
          action: 'archive.file.deleted', targetType: 'archiveFile', targetId: file.id,
          targetLabel: file.name, summary: `Deleted archive file ${file.name}.`,
          metadata: { folderId: file.folderId, size: file.size, contentType: file.contentType },
        })
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
  operation: (database: FirebaseRealtimeDatabaseClient, account: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    context.header('Cache-Control', 'private, no-store, max-age=0')
    const { allowed, account } = await requireAdminAuthority(
      database,
      context.get('firebaseUser'),
      'manageArchives',
    )
    if (!allowed || !account) {
      return context.json({
        success: false,
        error: {
          code: 'ADMIN_ARCHIVES_ACCESS_REQUIRED',
          message: 'LInC Archives administrator authority is required.',
        },
      }, 403)
    }
    return operation(database, account)
  })
}

async function withAttendanceAuthority(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient, account: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    context.header('Cache-Control', 'private, no-store, max-age=0')
    const { allowed, account } = await requireAdminAuthority(database, context.get('firebaseUser'), 'manageAttendance')
    if (!allowed || !account) {
      return context.json({
        success: false,
        error: {
          code: 'ADMIN_ATTENDANCE_ACCESS_REQUIRED',
          message: 'Attendance administrator authority is required.',
        },
      }, 403)
    }
    return operation(database, account)
  })
}

async function withCarouselAuthority(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient, account: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    context.header('Cache-Control', 'private, no-store, max-age=0')
    const { allowed, account } = await requireAdminAuthority(database, context.get('firebaseUser'), 'manageCarousel')
    if (!allowed || !account) return context.json({
      success: false,
      error: { code: 'ADMIN_CAROUSEL_ACCESS_REQUIRED', message: 'Landing Media administrator authority is required.' },
    }, 403)
    return operation(database, account)
  })
}

async function audit(
  context: Context<AppEnv>,
  database: FirebaseRealtimeDatabaseClient,
  account: AdminAccount,
  generateId: () => string,
  now: () => number,
  event: Omit<Parameters<typeof writeAdminAudit>[0], 'database' | 'id' | 'occurredAt' | 'actor' | 'account'>,
) {
  return writeAdminAudit({
    database,
    id: generateId(),
    occurredAt: now(),
    actor: context.get('firebaseUser'),
    account,
    ...event,
  })
}

async function withPeopleAccessAuthority(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient, account: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    context.header('Cache-Control', 'private, no-store, max-age=0')
    const { allowed, account } = await requireAdminAuthority(database, context.get('firebaseUser'), 'managePeopleAccess')
    if (!allowed || !account) {
      return context.json({
        success: false,
        error: { code: 'ADMIN_PEOPLE_ACCESS_REQUIRED', message: 'People Access administrator authority is required.' },
      }, 403)
    }
    return operation(database, account)
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

async function withActiveAdmin(
  context: Context<AppEnv>,
  dependencies: AdminDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient, account: AdminAccount) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    const account = await getAdminAccount(database, context.get('firebaseUser').uid)
    if (!account || (account.role !== 'chief' && account.status !== 'active')) {
      return context.json({ success: false, error: { code: 'ADMIN_ACCESS_REQUIRED', message: 'Active administrator access is required.' } }, 403)
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

function peopleAccessNotFound(context: Context<AppEnv>) {
  return context.json({ success: false, error: { code: 'PEOPLE_ACCESS_NOT_FOUND', message: 'The People Development member was not found.' } }, 404)
}

function attendancePersonNotFound(context: Context<AppEnv>) {
  return context.json({
    success: false,
    error: { code: 'ATTENDANCE_PERSON_NOT_FOUND', message: 'The attendance person was not found.' },
  }, 404)
}

function carouselPhotoNotFound(context: Context<AppEnv>) {
  return context.json({ success: false, error: { code: 'CAROUSEL_PHOTO_NOT_FOUND', message: 'The carousel photo was not found.' } }, 404)
}

type AdminCarouselPhoto = {
  id: string
  url: string
  altEn: string
  altAr: string
  order: number
  createdAt: number
  updatedAt: number
}

function normalizeCarouselPhotos(value: unknown): AdminCarouselPhoto[] {
  return Object.entries(recordValue(value) || {})
    .map(([id, photo]) => normalizeCarouselPhoto(id, photo))
    .filter((photo): photo is AdminCarouselPhoto => photo !== null)
    .sort((a, b) => a.order - b.order)
}

function normalizeCarouselPhoto(id: string, value: unknown): AdminCarouselPhoto | null {
  const photo = recordValue(value)
  if (!photo) return null
  const url = stringValue(photo.url || photo.dataUrl)
  if (!url) return null
  return {
    id,
    url,
    altEn: stringValue(photo.altEn),
    altAr: stringValue(photo.altAr),
    order: finiteNumber(photo.order),
    createdAt: finiteNumber(photo.createdAt),
    updatedAt: finiteNumber(photo.updatedAt),
  }
}

type AttendancePersonRecord = {
  firebaseId: string
  firstName: string
  lastName: string
  arabicFirstName: string
  arabicLastName: string
  phoneNumber: string
  email: string
  photoBase64: string
  daysOfAttendance: string
  createdAt: number
  updatedAt: number
}

function attendancePeople(value: unknown): AttendancePersonRecord[] {
  return Object.entries(recordValue(value) || {})
    .map(([personId, person]) => normalizeAttendancePerson(personId, person))
    .filter((person): person is AttendancePersonRecord => person !== null)
}

function normalizeAttendancePerson(personId: string, value: unknown): AttendancePersonRecord | null {
  const person = recordValue(value)
  if (!person) return null
  const normalized = {
    firebaseId: personId,
    firstName: stringValue(person.firstName),
    lastName: stringValue(person.lastName),
    arabicFirstName: stringValue(person.arabicFirstName),
    arabicLastName: stringValue(person.arabicLastName),
    phoneNumber: stringValue(person.phoneNumber),
    email: stringValue(person.email).toLowerCase(),
    photoBase64: stringValue(person.photoBase64),
    daysOfAttendance: attendanceDates(stringValue(person.daysOfAttendance)).join(', '),
    createdAt: finiteNumber(person.createdAt),
    updatedAt: finiteNumber(person.updatedAt),
  }
  return normalized.firstName || normalized.lastName || normalized.email || normalized.phoneNumber
    ? normalized
    : null
}

function attendanceStoredPerson(person: AttendancePersonRecord) {
  const { firebaseId: _firebaseId, ...stored } = person
  void _firebaseId
  return stored
}

function attendancePersonChanges(before: AttendancePersonRecord, after: AttendancePersonRecord) {
  const fields = ['firstName', 'lastName', 'arabicFirstName', 'arabicLastName', 'phoneNumber', 'email'] as const
  return Object.fromEntries(fields
    .filter(field => before[field] !== after[field])
    .map(field => [field, { before: before[field], after: after[field] }]))
}

function attendanceDates(value: string) {
  return [...new Set(value.split(',').map(date => date.trim()).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort()
}

function isSundayDateKey(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 0
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function peopleAccessConfigurationError(context: Context<AppEnv>, error: unknown) {
  const normalized = error instanceof FirebaseIdentityError ? error : null
  return context.json({
    success: false,
    error: {
      code: normalized?.code || 'FIREBASE_IDENTITY_NOT_CONFIGURED',
      message: normalized?.message || 'Firebase account provisioning is not configured.',
    },
  }, (normalized?.status === 502 ? 502 : 503) as 502 | 503)
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function peopleAccessRows(value: unknown, assessmentResponsesValue: unknown) {
  const assessmentResponses = recordValue(assessmentResponsesValue) || {}
  return Object.entries(recordValue(value) || {}).map(([memberKey, raw]) => {
    const member = recordValue(raw) || {}
    const fullName = typeof member.fullName === 'string' ? member.fullName.trim() : ''
    const sourceEmail = typeof member.email === 'string' ? member.email.trim().toLowerCase() : ''
    const authEmail = typeof member.authEmail === 'string' ? member.authEmail.trim().toLowerCase() : sourceEmail
    const firebaseUid = typeof member.firebaseUid === 'string' ? member.firebaseUid.trim() : ''
    const migration = recordValue(member.authMigration) || {}
    const migrationStatus = typeof migration.status === 'string' ? migration.status : ''
    const invitationStatus = typeof migration.invitationStatus === 'string' ? migration.invitationStatus : ''
    const migrationMethod = migration.method === 'created' || migration.method === 'linked_existing'
      ? migration.method
      : ''
    const authLocale = peopleAccessLocale(member, assessmentResponses)
    let status = 'ready'
    let problem = ''
    if ((migrationStatus === 'complete' || invitationStatus === 'sent') && firebaseUid) status = 'complete'
    else if (!authEmail) { status = 'missing_email'; problem = 'A Firebase login email is missing.' }
    else if (!peopleAccessEmailSchema.safeParse(authEmail).success) { status = 'invalid_email'; problem = 'The Firebase login email is invalid.' }
    else if (firebaseUid) {
      if (migrationStatus === 'email_failed' || invitationStatus === 'failed') {
        status = 'email_failed'
        problem = typeof migration.errorMessage === 'string'
          ? migration.errorMessage
          : 'Firebase access is ready, but its email needs to be retried.'
      } else {
        status = 'firebase_ready'
        problem = 'Firebase access is ready. The access email still needs to be sent.'
      }
    } else if (migrationStatus === 'firebase_failed' || migrationStatus === 'failed') {
      status = 'firebase_failed'
      problem = typeof migration.errorMessage === 'string' ? migration.errorMessage : 'The last Firebase registration attempt failed.'
    }
    return { memberKey, fullName, sourceEmail, authEmail, firebaseUid, migrationMethod, authLocale, status, problem }
  }).sort((a, b) => a.fullName.localeCompare(b.fullName))
}

function peopleAccessLocale(
  member: Record<string, unknown>,
  assessmentResponses: Record<string, unknown>,
): 'en' | 'ar' {
  const memberLocale = normalizePeopleAccessLocale(
    member.authLocale ?? member.preferredLanguage ?? member.interfaceLanguageUsed ?? member.language ?? member.locale,
  )
  if (memberLocale) return memberLocale

  const sourcePath = typeof member.sourcePath === 'string' ? member.sourcePath.trim() : 'form'
  const sourceKeys = Array.isArray(member.sourceKeys)
    ? member.sourceKeys.filter((key): key is string => typeof key === 'string' && Boolean(key.trim()))
    : []
  if (sourcePath === 'form') {
    for (const sourceKey of sourceKeys) {
      const source = recordValue(assessmentResponses[sourceKey])
      if (!source) continue
      const sourceLocale = normalizePeopleAccessLocale(
        source.interfaceLanguageUsed ?? source.preferredLanguage ?? source.language ?? source.locale,
      )
      if (sourceLocale) return sourceLocale
    }
  }
  return 'en'
}

function normalizePeopleAccessLocale(value: unknown): 'en' | 'ar' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'ar' || normalized === 'arabic' || normalized.startsWith('ar-') || normalized === 'العربية') return 'ar'
  if (normalized === 'en' || normalized === 'english' || normalized.startsWith('en-')) return 'en'
  return null
}

function publicPeopleAccessRow(person: ReturnType<typeof peopleAccessRows>[number]) {
  return {
    memberKey: person.memberKey,
    fullName: person.fullName,
    sourceEmail: person.sourceEmail,
    authEmail: person.authEmail,
    firebaseUid: person.firebaseUid,
    status: person.status,
    problem: person.problem,
  }
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
