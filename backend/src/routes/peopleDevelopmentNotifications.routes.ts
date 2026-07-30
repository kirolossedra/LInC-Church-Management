import { Hono } from 'hono'

import {
  buildPeopleDevelopmentNotificationEmail,
} from '../emails/peopleDevelopmentNotification.email'

import {
  requireFirebaseAuth,
  type AuthenticationBindings,
  type AuthenticationVariables,
} from '../middleware/authentication.middleware'

import {
  requirePastorRole,
  type PastorAuthorizationBindings,
} from '../middleware/authorization.middleware'

import {
  peopleDevelopmentNotificationRequestSchema,
} from '../schemas/peopleDevelopmentNotification.schema'

import {
  BrevoRequestError,
  sendBrevoBccEmail,
  type BrevoBindings,
  type BrevoRecipient,
} from '../services/brevo.service'

type PeopleDevelopmentNotificationBindings =
  AuthenticationBindings &
  PastorAuthorizationBindings &
  BrevoBindings

type PeopleDevelopmentNotificationVariables =
  AuthenticationVariables

const routes = new Hono<{
  Bindings: PeopleDevelopmentNotificationBindings
  Variables: PeopleDevelopmentNotificationVariables
}>()

routes.use('*', requireFirebaseAuth)
routes.use('*', requirePastorRole)

routes.post('/', async context => {
  let requestBody: unknown

  try {
    requestBody = await context.req.json()
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message:
            'The request body must contain valid JSON.',
        },
      },
      400,
    )
  }

  const validation =
    peopleDevelopmentNotificationRequestSchema.safeParse(
      requestBody,
    )

  if (!validation.success) {
    return context.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'The People Development notification request is invalid.',
          details: validation.error.issues,
        },
      },
      400,
    )
  }

  const recipientsByEmail = new Map<
    string,
    BrevoRecipient
  >()

  validation.data.recipients.forEach(recipient => {
    recipientsByEmail.set(
      recipient.email.toLowerCase(),
      recipient,
    )
  })

  const recipients = Array.from(
    recipientsByEmail.values(),
  )

  const email =
    buildPeopleDevelopmentNotificationEmail({
      ...validation.data,
      recipients,
    })

  try {
    const result = await sendBrevoBccEmail(
      context.env,
      {
        recipients,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent,
      },
    )

    return context.json(
      {
        success: true,
        data: {
          assignmentId:
            validation.data.assignmentId,
          requestedCount:
            validation.data.recipients.length,
          recipientCount: recipients.length,
          sentCount: recipients.length,
          failedCount: 0,
          apiRequestCount: 1,
          deliveryMode: 'bcc',
          messageId: result.messageId,
        },
      },
      201,
    )
  } catch (error) {
    if (error instanceof BrevoRequestError) {
      console.error(
        'People Development BCC delivery failed:',
        {
          assignmentId:
            validation.data.assignmentId,
          providerStatus: error.providerStatus,
          message: error.message,
        },
      )
    } else {
      console.error(
        'Unexpected People Development notification error:',
        error,
      )
    }

    return context.json(
      {
        success: false,
        error: {
          code: 'PEOPLE_DEVELOPMENT_NOTIFICATION_FAILED',
          message:
            'The People Development notification could not be sent.',
        },
        data: {
          assignmentId:
            validation.data.assignmentId,
          requestedCount:
            validation.data.recipients.length,
          recipientCount: recipients.length,
          sentCount: 0,
          failedCount: recipients.length,
          apiRequestCount: 1,
          deliveryMode: 'bcc',
        },
      },
      502,
    )
  }
})

export default routes
