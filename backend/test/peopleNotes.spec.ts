import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
}

const verifiedPastor: AuthenticatedFirebaseUser = {
  uid: 'pastor-uid',
  email: 'Rev.Ibrahim@LinCMinistry.com',
  emailVerified: false,
  name: null,
  picture: null,
  signInProvider: 'password',
}

function apiRequest(
  path: string,
  method = 'GET',
  body?: unknown,
  token = 'valid-token',
) {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createTestApp(fetchMock: ReturnType<typeof vi.fn>) {
  return createApp({
    peopleNotes: {
      verifyToken: vi.fn().mockResolvedValue(verifiedPastor),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 1_777_777_777_000,
    },
  })
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

describe('People Notes routes', () => {
  it('requires a Firebase Bearer token', async () => {
    const fetchMock = vi.fn()
    const app = createTestApp(fetchMock)

    const response = await app.request(
      '/api/v1/people-notes',
      {},
      mockBindings,
    )

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an authenticated non-Pastor before Firebase access', async () => {
    const fetchMock = vi.fn()
    const app = createApp({
      peopleNotes: {
        verifyToken: vi.fn().mockResolvedValue({
          ...verifiedPastor,
          email: 'member@lincministry.com',
        }),
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    })

    const response = await app.request(
      apiRequest('/api/v1/people-notes'),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists and normalizes People Notes with no-store caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        'person-b': {
          fullName: 'Zed Person',
          contact: 'zed@example.com',
          createdAt: 10,
          updatedAt: 20,
          createdBy: 'pastor@example.com',
          items: {
            'item-1': {
              type: 'growth',
              title: 'Follow up',
              updatedAt: 30,
              comments: {
                'comment-1': {
                  text: 'Call next week',
                  createdAt: 40,
                  createdBy: 'pastor@example.com',
                },
              },
            },
          },
        },
        'person-a': { fullName: 'Ada Person' },
      }),
    )
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { people: Array<{ id: string; items: unknown[] }> }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(body.data.people.map(person => person.id)).toEqual([
      'person-a',
      'person-b',
    ])
    expect(body.data.people[1].items).toHaveLength(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/peopleNotes.json?auth=valid-token',
    )
  })

  it('rejects unknown person fields without calling Firebase', async () => {
    const fetchMock = vi.fn()
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes', 'POST', {
        fullName: 'Ada Person',
        unexpected: true,
      }),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates a person with backend-controlled audit fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ name: 'person-new' }),
    )
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes', 'POST', {
        fullName: '  Ada Person  ',
        contact: ' ada@example.com ',
      }),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { id: string }
    }

    expect(response.status).toBe(201)
    expect(body.data.id).toBe('person-new')
    expect(requestBody(fetchMock)).toEqual({
      fullName: 'Ada Person',
      contact: 'ada@example.com',
      createdAt: 1_777_777_777_000,
      updatedAt: 1_777_777_777_000,
      createdBy: 'rev.ibrahim@lincministry.com',
    })
  })

  it('creates a development item and updates the parent timestamp', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: 'item-new' }))
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 1 }))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest(
        '/api/v1/people-notes/person-1/items',
        'POST',
        {
          type: 'strength',
          title: 'Encouragement',
          description: '',
          dateAdded: '2026-08-03',
          latestFollowUpDate: '',
        },
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestBody(fetchMock, 0)).toMatchObject({
      type: 'strength',
      title: 'Encouragement',
      createdBy: 'rev.ibrahim@lincministry.com',
    })
    expect(requestBody(fetchMock, 1)).toEqual({
      updatedAt: 1_777_777_777_000,
    })
  })

  it('adds a comment and updates item and person timestamps', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: 'comment-new' }))
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 1 }))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest(
        '/api/v1/people-notes/person-1/items/item-1/comments',
        'POST',
        { text: '  Call next week  ' },
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(requestBody(fetchMock, 0)).toMatchObject({
      text: 'Call next week',
      createdBy: 'rev.ibrahim@lincministry.com',
    })
    expect(requestBody(fetchMock, 1)).toEqual({
      'items/item-1/updatedAt': 1_777_777_777_000,
      updatedAt: 1_777_777_777_000,
    })
  })

  it('updates a follow-up date atomically with timestamps', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest(
        '/api/v1/people-notes/person-1/items/item-1/follow-up',
        'PATCH',
        { latestFollowUpDate: '2026-09-15' },
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(200)
    expect(requestBody(fetchMock)).toEqual({
      'items/item-1/latestFollowUpDate': '2026-09-15',
      'items/item-1/updatedAt': 1_777_777_777_000,
      updatedAt: 1_777_777_777_000,
    })
  })

  it('deletes a person', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes/person-1', 'DELETE'),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(200)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
  })

  it('deletes an item with an atomic null patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest(
        '/api/v1/people-notes/person-1/items/item-1',
        'DELETE',
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(200)
    expect(requestBody(fetchMock)).toEqual({
      'items/item-1': null,
      updatedAt: 1_777_777_777_000,
    })
  })

  it('deletes a comment with an atomic null patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest(
        '/api/v1/people-notes/person-1/items/item-1/comments/comment-1',
        'DELETE',
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(200)
    expect(requestBody(fetchMock)).toEqual({
      'items/item-1/comments/comment-1': null,
      'items/item-1/updatedAt': 1_777_777_777_000,
      updatedAt: 1_777_777_777_000,
    })
  })

  it('returns 503 when the database URL is missing', async () => {
    const fetchMock = vi.fn()
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes'),
      undefined,
      {
        ...mockBindings,
        FIREBASE_DATABASE_URL: '',
      },
    )

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps Firebase Rules denial to HTTP 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Permission denied' }, 401),
    )
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(403)
    expect(body.error.code).toBe(
      'PEOPLE_NOTES_DATABASE_ACCESS_DENIED',
    )
  })

  it('maps Firebase network failures to HTTP 502', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError('network unavailable'))
    const app = createTestApp(fetchMock)

    const response = await app.request(
      apiRequest('/api/v1/people-notes'),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(502)
  })

  it('allows People Notes PATCH and DELETE CORS preflight', async () => {
    const app = createApp()

    for (const method of ['PATCH', 'DELETE']) {
      const response = await app.request(
        '/api/v1/people-notes/person-1/items/item-1/follow-up',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://lincministry.com',
            'Access-Control-Request-Method': method,
            'Access-Control-Request-Headers':
              'Authorization, Content-Type',
          },
        },
        mockBindings,
      )

      expect(response.status).toBe(204)
      expect(
        response.headers.get('Access-Control-Allow-Methods'),
      ).toContain(method)
    }
  })
})
