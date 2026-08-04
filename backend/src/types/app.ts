import type { BrevoBindings } from '../services/brevo.service'

export type FirebaseBindings = {
  FIREBASE_PROJECT_ID: string
  FIREBASE_DATABASE_URL: string
  NEXTGEN_MISSION_MAP_DATA?: string
}

export type AppBindings = BrevoBindings &
  FirebaseBindings & {
    BREVO_TEST_RECIPIENT: string
  }

export type AuthenticatedFirebaseUser = {
  uid: string
  email: string | null
  emailVerified: boolean
  name: string | null
  picture: string | null
  signInProvider: string | null
}

export type AppVariables = {
  firebaseUser: AuthenticatedFirebaseUser
  firebaseIdToken: string
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}
