import type { MiddlewareHandler } from 'hono'

import type {
  AppEnv,
  AuthenticatedFirebaseUser,
} from '../types/app'

export const AUTHORIZATION_SOURCE =
  'firebase-auth:email-allowlist'

const PASTOR_EMAIL_PATTERN =
  /^rev\.ibrahim@lincministry\.com$/i

export function isPastorUser(
  user: AuthenticatedFirebaseUser,
): boolean {
  return user.email !== null &&
    PASTOR_EMAIL_PATTERN.test(user.email.trim())
}

export function requirePastorAccess(): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    if (!isPastorUser(context.get('firebaseUser'))) {
      return context.json(
        {
          success: false,
          error: {
            code: 'PASTOR_ACCESS_REQUIRED',
            message:
              'Pastor access is required for this resource.',
          },
        },
        403,
      )
    }

    await next()
  }
}
