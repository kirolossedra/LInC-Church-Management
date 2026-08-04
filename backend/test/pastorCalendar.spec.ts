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
  email: 'rev.ibrahim@lincministry.com',
  emailVerified: false,
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

function apiRequest(path: string, method = 'GET', body?: unknown) {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: {
      Authorization: 'Bearer valid-token',
      ...(body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function createTestApp(
  databaseFetch: ReturnType<typeof vi.fn>,
  sendNotification = vi.fn().mockResolvedValue({ messageId: 'message-1' }),
) {
  return createApp({
    pastorCalendar: {
      verifyToken: vi.fn().mockResolvedValue(verifiedPastor),
      databaseFetch: databaseFetch as unknown as typeof fetch,
      sendNotification,
      now: () => 1_777_777_777_000,
      createId: () => 'meeting-generated-1',
    },
    meetingInvitations: {
      verifyToken: vi.fn().mockResolvedValue(verifiedPastor),
    },
  })
}

function requestBody(call: unknown[]) {
  const init = call[1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

const validMeeting = {
  title: 'Counselling meeting',
  description: '',
  date: '2026-08-15',
  startTime: '10:00',
  endTime: '11:00',
  location: 'Church',
  meetLink: '',
  type: 'counseling',
  participantIds: [],
}

describe('Pastor Calendar routes', () => {
  it('requires authentication before calendar database access', async () => {
    const databaseFetch = vi.fn()
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      '/api/v1/pastor-calendar',
      {},
      mockBindings,
    )

    expect(response.status).toBe(401)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('rejects a non-Pastor before calendar database access', async () => {
    const databaseFetch = vi.fn()
    const app = createApp({
      pastorCalendar: {
        verifyToken: vi.fn().mockResolvedValue({
          ...verifiedPastor,
          email: 'member@lincministry.com',
        }),
        databaseFetch: databaseFetch as unknown as typeof fetch,
      },
    })

    const response = await app.request(
      apiRequest('/api/v1/pastor-calendar'),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(403)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('returns one normalized no-store calendar snapshot', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/meetings.json')) {
        return Promise.resolve(jsonResponse({
          meetingB: { date: '2026-09-01', title: 'Later' },
          meetingA: { date: '2026-08-01', title: 'Earlier' },
        }))
      }
      if (url.includes('/meetingRequests.json')) {
        return Promise.resolve(jsonResponse({
          requestB: { createdAt: 20, status: 'pending' },
          requestA: { createdAt: 10, status: 'pending' },
        }))
      }
      return Promise.resolve(jsonResponse(null))
    })
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      apiRequest('/api/v1/pastor-calendar'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: {
        meetings: Array<{ id: string }>
        meetingRequests: Array<{ id: string }>
      }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(body.data.meetings.map(item => item.id)).toEqual([
      'meetingA',
      'meetingB',
    ])
    expect(body.data.meetingRequests.map(item => item.id)).toEqual([
      'requestA',
      'requestB',
    ])
    expect(databaseFetch).toHaveBeenCalledTimes(4)
  })

  it('creates a meeting with backend-controlled audit fields', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(
      jsonResponse({ name: 'meeting-new' }),
    )
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      apiRequest('/api/v1/pastor-calendar/meetings', 'POST', validMeeting),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(requestBody(databaseFetch.mock.calls[0])).toMatchObject({
      title: 'Counselling meeting',
      acknowledged: false,
      createdAt: 1_777_777_777_000,
      updatedAt: 1_777_777_777_000,
      updatedBy: 'rev.ibrahim@lincministry.com',
    })
  })

  it('updates a meeting and its source request in one root patch', async () => {
    const databaseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        ...validMeeting,
        sourceRequestId: 'request-1',
        acknowledged: true,
      }))
      .mockResolvedValueOnce(jsonResponse({}))
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      apiRequest('/api/v1/pastor-calendar/meetings/meeting-1', 'PATCH', {
        ...validMeeting,
        startTime: '11:00',
        endTime: '12:00',
      }),
      undefined,
      mockBindings,
    )
    const patchBody = requestBody(databaseFetch.mock.calls[1])

    expect(response.status).toBe(200)
    expect(patchBody).toMatchObject({
      'meetings/meeting-1/startTime': '11:00',
      'meetings/meeting-1/acknowledged': false,
      'meetings/meeting-1/acknowledgedAt': null,
      'meetingRequests/request-1/startTime': '11:00',
      'meetingRequests/request-1/endTime': '12:00',
    })
  })

  it('creates availability with server-controlled timestamps', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(
      jsonResponse({ name: 'availability-new' }),
    )
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      apiRequest('/api/v1/pastor-calendar/availability', 'POST', {
        date: '2026-08-20',
        startTime: '09:00',
        endTime: '20:00',
        reason: '',
        allDay: true,
      }),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(201)
    expect(requestBody(databaseFetch.mock.calls[0])).toMatchObject({
      allDay: true,
      updatedAt: 1_777_777_777_000,
      updatedBy: 'rev.ibrahim@lincministry.com',
    })
  })

  it('accepts a request with an atomic meeting/request update', async () => {
    const databaseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        name: 'Visitor',
        email: 'visitor@example.com',
        date: '2026-08-25',
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Conversation',
        requesterLocale: 'en',
        status: 'pending',
      }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
    const sendNotification = vi.fn().mockResolvedValue({
      messageId: 'confirmation-1',
    })
    const app = createTestApp(databaseFetch, sendNotification)

    const response = await app.request(
      apiRequest(
        '/api/v1/pastor-calendar/meeting-requests/request-1/decision',
        'POST',
        { decision: 'accepted', meetingTitle: 'Meeting with Pastor' },
      ),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { meetingId: string; notificationSent: boolean }
    }
    const atomicUpdate = requestBody(databaseFetch.mock.calls[1])

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      meetingId: 'meeting-generated-1',
      notificationSent: true,
    })
    expect(atomicUpdate).toMatchObject({
      'meetings/meeting-generated-1': expect.objectContaining({
        requestEmail: 'visitor@example.com',
        sourceRequestId: 'request-1',
      }),
      'meetingRequests/request-1/status': 'accepted',
      'meetingRequests/request-1/createdMeetingId': 'meeting-generated-1',
    })
    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientEmail: 'visitor@example.com' }),
    )
  })

  it('rejects a decision for an already decided request', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(
      jsonResponse({ status: 'accepted' }),
    )
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      apiRequest(
        '/api/v1/pastor-calendar/meeting-requests/request-1/decision',
        'POST',
        { decision: 'rejected', meetingTitle: 'Meeting with Pastor' },
      ),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(409)
    expect(databaseFetch).toHaveBeenCalledTimes(1)
  })

  it('requires authentication for meeting invitations', async () => {
    const app = createTestApp(vi.fn())

    const response = await app.request(
      '/api/v1/meeting-invitations',
      { method: 'POST' },
      mockBindings,
    )

    expect(response.status).toBe(401)
  })
})
