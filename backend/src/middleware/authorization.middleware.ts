import { createMiddleware } from 'hono/factory'

import type {
  AuthenticationVariables,
} from './authentication.middleware'

export type PastorAuthorizationBindings = {
  FIREBASE_DATABASE_URL: string
}

function normalizeAdminEmailKey(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/\./g, ',')
}

export const requirePastorRole = createMiddleware<{
  Bindings: PastorAuthorizationBindings
  Variables: AuthenticationVariables
}>(async (context, next) => {
  const authenticatedUser = context.get('authenticatedUser')
  const firebaseIdToken = context.get('firebaseIdToken')

  if (
    !authenticatedUser.email ||
    !authenticatedUser.emailVerified
  ) {
    return context.json(
      {
        success: false,
        error: {
          code: 'VERIFIED_EMAIL_REQUIRED',
          message:
            'A verified Firebase email address is required.',
        },
      },
      403,
    )
  }

  const databaseUrl =
    context.env.FIREBASE_DATABASE_URL.replace(/\/+$/, '')

  const adminEmailKey = normalizeAdminEmailKey(
    authenticatedUser.email,
  )

  const roleUrl =
    `${databaseUrl}/admins/` +
    `${encodeURIComponent(adminEmailKey)}.json` +
    `?auth=${encodeURIComponent(firebaseIdToken)}`

  let roleResponse: Response

  try {
    roleResponse = await fetch(roleUrl, {
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (error) {
    console.error(
      'Unable to reach Firebase for pastor authorization:',
      error,
    )

    return context.json(
      {
        success: false,
        error: {
          code: 'AUTHORIZATION_SERVICE_UNAVAILABLE',
          message:
            'Pastor authorization could not be verified.',
        },
      },
      503,
    )
  }

  if (!roleResponse.ok) {
    console.error(
      'Firebase pastor-role lookup failed:',
      roleResponse.status,
      await roleResponse.text(),
    )

    return context.json(
      {
        success: false,
        error: {
          code: 'AUTHORIZATION_LOOKUP_FAILED',
          message:
            'Pastor authorization could not be verified.',
        },
      },
      502,
    )
  }

  const role = (await roleResponse.json()) as unknown

  if (role !== 'pastor') {
    return context.json(
      {
        success: false,
        error: {
          code: 'PASTOR_ROLE_REQUIRED',
          message: 'Pastor authorization is required.',
        },
      },
      403,
    )
  }

  await next()
})