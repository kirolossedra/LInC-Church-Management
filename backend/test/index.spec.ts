import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../src/index'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
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

  it('sends a meeting-invitation BCC request without an authorization header', async () => {
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

    const response = await app.request(
      '/api/v1/meeting-invitations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
