import { Hono } from 'hono'

import { ABOUT_PEOPLE_PATH, normalizeAboutPeople } from '../about/aboutPeople'
import { getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  type FirebaseDatabaseFetch,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

export type AboutDependencies = {
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
}

export function createAboutRoutes(dependencies: AboutDependencies = {}) {
  const routes = new Hono<AppEnv>()

  routes.get('/people', async context => {
    try {
      const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
      if (!databaseUrl) throw new Error('Firebase database URL is missing.')
      const getAccessToken = dependencies.getAccessToken ??
        (bindings => getFirebaseServiceAccountAccessToken(bindings))
      const accessToken = await getAccessToken(context.env)
      const database = createFirebaseAdminRealtimeDatabaseClient({
        databaseUrl,
        getAccessToken: async () => accessToken,
        fetchImpl: dependencies.databaseFetch,
      })
      const people = normalizeAboutPeople(await database.get(ABOUT_PEOPLE_PATH))
      context.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return context.json({ success: true, data: { people } })
    } catch (error) {
      console.error('About people read failed:', error instanceof Error ? error.name : 'UnknownError')
      return context.json({
        success: false,
        error: { code: 'ABOUT_PEOPLE_UNAVAILABLE', message: 'The About Us directory is temporarily unavailable.' },
      }, 503)
    }
  })

  return routes
}
