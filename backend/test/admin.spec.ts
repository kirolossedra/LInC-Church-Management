import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AdminDependencies } from '../src/routes/admin.routes'
import type { ArchiveStorage } from '../src/services/backblazeArchive.service'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const bindings = {
  BREVO_API_KEY: 'test-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
  FIREBASE_WEB_API_KEY: 'public-test-key',
}

const administrator: AuthenticatedFirebaseUser = {
  uid: 'admin-uid',
  email: 'admin@example.com',
  emailVerified: true,
  name: null,
  picture: null,
  signInProvider: 'password',
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authenticatedRequest(path: string, method = 'GET', body?: unknown) {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: {
      Authorization: 'Bearer valid-token',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function createTestApp(
  fetchMock: ReturnType<typeof vi.fn>,
  user: AuthenticatedFirebaseUser = administrator,
  identityFetch?: typeof fetch,
  adminOverrides: Partial<AdminDependencies> = {},
) {
  return createApp({
    admin: {
      verifyToken: vi.fn().mockResolvedValue(user),
      getAccessToken: vi.fn().mockResolvedValue('server-token'),
      databaseFetch: fetchMock as unknown as typeof fetch,
      now: () => 1_777_777_777_000,
      identityFetch,
      generateTemporaryPassword: () => 'Cedar-River-482!',
      sendPeopleAccessInvitation: vi.fn().mockResolvedValue({ messageId: 'brevo-message-1' }),
      ...adminOverrides,
    },
  })
}

describe('Administrator routes', () => {
  it('requires Firebase authentication for the administrator session', async () => {
    const fetchMock = vi.fn()
    const app = createTestApp(fetchMock)
    const response = await app.request('/api/v1/admin/session', {}, bindings)
    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('registers a new non-chief account as pending', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      void init
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/chiefUid.json')) {
        return Promise.resolve(jsonResponse('existing-chief'))
      }
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse(null))
      }
      if (url.endsWith('/administration/adminHierarchy/users.json')) {
        return Promise.resolve(jsonResponse({}))
      }
      return Promise.resolve(jsonResponse({}))
    })
    const app = createTestApp(fetchMock)
    const response = await app.request(
      authenticatedRequest('/api/v1/admin/session'),
      undefined,
      bindings,
    )
    const body = await response.json() as { data: { account: { status: string; role: string } } }
    expect(response.status).toBe(200)
    expect(body.data.account).toMatchObject({ role: 'administrator', status: 'pending' })
    const patchCall = fetchMock.mock.calls.find(call => (call[1] as RequestInit)?.method === 'PATCH')
    const stored = JSON.parse(String((patchCall?.[1] as RequestInit).body))
    expect(stored).toMatchObject({ status: 'pending', authority: { manageAssessmentForms: false } })
  })

  it('initializes the exact Pastor as chief when no chief exists', async () => {
    const pastor = { ...administrator, uid: 'pastor-uid', email: 'rev.ibrahim@lincministry.com' }
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'PATCH') return Promise.resolve(jsonResponse({}))
      if (url.endsWith('/administration/adminHierarchy/chiefUid.json')) return Promise.resolve(jsonResponse(null))
      if (url.endsWith('/administration/adminHierarchy/users/pastor-uid.json')) return Promise.resolve(jsonResponse(null))
      if (url.endsWith('/administration/adminHierarchy/users.json')) {
        return Promise.resolve(jsonResponse({
          'pastor-uid': { role: 'chief', status: 'active', email: pastor.email, authority: {} },
        }))
      }
      return Promise.resolve(jsonResponse({}))
    })
    const app = createTestApp(fetchMock, pastor)
    const response = await app.request(authenticatedRequest('/api/v1/admin/session'), undefined, bindings)
    const body = await response.json() as { data: { account: { role: string; authority: Record<string, boolean> } } }
    expect(response.status).toBe(200)
    expect(body.data.account.role).toBe('chief')
    expect(body.data.account.authority.manageAssessmentForms).toBe(true)
    expect(body.data.account.authority.manageArchives).toBe(true)
  })

  it('denies authority allocation to a non-chief administrator', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      uid: administrator.uid,
      email: administrator.email,
      role: 'administrator',
      status: 'active',
      authority: { manageAssessmentForms: true },
    }))
    const app = createTestApp(fetchMock)
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/users/target-uid/authority',
      'PATCH',
      {
        manageAssessmentForms: true,
        manageCarousel: false,
        manageAttendance: false,
        manageArchives: false,
        manageNextGenQa: false,
        managePeopleAccess: false,
      },
    ), undefined, bindings)
    expect(response.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates Firebase with a memorable password, persists its UID, then sends the access email', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          uid: administrator.uid, email: administrator.email, role: 'administrator', status: 'active',
          authority: { managePeopleAccess: true },
        }))
      }
      if (url.endsWith('/peopleDevelopment/members.json')) {
        return Promise.resolve(jsonResponse({
          'member-1': { identifier: 'PERSON-1', fullName: 'Person One', email: 'person@example.com' },
        }))
      }
      if (init?.method === 'PATCH') return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(null))
    })
    const identityFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('accounts:lookup')) return Promise.resolve(jsonResponse({}))
      const payload = JSON.parse(String(init?.body)) as { password: string }
      expect(payload.password).toBe('Cedar-River-482!')
      expect(payload.password).not.toBe('PERSON-1')
      return Promise.resolve(jsonResponse({ localId: 'firebase-person-uid', email: 'person@example.com', displayName: 'Person One' }))
    })
    const sendInvitation = vi.fn(async (_bindings, invitation) => {
      const firebaseWriteAlreadyHappened = databaseFetch.mock.calls.some(call => {
        if (!String(call[0]).endsWith('/peopleDevelopment/members/member-1.json')) return false
        const payload = JSON.parse(String((call[1] as RequestInit).body)) as { firebaseUid?: string }
        return payload.firebaseUid === 'firebase-person-uid'
      })
      expect(firebaseWriteAlreadyHappened).toBe(true)
      expect(invitation).toMatchObject({
        email: 'person@example.com',
        locale: 'en',
        temporaryPassword: 'Cedar-River-482!',
      })
      return { messageId: 'brevo-message-1' }
    })
    const app = createTestApp(databaseFetch, administrator, identityFetch as typeof fetch, {
      sendPeopleAccessInvitation: sendInvitation,
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/people-access/migrate', 'POST', {},
    ), undefined, bindings)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { summary: { complete: 1 } } })
    const linkWrite = databaseFetch.mock.calls.find(call => String(call[0]).endsWith('/peopleDevelopment/members/member-1.json'))
    const payload = JSON.parse(String((linkWrite?.[1] as RequestInit).body))
    expect(payload).toMatchObject({ firebaseUid: 'firebase-person-uid', authMigration: { status: 'firebase_ready', method: 'created' } })
    const completionWrite = databaseFetch.mock.calls
      .filter(call => String(call[0]).endsWith('/peopleDevelopment/members/member-1.json'))
      .map(call => JSON.parse(String((call[1] as RequestInit).body)))
      .find(write => write.authMigration?.status === 'complete')
    expect(completionWrite).toMatchObject({
      authLocale: 'en',
      authMigration: { status: 'complete', invitationStatus: 'sent', invitationMessageId: 'brevo-message-1' },
    })
    expect(sendInvitation).toHaveBeenCalledTimes(1)
  })

  it('resolves Arabic from the source assessment and sends an Arabic invitation', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          uid: administrator.uid, email: administrator.email, role: 'administrator', status: 'active',
          authority: { managePeopleAccess: true },
        }))
      }
      if (url.endsWith('/peopleDevelopment/members.json')) {
        return Promise.resolve(jsonResponse({
          'member-ar': {
            fullName: 'شخص عربي', email: 'arabic@example.com', sourcePath: 'form', sourceKeys: ['response-ar'],
          },
        }))
      }
      if (url.endsWith('/form.json')) {
        return Promise.resolve(jsonResponse({
          'response-ar': { interfaceLanguageUsed: 'Arabic' },
        }))
      }
      if (init?.method === 'PATCH') return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(null))
    })
    const identityFetch = vi.fn((input: string | URL | Request) => {
      if (String(input).includes('accounts:lookup')) return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse({ localId: 'firebase-ar-uid', email: 'arabic@example.com', displayName: 'شخص عربي' }))
    })
    const sendInvitation = vi.fn().mockResolvedValue({ messageId: 'arabic-message' })
    const app = createTestApp(databaseFetch, administrator, identityFetch as typeof fetch, {
      sendPeopleAccessInvitation: sendInvitation,
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/people-access/migrate', 'POST', { memberKeys: ['member-ar'] },
    ), undefined, bindings)
    expect(response.status).toBe(200)
    expect(sendInvitation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      fullName: 'شخص عربي',
      email: 'arabic@example.com',
      locale: 'ar',
      temporaryPassword: 'Cedar-River-482!',
    }))
    const persisted = databaseFetch.mock.calls
      .filter(call => String(call[0]).endsWith('/peopleDevelopment/members/member-ar.json'))
      .map(call => JSON.parse(String((call[1] as RequestInit).body)))
      .find(write => write.authMigration?.status === 'complete')
    expect(persisted).toMatchObject({ authLocale: 'ar' })
  })

  it('reports missing email data, accepts a short legacy identifier, and never returns identifiers', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          uid: administrator.uid, email: administrator.email, role: 'administrator', status: 'active',
          authority: { managePeopleAccess: true },
        }))
      }
      if (url.endsWith('/peopleDevelopment/members.json')) {
        return Promise.resolve(jsonResponse({
          missing: { identifier: 'PERSON-2', fullName: 'Missing Email' },
          short: { identifier: 'A12', fullName: 'Short Password', email: 'short@example.com' },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createTestApp(databaseFetch)
    const response = await app.request(authenticatedRequest('/api/v1/admin/people-access'), undefined, bindings)
    const body = await response.json() as { data: { people: Array<Record<string, unknown>> } }
    expect(response.status).toBe(200)
    expect(body.data.people).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberKey: 'missing', status: 'missing_email' }),
      expect.objectContaining({ memberKey: 'short', status: 'ready' }),
    ]))
    expect(body.data.people.every(person => !('identifier' in person))).toBe(true)
  })

  it('retries email on the same Firebase UID without creating the account again', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          uid: administrator.uid, email: administrator.email, role: 'administrator', status: 'active',
          authority: { managePeopleAccess: true },
        }))
      }
      if (url.endsWith('/peopleDevelopment/members.json')) {
        return Promise.resolve(jsonResponse({
          'member-1': {
            fullName: 'Person One',
            email: 'person@example.com',
            firebaseUid: 'firebase-person-uid',
            authMigration: { status: 'email_failed', method: 'created', invitationStatus: 'failed' },
          },
        }))
      }
      if (init?.method === 'PATCH') return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(null))
    })
    const identityFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toContain('accounts:update')
      const payload = JSON.parse(String(init?.body)) as { localId: string; password: string }
      expect(payload).toMatchObject({ localId: 'firebase-person-uid', password: 'Cedar-River-482!' })
      return Promise.resolve(jsonResponse({ localId: 'firebase-person-uid' }))
    })
    const sendInvitation = vi.fn().mockRejectedValue(new Error('email unavailable'))
    const app = createTestApp(databaseFetch, administrator, identityFetch as typeof fetch, {
      sendPeopleAccessInvitation: sendInvitation,
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/people-access/migrate', 'POST', { memberKeys: ['member-1'] },
    ), undefined, bindings)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { summary: { email_failed: 1 } } })
    expect(identityFetch).toHaveBeenCalledTimes(1)
    expect(identityFetch.mock.calls.some(call => String(call[0]).includes('accounts:signUp'))).toBe(false)
    expect(sendInvitation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      email: 'person@example.com',
      locale: 'en',
      temporaryPassword: 'Cedar-River-482!',
    }))
  })

  it('does not rerun Firebase or email after both migration steps are complete', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          uid: administrator.uid, email: administrator.email, role: 'administrator', status: 'active',
          authority: { managePeopleAccess: true },
        }))
      }
      if (url.endsWith('/peopleDevelopment/members.json')) {
        return Promise.resolve(jsonResponse({
          'member-1': {
            fullName: 'Person One', email: 'person@example.com', firebaseUid: 'firebase-person-uid',
            authMigration: { status: 'complete', method: 'created', invitationStatus: 'sent' },
          },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const identityFetch = vi.fn()
    const sendInvitation = vi.fn()
    const app = createTestApp(databaseFetch, administrator, identityFetch as unknown as typeof fetch, {
      sendPeopleAccessInvitation: sendInvitation,
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/people-access/migrate', 'POST', { memberKeys: ['member-1'] },
    ), undefined, bindings)
    expect(await response.json()).toMatchObject({ data: { summary: { already_complete: 1 } } })
    expect(identityFetch).not.toHaveBeenCalled()
    expect(sendInvitation).not.toHaveBeenCalled()
  })

  it('denies LInC Archives to an administrator without archive authority', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      uid: administrator.uid,
      email: administrator.email,
      role: 'administrator',
      status: 'active',
      authority: { manageArchives: false },
    }))
    const app = createTestApp(fetchMock)
    const response = await app.request(
      authenticatedRequest('/api/v1/admin/archives/folders'),
      undefined,
      bindings,
    )
    const body = await response.json() as { error: { code: string } }
    expect(response.status).toBe(403)
    expect(body.error.code).toBe('ADMIN_ARCHIVES_ACCESS_REQUIRED')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lists normalized archive folders for an allocated administrator', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      void init
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/folders.json')) {
        return Promise.resolve(jsonResponse({
          child: { name: 'Children', parentId: 'root-folder', createdAt: 20 },
          invalid: { parentId: null },
          'root-folder': { name: 'Administration', parentId: null, createdAt: 10 },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createTestApp(fetchMock)
    const response = await app.request(
      authenticatedRequest('/api/v1/admin/archives/folders'),
      undefined,
      bindings,
    )
    const body = await response.json() as {
      data: { folders: Array<{ id: string; name: string; parentId: string | null }> }
    }
    expect(response.status).toBe(200)
    expect(body.data.folders).toEqual([
      expect.objectContaining({ id: 'root-folder', name: 'Administration', parentId: null }),
      expect.objectContaining({ id: 'child', name: 'Children', parentId: 'root-folder' }),
    ])
  })

  it('creates a nested archive folder with server-owned metadata', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/folders.json')) {
        return Promise.resolve(jsonResponse({
          parent: { name: 'Leadership', parentId: null },
        }))
      }
      if (init?.method === 'PATCH' && url.endsWith('/administration/archives/folders/folder-1.json')) {
        return Promise.resolve(jsonResponse({}))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createApp({
      admin: {
        verifyToken: vi.fn().mockResolvedValue(administrator),
        getAccessToken: vi.fn().mockResolvedValue('server-token'),
        databaseFetch: fetchMock as unknown as typeof fetch,
        now: () => 1_777_777_777_000,
        generateId: () => 'folder-1',
      },
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/folders',
      'POST',
      { name: '  Board Minutes  ', parentId: 'parent' },
    ), undefined, bindings)
    const body = await response.json() as {
      data: { folder: { id: string; name: string; parentId: string | null; createdByUid: string } }
    }
    expect(response.status).toBe(201)
    expect(body.data.folder).toMatchObject({
      id: 'folder-1',
      name: 'Board Minutes',
      parentId: 'parent',
      createdByUid: administrator.uid,
    })
    const patchCall = fetchMock.mock.calls.find(call =>
      (call[1] as RequestInit | undefined)?.method === 'PATCH' &&
      String(call[0]).endsWith('/administration/archives/folders/folder-1.json')
    )
    expect(patchCall).toBeDefined()
  })

  it('refuses to delete an archive folder that contains nested folders', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      void init
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/folders.json')) {
        return Promise.resolve(jsonResponse({
          parent: { name: 'Leadership', parentId: null },
          child: { name: 'Minutes', parentId: 'parent' },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createTestApp(fetchMock)
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/folders/parent',
      'DELETE',
    ), undefined, bindings)
    const body = await response.json() as { error: { code: string } }
    expect(response.status).toBe(409)
    expect(body.error.code).toBe('ARCHIVE_FOLDER_NOT_EMPTY')
    expect(fetchMock.mock.calls.some(call =>
      (call[1] as RequestInit | undefined)?.method === 'DELETE'
    )).toBe(false)
  })

  it('lists persistent archive files for an allocated administrator', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/files.json')) {
        return Promise.resolve(jsonResponse({
          ready: {
            folderId: null,
            objectKey: 'archives/_root/ready/report.pdf',
            name: 'report.pdf',
            size: 120,
            contentType: 'application/pdf',
            status: 'ready',
            createdAt: 20,
            createdByUid: administrator.uid,
            updatedAt: 21,
          },
          invalid: { name: 'missing-object-key.pdf' },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createTestApp(fetchMock)
    const response = await app.request(
      authenticatedRequest('/api/v1/admin/archives/files'),
      undefined,
      bindings,
    )
    const body = await response.json() as {
      data: { files: Array<{ id: string; name: string; objectKey?: string }> }
    }

    expect(response.status).toBe(200)
    expect(body.data.files).toEqual([
      expect.objectContaining({ id: 'ready', name: 'report.pdf' }),
    ])
    expect(body.data.files[0]).not.toHaveProperty('objectKey')
  })

  it('prepares and records a private archive upload', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (init?.method === 'PATCH' && url.endsWith('/administration/archives/files/file-1.json')) {
        return Promise.resolve(jsonResponse({}))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const archiveStorage = {
      createUploadUrl: vi.fn().mockResolvedValue({
        url: 'https://signed.example/upload',
        expiresAt: 1_777_778_077_000,
      }),
    } as unknown as ArchiveStorage
    const app = createApp({
      admin: {
        verifyToken: vi.fn().mockResolvedValue(administrator),
        getAccessToken: vi.fn().mockResolvedValue('server-token'),
        databaseFetch: fetchMock as unknown as typeof fetch,
        now: () => 1_777_777_777_000,
        generateId: () => 'file-1',
        archiveStorage,
      },
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/files/upload-url',
      'POST',
      {
        name: 'Board Minutes.pdf',
        folderId: null,
        size: 420,
        contentType: 'application/pdf',
      },
    ), undefined, bindings)
    const body = await response.json() as {
      data: { file: { id: string; status: string }; uploadUrl: string }
    }

    expect(response.status).toBe(201)
    expect(body.data).toMatchObject({
      file: { id: 'file-1', status: 'pending' },
      uploadUrl: 'https://signed.example/upload',
    })
    expect(archiveStorage.createUploadUrl).toHaveBeenCalledWith(
      'archives/_root/file-1/Board Minutes.pdf',
    )
    const storedCall = fetchMock.mock.calls.find(call =>
      (call[1] as RequestInit | undefined)?.method === 'PATCH' &&
      String(call[0]).endsWith('/administration/archives/files/file-1.json')
    )
    expect(JSON.parse(String((storedCall?.[1] as RequestInit).body))).toMatchObject({
      name: 'Board Minutes.pdf',
      status: 'pending',
      size: 420,
    })
  })

  it('verifies an uploaded object before marking the archive file ready', async () => {
    const pendingFile = {
      folderId: null,
      objectKey: 'archives/_root/file-1/report.pdf',
      name: 'report.pdf',
      size: 420,
      contentType: 'application/pdf',
      status: 'pending',
      createdAt: 10,
      createdByUid: administrator.uid,
      updatedAt: 10,
    }
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/files/file-1.json') && init?.method === 'GET') {
        return Promise.resolve(jsonResponse(pendingFile))
      }
      if (init?.method === 'PATCH') return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(null))
    })
    const archiveStorage = {
      inspectObject: vi.fn().mockResolvedValue({ size: 420, contentType: 'application/pdf' }),
    } as unknown as ArchiveStorage
    const app = createApp({
      admin: {
        verifyToken: vi.fn().mockResolvedValue(administrator),
        getAccessToken: vi.fn().mockResolvedValue('server-token'),
        databaseFetch: fetchMock as unknown as typeof fetch,
        now: () => 99,
        archiveStorage,
      },
    })
    const response = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/files/file-1/complete',
      'POST',
    ), undefined, bindings)
    const body = await response.json() as { data: { file: { status: string } } }

    expect(response.status).toBe(200)
    expect(body.data.file.status).toBe('ready')
    expect(archiveStorage.inspectObject).toHaveBeenCalledWith(pendingFile.objectKey)
    const completionCall = fetchMock.mock.calls.find(call =>
      (call[1] as RequestInit | undefined)?.method === 'PATCH' &&
      String(call[0]).endsWith('/administration/archives/files/file-1.json')
    )
    expect(JSON.parse(String((completionCall?.[1] as RequestInit).body))).toMatchObject({
      status: 'ready',
      size: 420,
    })
  })

  it('signs downloads and deletes private objects through the archive service', async () => {
    const readyFile = {
      folderId: 'minutes',
      objectKey: 'archives/minutes/file-1/report.pdf',
      name: 'report.pdf',
      size: 420,
      contentType: 'application/pdf',
      status: 'ready',
      createdAt: 10,
      createdByUid: administrator.uid,
      updatedAt: 10,
    }
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/admin-uid.json')) {
        return Promise.resolve(jsonResponse({
          email: administrator.email,
          role: 'administrator',
          status: 'active',
          authority: { manageArchives: true },
        }))
      }
      if (url.endsWith('/administration/archives/files/file-1.json') && init?.method === 'GET') {
        return Promise.resolve(jsonResponse(readyFile))
      }
      if (init?.method === 'DELETE') return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(null))
    })
    const archiveStorage = {
      createDownloadUrl: vi.fn().mockResolvedValue({
        url: 'https://signed.example/download',
        expiresAt: 400,
      }),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    } as unknown as ArchiveStorage
    const app = createApp({
      admin: {
        verifyToken: vi.fn().mockResolvedValue(administrator),
        getAccessToken: vi.fn().mockResolvedValue('server-token'),
        databaseFetch: fetchMock as unknown as typeof fetch,
        archiveStorage,
      },
    })

    const downloadResponse = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/files/file-1/download-url',
    ), undefined, bindings)
    expect(downloadResponse.status).toBe(200)
    expect(await downloadResponse.json()).toMatchObject({
      data: { downloadUrl: 'https://signed.example/download' },
    })

    const deleteResponse = await app.request(authenticatedRequest(
      '/api/v1/admin/archives/files/file-1',
      'DELETE',
    ), undefined, bindings)
    expect(deleteResponse.status).toBe(200)
    expect(archiveStorage.createDownloadUrl).toHaveBeenCalledWith(
      readyFile.objectKey,
      readyFile.name,
    )
    expect(archiveStorage.deleteObject).toHaveBeenCalledWith(readyFile.objectKey)
    expect(fetchMock.mock.calls.some(call =>
      (call[1] as RequestInit | undefined)?.method === 'DELETE' &&
      String(call[0]).endsWith('/administration/archives/files/file-1.json')
    )).toBe(true)
  })
})
