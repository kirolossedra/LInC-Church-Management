export type BrevoBindings = {
  BREVO_API_KEY: string
  BREVO_SENDER_EMAIL: string
  BREVO_SENDER_NAME: string
}

export interface BrevoRecipient {
  email: string
  name: string
}

export interface BrevoEmailRequest {
  recipientEmail: string
  recipientName: string
  subject: string
  htmlContent: string
  textContent: string
}

export interface BrevoBccEmailRequest {
  recipients: BrevoRecipient[]
  subject: string
  htmlContent: string
  textContent: string
}

export interface BrevoEmailResult {
  messageId: string | null
}

type BrevoResponseBody = {
  messageId?: string
  message?: string
}

export class BrevoRequestError extends Error {
  constructor(
    message: string,
    readonly providerStatus: number | null = null,
  ) {
    super(message)
    this.name = 'BrevoRequestError'
  }
}

async function sendBrevoRequest(
  bindings: BrevoBindings,
  payload: Record<string, unknown>,
): Promise<BrevoEmailResult> {
  let response: Response

  try {
    response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': bindings.BREVO_API_KEY,
        },
        body: JSON.stringify(payload),
      },
    )
  } catch (error) {
    console.error('Unable to reach Brevo:', error)

    throw new BrevoRequestError(
      'The email provider could not be reached.',
    )
  }

  const responseText = await response.text()

  let responseBody: BrevoResponseBody = {}

  try {
    responseBody = responseText
      ? (JSON.parse(responseText) as BrevoResponseBody)
      : {}
  } catch {
    responseBody = {}
  }

  if (!response.ok) {
    console.error(
      'Brevo rejected the email request:',
      response.status,
      responseBody,
    )

    throw new BrevoRequestError(
      responseBody.message ??
        'Brevo rejected the email request.',
      response.status,
    )
  }

  return {
    messageId: responseBody.messageId ?? null,
  }
}

export async function sendBrevoEmail(
  bindings: BrevoBindings,
  email: BrevoEmailRequest,
): Promise<BrevoEmailResult> {
  return sendBrevoRequest(bindings, {
    sender: {
      email: bindings.BREVO_SENDER_EMAIL,
      name: bindings.BREVO_SENDER_NAME,
    },
    to: [
      {
        email: email.recipientEmail,
        name: email.recipientName,
      },
    ],
    subject: email.subject,
    htmlContent: email.htmlContent,
    textContent: email.textContent,
  })
}

export async function sendBrevoBccEmail(
  bindings: BrevoBindings,
  email: BrevoBccEmailRequest,
): Promise<BrevoEmailResult> {
  if (email.recipients.length === 0) {
    throw new BrevoRequestError(
      'At least one BCC recipient is required.',
    )
  }

  return sendBrevoRequest(bindings, {
    sender: {
      email: bindings.BREVO_SENDER_EMAIL,
      name: bindings.BREVO_SENDER_NAME,
    },
    to: [
      {
        email: bindings.BREVO_SENDER_EMAIL,
        name: bindings.BREVO_SENDER_NAME,
      },
    ],
    bcc: email.recipients,
    subject: email.subject,
    htmlContent: email.htmlContent,
    textContent: email.textContent,
  })
}
