import { Hono } from 'hono'

import {
  createFirebaseAuthMiddleware,
  type FirebaseTokenVerifier,
} from '../security/firebaseAuth'
import {
  AUTHORIZATION_SOURCE,
  isPastorUser,
} from '../security/pastorAuthorization'
import type { AppEnv } from '../types/app'

export type AuthRoutesDependencies = {
  verifyToken?: FirebaseTokenVerifier
}

export function createAuthRoutes(
  dependencies: AuthRoutesDependencies = {},
) {
  const routes = new Hono<AppEnv>()

  routes.use(
    '*',
    createFirebaseAuthMiddleware(
      dependencies.verifyToken,
    ),
  )

  routes.get('/session', context => {
    const user = context.get('firebaseUser')
    const authorized = isPastorUser(user)

    return context.json({
      success: true,
      data: {
        authenticated: true,
        authorized,
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        picture: user.picture,
        signInProvider: user.signInProvider,
        role: authorized ? 'pastor' : null,
        authorizationSource: AUTHORIZATION_SOURCE,
      },
    })
  })

  routes.get('/pastor-access', context => {
    const user = context.get('firebaseUser')

    if (!isPastorUser(user)) {
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

    return context.json({
      success: true,
      data: {
        authorized: true,
        uid: user.uid,
        email: user.email,
        role: 'pastor',
      },
    })
  })

  return routes
}
