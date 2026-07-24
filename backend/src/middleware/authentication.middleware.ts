import { createMiddleware } from 'hono/factory'

import {
  verifyFirebaseIdToken,
  type FirebaseAuthenticatedUser,
} from '../auth/firebaseAuth'

export type AuthenticationBindings = {
  FIREBASE_PROJECT_ID: string
}

export type AuthenticationVariables = {
  authenticatedUser: FirebaseAuthenticatedUser
  firebaseIdToken: string
}

export const requireFirebaseAuth = createMiddleware<{
  Bindings: AuthenticationBindings
  Variables: AuthenticationVariables
}>(async (context, next) => {
  const authorizationHeader =
    context.req.header('Authorization')

  const bearerMatch = authorizationHeader?.match(
    /^Bearer\s+(.+)$/i,
  )

  const token = bearerMatch?.[1]?.trim()

  if (!token) {
    return context.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'A valid Firebase ID token is required.',
        },
      },
      401,
    )
  }

  try {
    const authenticatedUser =
      await verifyFirebaseIdToken(
        token,
        context.env.FIREBASE_PROJECT_ID,
      )

    context.set('authenticatedUser', authenticatedUser)
    context.set('firebaseIdToken', token)

    await next()
  } catch (error) {
    console.error('Firebase authentication failed:', error)

    return context.json(
      {
        success: false,
        error: {
          code: 'INVALID_AUTHENTICATION_TOKEN',
          message:
            'The Firebase authentication token is invalid or expired.',
        },
      },
      401,
    )
  }
})