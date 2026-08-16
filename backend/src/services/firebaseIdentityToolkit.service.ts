import type { FirebaseBindings } from '../types/app'

const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts'

export type FirebaseIdentityFetch = typeof fetch

export type FirebaseIdentityUser = {
  localId: string
  email: string
  displayName: string
}

export class FirebaseIdentityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'FirebaseIdentityError'
  }
}

export function createFirebaseIdentityToolkitClient({
  bindings,
  accessToken,
  fetchImpl = fetch,
}: {
  bindings: FirebaseBindings
  accessToken: string
  fetchImpl?: FirebaseIdentityFetch
}) {
  const apiKey = bindings.FIREBASE_WEB_API_KEY?.trim()
  const projectId = bindings.FIREBASE_PROJECT_ID?.trim()
  if (!apiKey || !projectId) {
    throw new FirebaseIdentityError(
      'FIREBASE_IDENTITY_NOT_CONFIGURED',
      'Firebase account provisioning is not configured.',
      503,
    )
  }

  const call = async (method: 'lookup' | 'signUp' | 'update', body: Record<string, unknown>) => {
    let response: Response
    try {
      response = await fetchImpl(`${IDENTITY_TOOLKIT_URL}:${method}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...body, targetProjectId: projectId }),
      })
    } catch {
      throw new FirebaseIdentityError(
        'FIREBASE_IDENTITY_UNREACHABLE',
        'Firebase Authentication could not be reached.',
        502,
      )
    }

    const payload = await response.json().catch(() => ({})) as {
      error?: { message?: unknown }
      users?: Array<Record<string, unknown>>
      localId?: unknown
      email?: unknown
      displayName?: unknown
    }
    if (!response.ok) {
      const googleCode = typeof payload.error?.message === 'string'
        ? payload.error.message.split(' : ')[0]
        : 'FIREBASE_IDENTITY_REQUEST_FAILED'
      throw new FirebaseIdentityError(googleCode, identityErrorMessage(googleCode), response.status)
    }
    return payload
  }

  return {
    async findByEmail(email: string): Promise<FirebaseIdentityUser | null> {
      try {
        const payload = await call('lookup', { email: [email] })
        const user = payload.users?.[0]
        return user ? normalizeUser(user) : null
      } catch (error) {
        if (error instanceof FirebaseIdentityError && (error.code === 'EMAIL_NOT_FOUND' || error.code === 'USER_NOT_FOUND')) return null
        throw error
      }
    },

    async createUser(input: { email: string; password: string; displayName: string }): Promise<FirebaseIdentityUser> {
      const payload = await call('signUp', {
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        emailVerified: false,
        disabled: false,
        returnSecureToken: false,
      })
      return normalizeUser(payload)
    },

    async updatePassword(localId: string, password: string): Promise<void> {
      const payload = await call('update', {
        localId,
        password,
        returnSecureToken: false,
      })
      if (payload.localId !== localId) {
        throw new FirebaseIdentityError(
          'FIREBASE_IDENTITY_INVALID_RESPONSE',
          'Firebase Authentication returned an invalid account response.',
          502,
        )
      }
    },
  }
}

function normalizeUser(value: Record<string, unknown>): FirebaseIdentityUser {
  const localId = typeof value.localId === 'string' ? value.localId : ''
  const email = typeof value.email === 'string' ? value.email : ''
  const displayName = typeof value.displayName === 'string' ? value.displayName : ''
  if (!localId || !email) {
    throw new FirebaseIdentityError(
      'FIREBASE_IDENTITY_INVALID_RESPONSE',
      'Firebase Authentication returned an invalid account response.',
      502,
    )
  }
  return { localId, email, displayName }
}

function identityErrorMessage(code: string) {
  const messages: Record<string, string> = {
    EMAIL_EXISTS: 'That email already belongs to another Firebase account.',
    INVALID_EMAIL: 'The email address is invalid.',
    WEAK_PASSWORD: 'Firebase rejected the generated temporary password.',
    OPERATION_NOT_ALLOWED: 'Firebase email and password authentication is disabled.',
    INSUFFICIENT_PERMISSION: 'The Firebase service account cannot manage Authentication users.',
    PERMISSION_DENIED: 'The Firebase service account cannot manage Authentication users.',
  }
  return messages[code] || 'Firebase Authentication rejected the account request.'
}
