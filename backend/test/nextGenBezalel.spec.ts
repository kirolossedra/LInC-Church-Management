import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const bindings = {
  BREVO_API_KEY: 'brevo',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'project',
  FIREBASE_DATABASE_URL: 'https://project.firebaseio.com',
}

const member: AuthenticatedFirebaseUser = {
  uid: 'member-uid', email: 'member@example.com', emailVerified: false,
  name: 'Member', picture: null, signInProvider: 'password',
}
const pastor: AuthenticatedFirebaseUser = {
  ...member, uid: 'pastor-uid', email: 'rev.ibrahim@lincministry.com', name: 'Pastor',
}
const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200, headers: { 'Content-Type': 'application/json' },
})
const request = (path: string, body: unknown) => new Request(`https://worker.test${path}`, {
  method: 'POST',
  headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('NextGen Bezalel integrity rules', () => {
  it('enforces two submitted questions per account before calling Gemini', async () => {
    const reviewQuestion = vi.fn()
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/nextGenPortal/qa/sessions/session-1.json')) {
        return Promise.resolve(json({ title: 'Session', status: 'open', theme: { en: 'Faith', ar: 'الإيمان', sourceLanguage: 'en' } }))
      }
      if (url.endsWith('/nextGenPortal/qa/questions/session-1.json')) {
        const question = (prompt: string) => ({
          prompt,
          options: [{ id: 'option-1', label: 'Upvote' }, { id: 'option-2', label: 'Downvote' }],
          createdByUid: member.uid,
          createdAt: 1,
        })
        return Promise.resolve(json({ first: question('First?'), second: question('Second?') }))
      }
      return Promise.resolve(json(null))
    })
    const app = createApp({ nextGenPortal: {
      verifyToken: vi.fn().mockResolvedValue(member),
      getAccessToken: vi.fn().mockResolvedValue('firebase-token'),
      databaseFetch: databaseFetch as typeof fetch,
      reviewQuestion,
    } })
    const response = await app.request(request('/api/v1/nextgen/qa/sessions/session-1/questions', { prompt: 'Third?' }), undefined, bindings)
    const body = await response.json() as { error: { code: string } }

    expect(response.status).toBe(409)
    expect(body.error.code).toBe('NEXTGEN_QUESTION_LIMIT_REACHED')
    expect(reviewQuestion).not.toHaveBeenCalled()
  })

  it('rejects an off-theme question without writing it', async () => {
    const writes: string[] = []
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'PATCH') writes.push(url)
      if (url.endsWith('/nextGenPortal/qa/sessions/session-1.json')) {
        return Promise.resolve(json({ title: 'Session', status: 'open', theme: { en: 'Faith', ar: 'الإيمان', sourceLanguage: 'en' } }))
      }
      return Promise.resolve(json(null))
    })
    const app = createApp({ nextGenPortal: {
      verifyToken: vi.fn().mockResolvedValue(member),
      getAccessToken: vi.fn().mockResolvedValue('firebase-token'),
      databaseFetch: databaseFetch as typeof fetch,
      reviewQuestion: vi.fn().mockResolvedValue({ relevant: false, reason: 'This is unrelated to the session theme.', suggestedQuestion: 'How does faith shape this issue?' }),
    } })
    const response = await app.request(request('/api/v1/nextgen/qa/sessions/session-1/questions', { prompt: 'Unrelated question' }), undefined, bindings)
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('NEXTGEN_QUESTION_OFF_THEME')
    expect(body.error.message).toContain('Suggested rewrite')
    expect(writes).toHaveLength(0)
  })

  it('requires a theme and stores Bezalel translations when a Pastor creates a session', async () => {
    const writes: Array<Record<string, unknown>> = []
    const databaseFetch = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PATCH' && init.body) writes.push(JSON.parse(String(init.body)))
      return Promise.resolve(json(null))
    })
    const app = createApp({ nextGenPortal: {
      verifyToken: vi.fn().mockResolvedValue(pastor),
      getAccessToken: vi.fn().mockResolvedValue('firebase-token'),
      databaseFetch: databaseFetch as typeof fetch,
      generateId: () => 'session-new',
      translateTheme: vi.fn().mockResolvedValue({ en: 'Serving together', ar: 'الخدمة معًا', sourceLanguage: 'ar' }),
    } })
    const response = await app.request(request('/api/v1/nextgen/pastor/qa/sessions', {
      title: 'Service', description: '', theme: 'الخدمة معًا', status: 'draft',
    }), undefined, bindings)

    expect(response.status).toBe(201)
    expect(writes.some(write => JSON.stringify(write).includes('Serving together'))).toBe(true)
  })
})
