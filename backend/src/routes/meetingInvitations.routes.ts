import { Hono } from 'hono'

import {
  buildMeetingInvitationEmail,
} from '../emails/meetingInvitation.email'

import {
  meetingInvitationRequestSchema,
} from '../schemas/meetingInvitation.schema'

import {
  BrevoRequestError,
  sendBrevoBccEmail,
  type BrevoBindings,
  type BrevoRecipient,
} from '../services/brevo.service'

const meetingInvitationsRoutes = new Hono<{
  Bindings: BrevoBindings
}>()

meetingInvitationsRoutes.post('/', async context => {
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
    meetingInvitationRequestSchema.safeParse(
      requestBody,
    )

  if (!validation.success) {
    return context.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'The meeting invitation request is invalid.',
          details: validation.error.issues,
        },
      },
      400,
    )
  }

  const {
    locale,
    meeting,
    recipients: requestedRecipients,
  } = validation.data

  const recipientsByEmail = new Map<
    string,
    BrevoRecipient
  >()

  requestedRecipients.forEach(recipient => {
    recipientsByEmail.set(
      recipient.email.toLowerCase(),
      recipient,
    )
  })

  const recipients = Array.from(
    recipientsByEmail.values(),
  )

  const invitation =
    buildMeetingInvitationEmail(
      locale,
      meeting,
    )

  try {
    const result = await sendBrevoBccEmail(
      context.env,
      {
        recipients,
        subject: invitation.subject,
        htmlContent: invitation.htmlContent,
        textContent: invitation.textContent,
      },
    )

    return context.json(
      {
        success: true,
        data: {
          requestedCount:
            requestedRecipients.length,
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
        'Meeting invitation BCC delivery failed:',
        {
          providerStatus: error.providerStatus,
          message: error.message,
        },
      )
    } else {
      console.error(
        'Unexpected meeting invitation error:',
        error,
      )
    }

    return context.json(
      {
        success: false,
        error: {
          code: 'MEETING_INVITATIONS_FAILED',
          message:
            'The meeting invitations could not be sent.',
        },
        data: {
          requestedCount:
            requestedRecipients.length,
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

export default meetingInvitationsRoutes
