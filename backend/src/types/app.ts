import type { BrevoBindings } from '../services/brevo.service'
import type { GeminiBindings } from '../services/gemini.service'

export type FirebaseBindings = {
  FIREBASE_PROJECT_ID: string
  FIREBASE_DATABASE_URL: string
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?: string
  FIREBASE_WEB_API_KEY?: string
  NEXTGEN_MISSION_MAP_DATA?: string
}

export type BackblazeBindings = {
  B2_BUCKET_NAME: string
  B2_S3_ENDPOINT: string
  B2_REGION: string
  B2_APPLICATION_KEY_ID?: string
  B2_APPLICATION_KEY?: string
}

export type AppBindings = BrevoBindings &
  FirebaseBindings & {
    BREVO_TEST_RECIPIENT: string
    BOOKING_NOTIFICATION_EMAIL?: string
  } & BackblazeBindings & GeminiBindings

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
