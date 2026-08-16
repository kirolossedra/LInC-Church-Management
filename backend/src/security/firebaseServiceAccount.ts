import type { FirebaseBindings } from '../types/app'

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FIREBASE_DATABASE_SCOPE =
  'https://www.googleapis.com/auth/firebase.database'
const USERINFO_EMAIL_SCOPE =
  'https://www.googleapis.com/auth/userinfo.email'
const IDENTITY_TOOLKIT_SCOPE =
  'https://www.googleapis.com/auth/identitytoolkit'

type CachedAccessToken = {
  clientEmail: string
  token: string
  expiresAt: number
}

let cachedAccessToken: CachedAccessToken | null = null

export type FirebaseServiceAccountTokenFetch = typeof fetch

export class FirebaseServiceAccountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FirebaseServiceAccountError'
  }
}

export async function getFirebaseServiceAccountAccessToken(
  bindings: FirebaseBindings,
  fetchImpl: FirebaseServiceAccountTokenFetch = fetch,
  now: () => number = Date.now,
): Promise<string> {
  const clientEmail =
    bindings.FIREBASE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey =
    bindings.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()

  if (!clientEmail || !privateKey) {
    throw new FirebaseServiceAccountError(
      'Firebase server credentials are not configured.',
    )
  }

  const nowMs = now()
  if (
    cachedAccessToken?.clientEmail === clientEmail &&
    cachedAccessToken.expiresAt - nowMs > 60_000
  ) {
    return cachedAccessToken.token
  }

  const issuedAt = Math.floor(nowMs / 1000)
  const assertion = await createServiceAccountAssertion({
    clientEmail,
    privateKey,
    issuedAt,
  })

  let response: Response
  try {
    response = await fetchImpl(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:
          'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    })
  } catch {
    throw new FirebaseServiceAccountError(
      'Google OAuth could not be reached.',
    )
  }

  let responseBody: {
    access_token?: unknown
    expires_in?: unknown
  } = {}

  try {
    responseBody = (await response.json()) as typeof responseBody
  } catch {
    responseBody = {}
  }

  if (
    !response.ok ||
    typeof responseBody.access_token !== 'string' ||
    responseBody.access_token.length === 0
  ) {
    throw new FirebaseServiceAccountError(
      'Google OAuth rejected the Firebase server credentials.',
    )
  }

  const expiresIn =
    typeof responseBody.expires_in === 'number' &&
    Number.isFinite(responseBody.expires_in)
      ? responseBody.expires_in
      : 3600

  cachedAccessToken = {
    clientEmail,
    token: responseBody.access_token,
    expiresAt: nowMs + expiresIn * 1000,
  }

  return responseBody.access_token
}

async function createServiceAccountAssertion({
  clientEmail,
  privateKey,
  issuedAt,
}: {
  clientEmail: string
  privateKey: string
  issuedAt: number
}): Promise<string> {
  const header = encodeJson({ alg: 'RS256', typ: 'JWT' })
  const payload = encodeJson({
    iss: clientEmail,
    sub: clientEmail,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    scope: `${USERINFO_EMAIL_SCOPE} ${FIREBASE_DATABASE_SCOPE} ${IDENTITY_TOOLKIT_SCOPE}`,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })
  const unsignedToken = `${header}.${payload}`
  const key = await importPrivateKey(privateKey)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  )

  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`
}

async function importPrivateKey(privateKey: string) {
  const normalizedKey = privateKey.replace(/\\n/g, '\n')
  const base64 = normalizedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')

  if (!base64) {
    throw new FirebaseServiceAccountError(
      'The Firebase service-account private key is invalid.',
    )
  }

  let binary: string
  try {
    binary = atob(base64)
  } catch {
    throw new FirebaseServiceAccountError(
      'The Firebase service-account private key is invalid.',
    )
  }

  const bytes = Uint8Array.from(binary, character =>
    character.charCodeAt(0),
  )

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      bytes,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign'],
    )
  } catch {
    throw new FirebaseServiceAccountError(
      'The Firebase service-account private key could not be imported.',
    )
  }
}

function encodeJson(value: unknown): string {
  return encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(value)),
  )
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}
