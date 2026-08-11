import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
  BOOKING_NOTIFICATION_EMAIL: 'pastor@example.com',
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function reservationReadResponse(value: unknown = null) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      etag: '"reservation-etag"',
    },
  })
}

function publicApiRequest(path: string, body?: unknown) {
  return new Request(`https://worker.test${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined
      ? undefined
      : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function collectionResponse(url: string) {
  if (url.endsWith('/availability.json')) {
    return jsonResponse({
      available1: {
        date: '2026-08-10',
        startTime: '09:00',
        endTime: '12:00',
        reason: 'Private availability reason',
      },
    })
  }
  if (url.endsWith('/unavailability.json')) {
    return jsonResponse({
      blocked1: {
        date: '2026-08-10',
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Private appointment',
      },
    })
  }
  if (url.endsWith('/meetings.json')) {
    return jsonResponse({
      meeting1: {
        date: '2026-08-10',
        startTime: '11:00',
        endTime: '11:30',
        requestName: 'Private Person',
        requestEmail: 'private@example.com',
      },
    })
  }
  if (url.endsWith('/meetingRequests.json')) {
    return jsonResponse({
      request1: {
        date: '2026-08-10',
        startTime: '11:30',
        endTime: '12:00',
        status: 'pending',
        name: 'Another Private Person',
        reason: 'Private reason',
      },
    })
  }
  if (url.endsWith('/peopleDevelopment/meetingSchedules.json')) {
    return jsonResponse(null)
  }
  if (url.endsWith('/calendarReservations.json')) {
    return jsonResponse(null)
  }
  return jsonResponse({ error: 'Unexpected URL' }, 500)
}

function writableBookingResponse(
  input: string | URL | Request,
  init?: RequestInit,
) {
  const url = String(input)
  if (url.includes('/calendarReservations/') && init?.method === 'GET') {
    return reservationReadResponse()
  }
  if (url.includes('/calendarReservations/') && init?.method === 'PUT') {
    return jsonResponse({})
  }
  if (url.includes('/calendarReservations/') && init?.method === 'PATCH') {
    return jsonResponse({})
  }
  if (url.endsWith('/meetingRequests.json') && init?.method === 'POST') {
    return jsonResponse({ name: 'request-new' })
  }
  return collectionResponse(url)
}

function createTestApp(
  databaseFetch: ReturnType<typeof vi.fn>,
  sendNotification = vi.fn().mockResolvedValue({ messageId: 'message-1' }),
) {
  return createApp({
    booking: {
      getAccessToken: vi.fn().mockResolvedValue('server-oauth-token'),
      databaseFetch: databaseFetch as unknown as typeof fetch,
      sendNotification,
      now: () => Date.parse('2026-08-03T16:00:00Z'),
    },
  })
}

const validBookingRequest = {
  name: 'Visitor Name',
  email: 'visitor@example.com',
  date: '2026-08-10',
  startTime: '09:00',
  endTime: '09:30',
  reason: 'Pastoral conversation',
  requesterLocale: 'en',
  website: '',
}

describe('Public booking routes', () => {
  it('returns only privacy-safe schedule ranges without authentication', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) =>
      Promise.resolve(collectionResponse(String(input))),
    )
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      '/api/v1/booking/schedule?start=2026-08-01&end=2026-08-31',
      {},
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { availability: unknown[]; busy: unknown[] }
    }
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(200)
    expect(body.data.availability).toEqual([
      {
        date: '2026-08-10',
        startTime: '09:00',
        endTime: '12:00',
      },
    ])
    expect(body.data.busy).toHaveLength(3)
    expect(serialized).not.toContain('Private')
    expect(serialized).not.toContain('private@example.com')
    expect(databaseFetch).toHaveBeenCalledTimes(6)

    for (const call of databaseFetch.mock.calls) {
      const init = (call as unknown as [unknown, RequestInit])[1]
      expect(new Headers(init.headers).get('Authorization')).toBe(
        'Bearer server-oauth-token',
      )
    }
  })

  it('rejects an excessive schedule range before database access', async () => {
    const databaseFetch = vi.fn()
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      '/api/v1/booking/schedule?start=2026-01-01&end=2026-12-31',
      {},
      mockBindings,
    )

    expect(response.status).toBe(400)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('stores an anonymous request with server-controlled fields', async () => {
    const databaseFetch = vi.fn(writableBookingResponse)
    const sendNotification = vi.fn().mockResolvedValue({
      messageId: 'message-1',
    })
    const app = createTestApp(databaseFetch, sendNotification)

    const response = await app.request(
      publicApiRequest('/api/v1/booking/requests', {
        ...validBookingRequest,
      }),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { id: string; status: string; notificationSent: boolean }
    }

    expect(response.status).toBe(201)
    expect(body.data).toEqual({
      id: 'request-new',
      status: 'pending',
      notificationSent: true,
    })

    const postCall = databaseFetch.mock.calls.find(
      call => (call[1] as RequestInit)?.method === 'POST',
    )
    expect(postCall).toBeDefined()
    const stored = JSON.parse(
      String((postCall?.[1] as RequestInit).body),
    ) as Record<string, unknown>
    expect(stored).toMatchObject({
      name: 'Visitor Name',
      email: 'visitor@example.com',
      status: 'pending',
      source: 'hono-public-booking',
      createdAt: Date.parse('2026-08-03T16:00:00Z'),
      updatedAt: Date.parse('2026-08-03T16:00:00Z'),
    })
    expect(
      databaseFetch.mock.calls.some(
        call => (call[1] as RequestInit)?.method === 'PUT',
      ),
    ).toBe(true)
    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipientEmail: 'pastor@example.com',
      }),
    )
  })

  it('rejects client-controlled status and timestamps', async () => {
    const databaseFetch = vi.fn()
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      publicApiRequest('/api/v1/booking/requests', {
        ...validBookingRequest,
        status: 'accepted',
        createdAt: 1,
      }),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(400)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('rejects a request that overlaps an existing pending request', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/meetingRequests.json')) {
        return Promise.resolve(
          jsonResponse({
            conflict: {
              date: '2026-08-10',
              startTime: '09:00',
              endTime: '09:30',
              status: 'pending',
            },
          }),
        )
      }
      return Promise.resolve(collectionResponse(url))
    })
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      publicApiRequest('/api/v1/booking/requests', validBookingRequest),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(409)
    expect(body.error.code).toBe('BOOKING_SLOT_UNAVAILABLE')
    expect(
      databaseFetch.mock.calls.some(
        call =>
          (call as unknown as [unknown, RequestInit])[1]
            ?.method === 'POST',
      ),
    ).toBe(false)
  })

  it('rejects past dates before obtaining database access', async () => {
    const databaseFetch = vi.fn()
    const app = createTestApp(databaseFetch)

    const response = await app.request(
      publicApiRequest('/api/v1/booking/requests', {
        ...validBookingRequest,
        date: '2026-08-02',
      }),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(409)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('keeps a stored request successful when notification delivery fails', async () => {
    const databaseFetch = vi.fn(writableBookingResponse)
    const app = createTestApp(
      databaseFetch,
      vi.fn().mockRejectedValue(new Error('Brevo unavailable')),
    )

    const response = await app.request(
      publicApiRequest('/api/v1/booking/requests', validBookingRequest),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { notificationSent: boolean }
    }

    expect(response.status).toBe(201)
    expect(body.data.notificationSent).toBe(false)
  })

  it('returns 503 when server credentials are absent', async () => {
    const app = createApp()

    const response = await app.request(
      '/api/v1/booking/schedule?start=2026-08-01&end=2026-08-31',
      {},
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('BOOKING_SERVER_AUTH_UNAVAILABLE')
  })
})
