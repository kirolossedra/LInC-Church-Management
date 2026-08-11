import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { generateGeminiJson } from '../src/services/gemini.service'

describe('Gemini service', () => {
  it('uses the current stable Flash model by default', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"status":"ok"}' }] } }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await generateGeminiJson({
      bindings: { GEMINI_API_KEY: 'test-key' },
      systemInstruction: 'Return JSON.',
      prompt: 'Return status ok.',
      responseSchema: {
        type: 'object',
        properties: { status: { type: 'string' } },
        required: ['status'],
        additionalProperties: false,
      },
      validator: z.object({ status: z.string() }),
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(String(fetchImpl.mock.calls[0][0])).toContain(
      '/models/gemini-3.6-flash:generateContent',
    )
  })
})
