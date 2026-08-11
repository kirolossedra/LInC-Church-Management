import { afterEach, describe, expect, it, vi } from 'vitest'
import app, { createApp } from '../src/index'
import { FirebaseServiceAccountError } from '../src/security/firebaseServiceAccount'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
}

const jsonDatabaseResponse = (value: unknown, status = 200) => new Response(
  JSON.stringify(value),
  { status, headers: { 'Content-Type': 'application/json' } },
)

const firebaseUser = {
  uid: 'member-uid',
  email: 'member@example.com',
  emailVerified: false,
  name: 'Member',
  picture: null,
  signInProvider: 'password',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LinC backend', () => {
  it('returns Hello Hono from the root route', async () => {
    const response = await app.request('/', {}, mockBindings)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Hello Hono!')
  })

  it('exposes the deployed NextGen contract health endpoint', async () => {
    const response = await app.request(
      '/api/v1/nextgen/health',
      {},
      mockBindings,
    )
    const body = (await response.json()) as {
      success: boolean
      data: { service: string; status: string; contractVersion: number }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(body).toEqual({
      success: true,
      data: {
        service: 'nextgen',
        status: 'ok',
        contractVersion: 1,
      },
    })
  })

  it.each([
    '/api/v1/nextgen/qa/sessions',
    '/api/v1/nextgen/files',
    '/api/v1/nextgen/files/folders',
  ])('mounts the protected NextGen endpoint %s', async endpoint => {
    const response = await app.request(endpoint, {}, mockBindings)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('returns a meaningful JSON error for an unknown authenticated NextGen endpoint', async () => {
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue({
          uid: 'member-uid',
          email: 'member@example.com',
          emailVerified: false,
          name: 'Member',
          picture: null,
          signInProvider: 'password',
        }),
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/not-a-real-route',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )
    const body = (await response.json()) as { error: { code: string; message: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NEXTGEN_ROUTE_NOT_FOUND')
    expect(body.error.message).toContain('does not exist')
  })

  it('identifies a Firebase service-account authentication failure', async () => {
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockRejectedValue(
          new FirebaseServiceAccountError('Google OAuth rejected the credentials.'),
        ),
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/qa/sessions',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('NEXTGEN_FIREBASE_AUTH_UNAVAILABLE')
    expect(body.error.message).toContain('authentication')
  })

  it('identifies the Firebase Database HTTP status without exposing credentials', async () => {
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: vi.fn().mockResolvedValue(
          jsonDatabaseResponse({ error: 'Permission denied' }, 403),
        ) as typeof fetch,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/qa/sessions',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('NEXTGEN_DATABASE_REQUEST_FAILED')
    expect(body.error.message).toContain('HTTP 403')
    expect(JSON.stringify(body)).not.toContain('firebase-access-token')
  })

  it('returns closed QA sessions to members as visible records while keeping drafts private', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/nextGenPortal/qa/migrations/legacyQaSession1.json')) {
        return Promise.resolve(jsonDatabaseResponse({ complete: true }))
      }
      if (url.endsWith('/nextGenPortal/qa/sessions/qa-session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          title: 'QA Session 1', status: 'closed', createdAt: 1, updatedAt: 1,
        }))
      }
      if (url.endsWith('/nextGenPortal/qa/sessions.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          open: { title: 'Open Session', status: 'open', createdAt: 3, updatedAt: 3 },
          'qa-session-1': { title: 'QA Session 1', status: 'closed', createdAt: 1, updatedAt: 1 },
          draft: { title: 'Draft Session', status: 'draft', createdAt: 4, updatedAt: 4 },
        }))
      }
      return Promise.resolve(jsonDatabaseResponse(null))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/qa/sessions',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )
    const body = await response.json() as {
      data: { sessions: Array<{ title: string; status: string }> }
    }

    expect(response.status).toBe(200)
    expect(body.data.sessions.map(item => [item.title, item.status])).toEqual([
      ['Open Session', 'open'],
      ['QA Session 1', 'closed'],
    ])
  })

  it('lets an authenticated member create a question with fixed voting choices', async () => {
    const writes: Array<{ url: string; method: string; body: unknown }> = []
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : null
      if (method === 'PATCH') writes.push({ url, method, body })
      if (url.endsWith('/nextGenPortal/qa/sessions/session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          title: 'Member Questions', status: 'open', createdAt: 1, updatedAt: 1,
        }))
      }
      return Promise.resolve(jsonDatabaseResponse(body))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
        generateId: () => 'member-question-1',
        now: () => 25,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/qa/sessions/session-1/questions',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'What should we discuss?' }),
      },
      mockBindings,
    )
    const body = await response.json() as { data: { question: { options: Array<{ label: string }>; createdByUid: string } } }

    expect(response.status).toBe(201)
    expect(body.data.question.options.map(option => option.label)).toEqual(['Upvote', 'Downvote'])
    expect(body.data.question.createdByUid).toBe(firebaseUser.uid)
    expect(writes.some(write => write.url.endsWith('/nextGenPortal/qa/questions/session-1/member-question-1.json'))).toBe(true)
  })

  it('lets an authenticated member change an existing vote through the HTTP contract', async () => {
    const writes: Array<{ url: string; body: Record<string, unknown> }> = []
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
      if (method === 'PATCH') writes.push({ url, body })
      if (url.endsWith('/nextGenPortal/qa/sessions/session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({ title: 'Voting', status: 'open', createdAt: 1, updatedAt: 1 }))
      }
      if (url.endsWith('/nextGenPortal/qa/questions/session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          'question-1': {
            prompt: 'Which question?',
            options: [{ id: 'option-1', label: 'Upvote' }, { id: 'option-2', label: 'Downvote' }],
            createdAt: 2,
            updatedAt: 2,
          },
        }))
      }
      if (url.endsWith('/nextGenPortal/qa/votes/session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          'question-1': {},
        }))
      }
      if (url.includes('/nextGenPortal/qa/votes/session-1/question-1/') && method === 'GET') {
        return Promise.resolve(jsonDatabaseResponse({
          participantUid: firebaseUser.uid,
          optionId: 'option-1',
          voteType: 'upvote',
          createdAt: 10,
          updatedAt: 10,
        }))
      }
      return Promise.resolve(jsonDatabaseResponse(method === 'GET' ? null : body))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
        now: () => 30,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/qa/sessions/session-1/questions/question-1/votes',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType: 'downvote' }),
      },
      mockBindings,
    )
    const body = await response.json() as { data: { submitted: boolean; voteType: string } }
    const voteWrite = writes.find(write => write.url.includes('/nextGenPortal/qa/votes/session-1/question-1/'))

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ submitted: true, voteType: 'downvote' })
    expect(voteWrite?.body).toMatchObject({ optionId: 'option-2', voteType: 'downvote', createdAt: 10, updatedAt: 30 })
  })

  it('lets an allocated administrator select a member question for discussion', async () => {
    const writes: Array<{ url: string; body: Record<string, unknown> }> = []
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
      if (method === 'PATCH') writes.push({ url, body })
      if (url.endsWith('/administration/adminHierarchy/users/member-uid.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          email: firebaseUser.email,
          role: 'administrator',
          status: 'active',
          authority: { manageNextGenQa: true },
        }))
      }
      if (url.endsWith('/nextGenPortal/qa/sessions/session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse({ title: 'Discussion', status: 'open', createdAt: 1, updatedAt: 1 }))
      }
      if (url.endsWith('/nextGenPortal/qa/questions/session-1/question-1.json') && method === 'GET') {
        return Promise.resolve(jsonDatabaseResponse({
          prompt: 'Discuss this?',
          options: [{ id: 'option-1', label: 'Upvote' }, { id: 'option-2', label: 'Downvote' }],
          createdAt: 2,
          updatedAt: 2,
        }))
      }
      return Promise.resolve(jsonDatabaseResponse(method === 'GET' ? null : body))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
        now: () => 35,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/pastor/qa/sessions/session-1/questions/question-1',
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedForDiscussion: true }),
      },
      mockBindings,
    )
    const responseBody = await response.json() as { data: { question: { selectedForDiscussion: boolean } } }
    const selectionWrite = writes.find(write => write.url.endsWith('/nextGenPortal/qa/questions/session-1/question-1.json'))

    expect(response.status).toBe(200)
    expect(responseBody.data.question.selectedForDiscussion).toBe(true)
    expect(selectionWrite?.body).toMatchObject({ selectedForDiscussion: true, selectedByUid: firebaseUser.uid, selectedAt: 35 })
  })

  it('allows an administrator with NextGen QA authority to use the management endpoint', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/member-uid.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          email: firebaseUser.email,
          role: 'administrator',
          status: 'active',
          authority: { manageNextGenQa: true },
        }))
      }
      if (url.endsWith('/nextGenPortal/qa/migrations/legacyQaSession1.json')) {
        return Promise.resolve(jsonDatabaseResponse({ complete: true }))
      }
      if (url.endsWith('/nextGenPortal/qa/sessions/qa-session-1.json')) {
        return Promise.resolve(jsonDatabaseResponse(null))
      }
      if (url.endsWith('/nextGenPortal/qa/sessions.json')) {
        return Promise.resolve(jsonDatabaseResponse({}))
      }
      return Promise.resolve(jsonDatabaseResponse(null))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/pastor/qa/sessions',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, data: { sessions: [] } })
  })

  it('returns a meaningful authorization error to an administrator without NextGen QA authority', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/administration/adminHierarchy/users/member-uid.json')) {
        return Promise.resolve(jsonDatabaseResponse({
          email: firebaseUser.email,
          role: 'administrator',
          status: 'active',
          authority: { manageNextGenQa: false },
        }))
      }
      return Promise.resolve(jsonDatabaseResponse(null))
    })
    const authenticatedApp = createApp({
      nextGenPortal: {
        verifyToken: vi.fn().mockResolvedValue(firebaseUser),
        getAccessToken: vi.fn().mockResolvedValue('firebase-access-token'),
        databaseFetch: databaseFetch as typeof fetch,
      },
    })
    const response = await authenticatedApp.request(
      '/api/v1/nextgen/pastor/qa/sessions',
      { headers: { Authorization: 'Bearer valid-token' } },
      mockBindings,
    )
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('NEXTGEN_QA_MANAGEMENT_ACCESS_REQUIRED')
    expect(body.error.message).toContain('allocated administrator')
  })

  it('rejects an invalid email test request body', async () => {
    const response = await app.request(
      '/api/v1/email/test',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox: 'yes',
        }),
      },
      mockBindings,
    )

    const responseBody = (await response.json()) as {
      success: boolean
      error: {
        code: string
        message: string
      }
    }

    expect(response.status).toBe(400)
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
  })

  it('handles a successful Brevo sandbox request', async () => {
    const brevoFetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            messageId: 'mock-brevo-message-id',
          }),
          {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )

    const response = await app.request(
      '/api/v1/email/test',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox: true,
        }),
      },
      mockBindings,
    )

    const responseBody = (await response.json()) as {
      success: boolean
      data: {
        sandbox: boolean
        messageId: string
      }
    }

    expect(brevoFetchMock).toHaveBeenCalledTimes(1)

    expect(brevoFetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    expect(response.status).toBe(201)
    expect(responseBody.success).toBe(true)
    expect(responseBody.data.sandbox).toBe(true)
    expect(responseBody.data.messageId).toBe('mock-brevo-message-id')
  })

  it('sends a People Development BCC request without an authorization header', async () => {
    const brevoFetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            messageId: 'people-development-message-id',
          }),
          {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )

    const response = await app.request(
      '/api/v1/people-development/notifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: 'assignment-1',
          groups: ['pastors'],
          recipients: [
            {
              email: 'first@example.com',
              name: 'First Recipient',
            },
            {
              email: 'second@example.com',
              name: 'Second Recipient',
            },
          ],
          post: {
            text: 'Shared group update',
            postedAtLabel: 'July 30, 2026',
            appUrl: 'https://lincministry.com/group-notes',
            attachments: [],
          },
        }),
      },
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(brevoFetchMock).toHaveBeenCalledTimes(1)

    const [, requestInit] = brevoFetchMock.mock.calls[0]
    const payload = JSON.parse(String(requestInit?.body)) as {
      bcc: Array<{ email: string }>
    }

    expect(payload.bcc).toHaveLength(2)
    expect(payload.bcc.map(recipient => recipient.email)).toEqual([
      'first@example.com',
      'second@example.com',
    ])
  })

  it('requires Pastor authentication before sending meeting invitations', async () => {
    const unauthenticatedResponse = await app.request(
      '/api/v1/meeting-invitations',
      { method: 'POST' },
      mockBindings,
    )

    expect(unauthenticatedResponse.status).toBe(401)

    const brevoFetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            messageId: 'meeting-invitation-message-id',
          }),
          {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )

    const authenticatedApp = createApp({
      meetingInvitations: {
        verifyToken: vi.fn().mockResolvedValue({
          uid: 'pastor-uid',
          email: 'rev.ibrahim@lincministry.com',
          emailVerified: false,
          name: null,
          picture: null,
          signInProvider: 'password',
        }),
      },
    })

    const response = await authenticatedApp.request(
      '/api/v1/meeting-invitations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          locale: 'en',
          recipients: [
            {
              email: 'participant@example.com',
              name: 'Participant',
            },
          ],
          meeting: {
            title: 'Team meeting',
            date: '2026-07-30',
            startTime: '10:00',
            endTime: '11:00',
            location: 'LinC Ministry',
            meetLink: '',
          },
        }),
      },
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(brevoFetchMock).toHaveBeenCalledTimes(1)

    const [, requestInit] = brevoFetchMock.mock.calls[0]
    const payload = JSON.parse(String(requestInit?.body)) as {
      bcc: Array<{ email: string }>
    }

    expect(payload.bcc).toEqual([
      {
        email: 'participant@example.com',
        name: 'Participant',
      },
    ])
  })

})
