import { Hono, type Context } from 'hono'
import type { z } from 'zod'

import {
  assessmentFormIds,
  buildAssessmentRecord,
  buildDirectSignupRecord,
  extractAssessmentResponseDetails,
  normalizeAssessmentResponses,
  normalizeFormState,
  AssessmentValidationError,
  type AssessmentFormId,
} from '../assessment/assessment.service'
import { requireAdminAuthority } from '../admin/adminAuthorization'
import { buildAssessmentEmail, buildIdentifierEmail } from '../emails/assessment.email'
import {
  assessmentFormIdSchema,
  assessmentLinkageSchema,
  assessmentResponseIdSchema,
  assessmentResponseQuerySchema,
  assessmentSubmissionSchema,
  directAssessmentSignupSchema,
  firebasePushResponseSchema,
  updateAssessmentFormStateSchema,
} from '../schemas/assessment.schema'
import { createFirebaseAuthMiddleware, type FirebaseTokenVerifier } from '../security/firebaseAuth'
import { FirebaseServiceAccountError, getFirebaseServiceAccountAccessToken } from '../security/firebaseServiceAccount'
import { sendBrevoEmail, type BrevoEmailResult } from '../services/brevo.service'
import {
  createFirebaseAdminRealtimeDatabaseClient,
  FirebaseRealtimeDatabaseError,
  type FirebaseDatabaseFetch,
  type FirebaseRealtimeDatabaseClient,
} from '../services/firebaseRealtimeDatabase.service'
import type { AppEnv, FirebaseBindings } from '../types/app'

const FORM_PATH = ['form'] as const
const FORM_CONTROLS_PATH = ['assessmentPage', 'forms'] as const

export type AssessmentDependencies = {
  verifyToken?: FirebaseTokenVerifier
  getAccessToken?: (bindings: FirebaseBindings) => Promise<string>
  databaseFetch?: FirebaseDatabaseFetch
  sendNotification?: (
    bindings: AppEnv['Bindings'],
    email: Parameters<typeof sendBrevoEmail>[1],
  ) => Promise<BrevoEmailResult>
  now?: () => number
}

export function createAssessmentRoutes(dependencies: AssessmentDependencies = {}) {
  const routes = new Hono<AppEnv>()
  const now = dependencies.now ?? Date.now

  routes.get('/forms', context => withDatabase(context, dependencies, async database => {
    const controls = await database.get<Record<string, unknown>>(FORM_CONTROLS_PATH)
    context.header('Cache-Control', 'public, max-age=15')
    return context.json({
      success: true,
      data: {
        forms: Object.fromEntries(
          assessmentFormIds().map(formId => [formId, normalizeFormState(controls?.[formId])]),
        ),
      },
    })
  }))

  routes.post('/submissions', async context => {
    const validation = assessmentSubmissionSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const state = normalizeFormState(
        await database.get([...FORM_CONTROLS_PATH, validation.data.formId]),
      )
      if (state !== 'active') {
        return context.json({
          success: false,
          error: { code: 'ASSESSMENT_FORM_UNAVAILABLE', message: 'This assessment form is not currently accepting responses.' },
        }, 409)
      }

      let submission
      try {
        submission = buildAssessmentRecord({ ...validation.data, timestamp: now() })
      } catch (error) {
        if (error instanceof AssessmentValidationError) {
          return context.json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message, details: error.issues },
          }, 400)
        }
        throw error
      }

      const result = firebasePushResponseSchema.safeParse(
        await database.post(FORM_PATH, submission.record),
      )
      if (!result.success) throw new FirebaseRealtimeDatabaseError(502, 'Firebase did not return a response ID.')

      const notificationSent = await sendAssessmentNotifications(context, dependencies, submission.email)
      return context.json({
        success: true,
        data: { id: result.data.name, result: submission.publicResult, notificationSent },
      }, 201)
    })
  })

  routes.post('/direct-signups', async context => {
    const validation = directAssessmentSignupSchema.safeParse(await readJson(context))
    if (!validation.success) return validationError(context, validation.error)
    return withDatabase(context, dependencies, async database => {
      const state = normalizeFormState(
        await database.get([...FORM_CONTROLS_PATH, 'five-service-pathways']),
      )
      if (state !== 'active') {
        return context.json({
          success: false,
          error: { code: 'ASSESSMENT_FORM_UNAVAILABLE', message: 'Direct sign-up is not currently available.' },
        }, 409)
      }
      const result = firebasePushResponseSchema.safeParse(
        await database.post(FORM_PATH, buildDirectSignupRecord({ ...validation.data, timestamp: now() })),
      )
      if (!result.success) throw new FirebaseRealtimeDatabaseError(502, 'Firebase did not return a response ID.')
      return context.json({ success: true, data: { id: result.data.name } }, 201)
    })
  })

  routes.use('/admin/*', createFirebaseAuthMiddleware(dependencies.verifyToken))

  routes.get('/admin/responses', context => withAssessmentAdmin(context, dependencies, async database => {
    const query = assessmentResponseQuerySchema.safeParse({ formId: context.req.query('formId') })
    if (!query.success) return validationError(context, query.error)
    const responses = normalizeAssessmentResponses(await database.get(FORM_PATH), query.data.formId)
    context.header('Cache-Control', 'private, no-store, max-age=0')
    return context.json({ success: true, data: { responses } })
  }))

  routes.patch('/admin/responses/:responseId/linkage', async context => {
    const responseId = assessmentResponseIdSchema.safeParse(context.req.param('responseId'))
    const body = assessmentLinkageSchema.safeParse(await readJson(context))
    if (!responseId.success) return validationError(context, responseId.error)
    if (!body.success) return validationError(context, body.error)
    return withAssessmentAdmin(context, dependencies, async database => {
      const timestamp = now()
      const updates: Record<string, unknown> = {
        userLinkage: { ...body.data, updatedAt: timestamp, updatedAtISO: new Date(timestamp).toISOString() },
      }
      if (body.data.userIdentifier) {
        updates.userIdentifier = body.data.userIdentifier
        updates.linkedUserIdentifier = body.data.userIdentifier
      }
      if (body.data.databaseFormId) {
        updates.formId = body.data.databaseFormId
        updates.databaseFormId = body.data.databaseFormId
        updates.linkedFormId = body.data.databaseFormId
      }
      await database.patch([...FORM_PATH, responseId.data], updates)
      return context.json({ success: true, data: { updated: true } })
    })
  })

  routes.delete('/admin/responses/:responseId', context => {
    const responseId = assessmentResponseIdSchema.safeParse(context.req.param('responseId'))
    if (!responseId.success) return validationError(context, responseId.error)
    return withAssessmentAdmin(context, dependencies, async database => {
      await database.delete([...FORM_PATH, responseId.data])
      return context.json({ success: true, data: { deleted: true } })
    })
  })

  routes.post('/admin/responses/:responseId/identifier-email', context => {
    const responseId = assessmentResponseIdSchema.safeParse(context.req.param('responseId'))
    if (!responseId.success) return validationError(context, responseId.error)
    return withAssessmentAdmin(context, dependencies, async database => {
      const raw = await database.get([...FORM_PATH, responseId.data])
      if (!raw) return context.json({ success: false, error: { code: 'ASSESSMENT_RESPONSE_NOT_FOUND', message: 'The assessment response was not found.' } }, 404)
      const details = extractAssessmentResponseDetails(raw)
      if (!details.userIdentifier || !isEmail(details.email)) {
        return context.json({ success: false, error: { code: 'IDENTIFIER_EMAIL_UNAVAILABLE', message: 'Save an identifier and a valid email before sending.' } }, 409)
      }
      const email = buildIdentifierEmail({
        locale: details.language,
        fullName: details.fullName,
        identifier: details.userIdentifier,
      })
      const sender = dependencies.sendNotification ?? sendBrevoEmail
      const delivery = await sender(context.env, {
        recipientEmail: details.email,
        recipientName: details.fullName || 'LinC participant',
        ...email,
      })
      const timestamp = now()
      await database.patch([...FORM_PATH, responseId.data], {
        identifierEmailSentAt: timestamp,
        identifierEmailSentAtISO: new Date(timestamp).toISOString(),
        identifierEmailLanguage: details.language === 'ar' ? 'Arabic' : 'English',
        identifierEmailSentUsing: 'Brevo',
        identifierEmailMessageId: delivery.messageId,
      })
      return context.json({ success: true, data: { sent: true } })
    })
  })

  routes.patch('/admin/forms/:formId', async context => {
    const formId = assessmentFormIdSchema.safeParse(context.req.param('formId'))
    const body = updateAssessmentFormStateSchema.safeParse(await readJson(context))
    if (!formId.success) return validationError(context, formId.error)
    if (!body.success) return validationError(context, body.error)
    return withAssessmentAdmin(context, dependencies, async database => {
      await database.patch([...FORM_CONTROLS_PATH, formId.data], {
        state: body.data.state,
        updatedAt: now(),
        updatedBy: context.get('firebaseUser').email || context.get('firebaseUser').uid,
      })
      return context.json({ success: true, data: { updated: true } })
    })
  })

  return routes
}

async function sendAssessmentNotifications(
  context: Context<AppEnv>,
  dependencies: AssessmentDependencies,
  submission: {
    locale: 'en' | 'ar'
    title: string
    fullName: string
    submitterEmail: string
    answers: Record<string, string | number>
    result: Record<string, string>
  },
) {
  const email = buildAssessmentEmail(submission)
  const recipients = Array.from(new Set([
    'rev.ibrahim@lincministry.com',
    submission.submitterEmail.trim().toLowerCase(),
  ]))
  const sender = dependencies.sendNotification ?? sendBrevoEmail
  try {
    await Promise.all(recipients.map(recipientEmail => sender(context.env, {
      recipientEmail,
      recipientName: recipientEmail === submission.submitterEmail.trim().toLowerCase()
        ? submission.fullName
        : 'Pastor Ibrahim',
      ...email,
    })))
    return true
  } catch (error) {
    console.error('Assessment notification failed:', error instanceof Error ? error.name : 'UnknownError')
    return false
  }
}

async function withAssessmentAdmin(
  context: Context<AppEnv>,
  dependencies: AssessmentDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>,
) {
  return withDatabase(context, dependencies, async database => {
    const authorization = await requireAdminAuthority(
      database,
      context.get('firebaseUser'),
      'manageAssessmentForms',
    )
    if (!authorization.allowed) {
      return context.json({
        success: false,
        error: { code: 'ASSESSMENT_ADMIN_ACCESS_REQUIRED', message: 'Assessment Forms administrator authority is required.' },
      }, 403)
    }
    return operation(database)
  })
}

async function withDatabase(
  context: Context<AppEnv>,
  dependencies: AssessmentDependencies,
  operation: (database: FirebaseRealtimeDatabaseClient) => Promise<Response>,
) {
  try {
    const databaseUrl = context.env.FIREBASE_DATABASE_URL?.trim()
    if (!databaseUrl) throw new FirebaseRealtimeDatabaseError(503, 'Firebase database is not configured.')
    const getAccessToken = dependencies.getAccessToken ?? (bindings => getFirebaseServiceAccountAccessToken(bindings))
    const token = await getAccessToken(context.env)
    const database = createFirebaseAdminRealtimeDatabaseClient({
      databaseUrl,
      getAccessToken: async () => token,
      fetchImpl: dependencies.databaseFetch,
    })
    return await operation(database)
  } catch (error) {
    console.error('Assessment database operation failed:', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      upstreamStatus: error instanceof FirebaseRealtimeDatabaseError ? error.status : null,
    })
    const status = error instanceof FirebaseServiceAccountError ? 503 : 502
    return context.json({
      success: false,
      error: { code: 'ASSESSMENT_DATABASE_UNAVAILABLE', message: 'Assessment storage is temporarily unavailable.' },
    }, status)
  }
}

async function readJson(context: Context<AppEnv>) {
  try { return await context.req.json() } catch { return undefined }
}

function validationError(context: Context<AppEnv>, error: z.ZodError) {
  return context.json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'The assessment request is invalid.', details: error.issues },
  }, 400)
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
