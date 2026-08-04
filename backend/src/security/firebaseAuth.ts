import type { MiddlewareHandler } from 'hono'
import { verifyWithJwks } from 'hono/jwt'

import type {
  AppEnv,
  AuthenticatedFirebaseUser,
} from '../types/app'

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

type TokenPayload = Record<string, unknown>

export type FirebaseTokenVerifier = (
  idToken: string,
  projectId: string,
) => Promise<AuthenticatedFirebaseUser>

function optionalString(
  payload: TokenPayload,
  claim: string,
): string | null {
  const value = payload[claim]
  return typeof value === 'string' && value.length > 0
    ? value
    : null
}

export const verifyFirebaseIdToken: FirebaseTokenVerifier =
  async (idToken, projectId) => {
    const payload = (await verifyWithJwks(idToken, {
      jwks_uri: FIREBASE_JWKS_URL,
      allowedAlgorithms: ['RS256'],
      verification: {
        iss: `https://securetoken.google.com/${projectId}`,
        aud: projectId,
        exp: true,
        iat: true,
        nbf: true,
      },
    })) as TokenPayload

    const uid = payload.sub
    const authTime = payload.auth_time
    const now = Math.floor(Date.now() / 1000)

    if (
      typeof uid !== 'string' ||
      uid.length === 0 ||
      uid.length > 128 ||
      typeof authTime !== 'number' ||
      !Number.isFinite(authTime) ||
      authTime > now
    ) {
      throw new Error(
        'The Firebase token contains invalid required claims.',
      )
    }

    const firebaseClaim = payload.firebase
    const signInProvider =
      firebaseClaim !== null &&
      typeof firebaseClaim === 'object'
        ? optionalString(
            firebaseClaim as TokenPayload,
            'sign_in_provider',
          )
        : null

    return {
      uid,
      email: optionalString(payload, 'email'),
      emailVerified: payload.email_verified === true,
      name: optionalString(payload, 'name'),
      picture: optionalString(payload, 'picture'),
      signInProvider,
    }
  }

function authenticationError(
  context: Parameters<MiddlewareHandler<AppEnv>>[0],
  code: string,
  message: string,
) {
  return context.json(
    {
      success: false,
      error: { code, message },
    },
    401,
  )
}

export function createFirebaseAuthMiddleware(
  verifyToken: FirebaseTokenVerifier =
    verifyFirebaseIdToken,
): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    const authorization = context.req.header('Authorization')
    const match = authorization?.match(/^Bearer\s+(\S+)$/i)

    if (!match) {
      return authenticationError(
        context,
        'AUTHENTICATION_REQUIRED',
        'A Firebase Bearer token is required.',
      )
    }

    const projectId = context.env.FIREBASE_PROJECT_ID?.trim()

    if (!projectId) {
      return context.json(
        {
          success: false,
          error: {
            code: 'FIREBASE_SERVICE_UNAVAILABLE',
            message:
              'Firebase authentication is not configured on this deployment.',
          },
        },
        503,
      )
    }

    const idToken = match[1]

    try {
      const user = await verifyToken(idToken, projectId)
      context.set('firebaseUser', user)
      context.set('firebaseIdToken', idToken)
    } catch (error) {
      console.warn(
        'Firebase token verification failed:',
        error instanceof Error ? error.name : 'UnknownError',
      )

      return authenticationError(
        context,
        'INVALID_FIREBASE_TOKEN',
        'The Firebase Bearer token is invalid or expired.',
      )
    }

    await next()
  }
}
