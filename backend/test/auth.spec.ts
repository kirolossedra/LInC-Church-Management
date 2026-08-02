import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
}

const verifiedUser: AuthenticatedFirebaseUser = {
  uid: 'pastor-uid',
  email: 'Rev.Ibrahim@LinCMinistry.com',
  emailVerified: true,
  name: 'Test Pastor',
  picture: null,
  signInProvider: 'password',
}

function authRequest(path: string, token = 'valid-token') {
  return new Request(`https://worker.test${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

describe('Firebase authentication routes', () => {
  it('rejects a request without a Bearer token', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi.fn(),
      },
    })

    const response = await app.request(
      '/api/v1/auth/session',
      {},
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('rejects a token that fails verification', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi
          .fn()
          .mockRejectedValue(new Error('invalid token')),
      },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/session', 'invalid-token'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('INVALID_FIREBASE_TOKEN')
  })

  it('returns the compatible session response for a Pastor', async () => {
    const verifyToken = vi.fn().mockResolvedValue(verifiedUser)
    const app = createApp({
      auth: { verifyToken },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/session'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      success: boolean
      data: {
        authenticated: boolean
        authorized: boolean
        uid: string
        email: string
        role: string
        authorizationSource: string
      }
    }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      authenticated: true,
      authorized: true,
      uid: 'pastor-uid',
      email: 'Rev.Ibrahim@LinCMinistry.com',
      role: 'pastor',
      authorizationSource:
        'firebase-auth:email-allowlist',
    })
    expect(verifyToken).toHaveBeenCalledWith(
      'valid-token',
      'test-project',
    )

  })

  it('returns an authenticated but unauthorized session for a non-Pastor', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi.fn().mockResolvedValue({
          ...verifiedUser,
          email: 'member@lincministry.com',
        }),
      },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/session'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      data: { authenticated: boolean; authorized: boolean; role: null }
    }

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      authenticated: true,
      authorized: false,
      role: null,
    })
  })

  it('forbids the Pastor endpoint for a non-Pastor', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi.fn().mockResolvedValue({
          ...verifiedUser,
          email:
            'rev.ibrahim@lincministry.com.attacker.example',
        }),
      },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/pastor-access'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('PASTOR_ACCESS_REQUIRED')
  })

  it('allows the exact Pastor email on the protected endpoint', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi.fn().mockResolvedValue(verifiedUser),
      },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/pastor-access'),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      success: boolean
      data: { authorized: boolean; role: string }
    }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      authorized: true,
      role: 'pastor',
    })
  })

  it('returns 503 when Firebase authentication is not configured', async () => {
    const app = createApp({
      auth: {
        verifyToken: vi.fn().mockResolvedValue(verifiedUser),
      },
    })

    const response = await app.request(
      authRequest('/api/v1/auth/session'),
      undefined,
      {
        ...mockBindings,
        FIREBASE_PROJECT_ID: '',
      },
    )

    expect(response.status).toBe(503)
  })

  it('allows the Authorization header in CORS preflight', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/v1/auth/session',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://lincministry.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      },
      mockBindings,
    )

    expect(response.status).toBe(204)
    expect(
      response.headers.get('Access-Control-Allow-Headers'),
    ).toContain('Authorization')
  })
})
