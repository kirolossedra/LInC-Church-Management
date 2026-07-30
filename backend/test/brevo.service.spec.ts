import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  BrevoRequestError,
  sendBrevoBccEmail,
} from '../src/services/brevo.service'

const bindings = {
  BREVO_API_KEY: 'test-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Ministry',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendBrevoBccEmail', () => {
  it('sends one provider request with hidden recipients in BCC', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            messageId: 'bcc-message-id',
          }),
          {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )

    const result = await sendBrevoBccEmail(
      bindings,
      {
        recipients: [
          {
            email: 'first@example.com',
            name: 'First Member',
          },
          {
            email: 'second@example.com',
            name: 'Second Member',
          },
        ],
        subject: 'LinC update',
        htmlContent: '<p>Update</p>',
        textContent: 'Update',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, requestInit] = fetchMock.mock.calls[0]
    const payload = JSON.parse(
      String(requestInit?.body),
    ) as {
      to: Array<{
        email: string
        name: string
      }>
      bcc: Array<{
        email: string
        name: string
      }>
    }

    expect(payload.to).toEqual([
      {
        email: bindings.BREVO_SENDER_EMAIL,
        name: bindings.BREVO_SENDER_NAME,
      },
    ])

    expect(payload.bcc).toEqual([
      {
        email: 'first@example.com',
        name: 'First Member',
      },
      {
        email: 'second@example.com',
        name: 'Second Member',
      },
    ])

    expect(result.messageId).toBe('bcc-message-id')
  })

  it('rejects an empty BCC recipient list before calling Brevo', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      sendBrevoBccEmail(bindings, {
        recipients: [],
        subject: 'LinC update',
        htmlContent: '<p>Update</p>',
        textContent: 'Update',
      }),
    ).rejects.toBeInstanceOf(BrevoRequestError)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
