import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose'

const firebaseJwks = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

type FirebaseTokenPayload = JWTPayload & {
  email?: unknown
  email_verified?: unknown
  name?: unknown
  picture?: unknown
  auth_time?: unknown
  firebase?: {
    sign_in_provider?: unknown
  }
}

export interface FirebaseAuthenticatedUser {
  uid: string
  email: string | null
  emailVerified: boolean
  name: string | null
  picture: string | null
  signInProvider: string | null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0
    ? value
    : null
}

function validateTimeClaim(
  value: unknown,
  claimName: string,
  currentTime: number,
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value > currentTime
  ) {
    throw new Error(
      `Firebase token has an invalid ${claimName} claim.`,
    )
  }
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
): Promise<FirebaseAuthenticatedUser> {
  if (!token.trim()) {
    throw new Error('Firebase ID token is missing.')
  }

  if (!projectId.trim()) {
    throw new Error('Firebase project ID is missing.')
  }

  const { payload } = await jwtVerify<FirebaseTokenPayload>(
    token,
    firebaseJwks,
    {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    },
  )

  const currentTime = Math.floor(Date.now() / 1000)

  validateTimeClaim(payload.iat, 'iat', currentTime)
  validateTimeClaim(payload.auth_time, 'auth_time', currentTime)

  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    payload.sub.length > 128
  ) {
    throw new Error(
      'Firebase token has an invalid subject claim.',
    )
  }

  return {
    uid: payload.sub,
    email: optionalString(payload.email),
    emailVerified: payload.email_verified === true,
    name: optionalString(payload.name),
    picture: optionalString(payload.picture),
    signInProvider: optionalString(
      payload.firebase?.sign_in_provider,
    ),
  }
}