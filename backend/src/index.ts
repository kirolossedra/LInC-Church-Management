import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

import meetingInvitationsRoutes from './routes/meetingInvitations.routes'

type Bindings = {
  BREVO_API_KEY: string
  BREVO_SENDER_EMAIL: string
  BREVO_SENDER_NAME: string
  BREVO_TEST_RECIPIENT: string
  FIREBASE_PROJECT_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '/api/*',
  cors({
    origin: [
      'https://lincministry.com',
      'http://localhost:5173',
    ],
    allowHeaders: [
      'Content-Type',
      'Authorization',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }),
)

const requestSchema = z
  .object({
    sandbox: z.boolean().default(true),
  })
  .strict()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/api/v1/email/test', async (c) => {
  let requestBody: unknown = {}

  try {
    requestBody = await c.req.json()
  } catch {
    requestBody = {}
  }

  const validation = requestSchema.safeParse(requestBody)

  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request body is invalid.',
          details: validation.error.issues,
        },
      },
      400,
    )
  }

  const brevoResponse = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': c.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: c.env.BREVO_SENDER_NAME,
          email: c.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: c.env.BREVO_TEST_RECIPIENT,
            name: 'LinC Backend Test',
          },
        ],
        subject: 'LinC Cloudflare backend test',
        htmlContent: `
          <html>
            <body>
              <h1>LinC backend test succeeded</h1>
              <p>
                This email request passed through the Cloudflare Worker backend.
              </p>
            </body>
          </html>
        `,
        ...(validation.data.sandbox
          ? {
              headers: {
                'X-Sib-Sandbox': 'drop',
              },
            }
          : {}),
      }),
    },
  )

  const brevoBody = (await brevoResponse.json()) as {
    messageId?: string
    message?: string
  }

  if (!brevoResponse.ok) {
    console.error(
      'Brevo request failed:',
      brevoResponse.status,
      brevoBody,
    )

    return c.json(
      {
        success: false,
        error: {
          code: 'BREVO_REQUEST_FAILED',
          message:
            brevoBody.message ??
            'Brevo rejected the email request.',
        },
      },
      502,
    )
  }

  return c.json(
    {
      success: true,
      data: {
        sandbox: validation.data.sandbox,
        messageId: brevoBody.messageId ?? null,
      },
    },
    201,
  )
})

app.route(
  '/api/v1/meeting-invitations',
  meetingInvitationsRoutes,
)

export default app