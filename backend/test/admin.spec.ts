import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const bindings = {
  BREVO_API_KEY: 'test-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
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
) {
  return createApp({
    admin: {
      verifyToken: vi.fn().mockResolvedValue(user),
      getAccessToken: vi.fn().mockResolvedValue('server-token'),
      databaseFetch: fetchMock as unknown as typeof fetch,
      now: () => 1_777_777_777_000,
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
    const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
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
      },
    ), undefined, bindings)
    expect(response.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
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
    const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
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
    const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
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
})
