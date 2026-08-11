import { z } from 'zod'

export type GeminiBindings = {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
}

export class GeminiServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 503,
  ) {
    super(message)
    this.name = 'GeminiServiceError'
  }
}

type JsonSchema = Record<string, unknown>

export async function generateGeminiJson<T>({
  bindings,
  systemInstruction,
  prompt,
  responseSchema,
  validator,
  fetchImpl = fetch,
}: {
  bindings: GeminiBindings
  systemInstruction: string
  prompt: string
  responseSchema: JsonSchema
  validator: z.ZodType<T>
  fetchImpl?: typeof fetch
}): Promise<T> {
  const apiKey = bindings.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new GeminiServiceError(
      'BEZALEL_NOT_CONFIGURED',
      'Bezalel is not configured yet.',
    )
  }

  const model = bindings.GEMINI_MODEL?.trim() || 'gemini-3.6-flash'
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: responseSchema,
        },
      }),
    },
  )

  const payload = await response.json().catch(() => null) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  } | null

  if (!response.ok) {
    console.error('Gemini request failed:', response.status)
    throw new GeminiServiceError(
      response.status === 429 ? 'BEZALEL_RATE_LIMITED' : 'BEZALEL_UPSTREAM_FAILED',
      response.status === 429
        ? 'Bezalel has reached the current Gemini usage limit. Please try again later.'
        : 'Bezalel is temporarily unavailable.',
      response.status === 429 ? 429 : 503,
    )
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim()
  if (!text) {
    throw new GeminiServiceError(
      'BEZALEL_EMPTY_RESPONSE',
      'Bezalel returned an empty response.',
    )
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(text)
  } catch {
    throw new GeminiServiceError(
      'BEZALEL_INVALID_RESPONSE',
      'Bezalel returned an invalid response.',
    )
  }

  const parsed = validator.safeParse(decoded)
  if (!parsed.success) {
    throw new GeminiServiceError(
      'BEZALEL_INVALID_RESPONSE',
      'Bezalel returned an invalid response.',
    )
  }
  return parsed.data
}
