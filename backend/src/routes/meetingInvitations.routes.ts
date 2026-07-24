import { Hono } from 'hono'

import {
  buildMeetingInvitationEmail,
} from '../emails/meetingInvitation.email'

import {
  requireFirebaseAuth,
  type AuthenticationBindings,
  type AuthenticationVariables,
} from '../middleware/authentication.middleware'

import {
  meetingInvitationRequestSchema,
} from '../schemas/meetingInvitation.schema'

import {
  BrevoRequestError,
  sendBrevoEmail,
  type BrevoBindings,
} from '../services/brevo.service'

type MeetingInvitationBindings =
  AuthenticationBindings &
  BrevoBindings

type MeetingInvitationVariables =
  AuthenticationVariables

interface SentInvitation {
  email: string
  name: string
  messageId: string | null
}

interface FailedInvitation {
  email: string
  name: string
}

const meetingInvitationsRoutes = new Hono<{
  Bindings: MeetingInvitationBindings
  Variables: MeetingInvitationVariables
}>()

meetingInvitationsRoutes.use(
  '*',
  requireFirebaseAuth,
)

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
    recipients,
  } = validation.data

  const sent: SentInvitation[] = []
  const failed: FailedInvitation[] = []

  for (const recipient of recipients) {
    const invitation =
      buildMeetingInvitationEmail(
        locale,
        recipient.name,
        meeting,
      )

    try {
      const result = await sendBrevoEmail(
        context.env,
        {
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: invitation.subject,
          htmlContent: invitation.htmlContent,
          textContent: invitation.textContent,
        },
      )

      sent.push({
        email: recipient.email,
        name: recipient.name,
        messageId: result.messageId,
      })
    } catch (error) {
      failed.push({
        email: recipient.email,
        name: recipient.name,
      })

      if (error instanceof BrevoRequestError) {
        console.error(
          'Meeting invitation delivery failed:',
          {
            recipientEmail: recipient.email,
            providerStatus: error.providerStatus,
            message: error.message,
          },
        )
      } else {
        console.error(
          'Unexpected meeting invitation error:',
          {
            recipientEmail: recipient.email,
            error,
          },
        )
      }
    }
  }

  if (sent.length === 0) {
    return context.json(
      {
        success: false,
        error: {
          code: 'MEETING_INVITATIONS_FAILED',
          message:
            'No meeting invitations could be sent.',
        },
        data: {
          requestedCount: recipients.length,
          sentCount: 0,
          failedCount: failed.length,
          failed,
        },
      },
      502,
    )
  }

  if (failed.length > 0) {
    return context.json(
      {
        success: false,
        error: {
          code: 'PARTIAL_MEETING_INVITATION_FAILURE',
          message:
            'Some meeting invitations could not be sent.',
        },
        data: {
          requestedCount: recipients.length,
          sentCount: sent.length,
          failedCount: failed.length,
          sent,
          failed,
        },
      },
      207,
    )
  }

  return context.json(
    {
      success: true,
      data: {
        requestedCount: recipients.length,
        sentCount: sent.length,
        failedCount: 0,
        sent,
        failed: [],
      },
    },
    201,
  )
})

export default meetingInvitationsRoutes