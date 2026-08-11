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

const pastor: AuthenticatedFirebaseUser = {
  uid: 'pastor-uid',
  email: 'rev.ibrahim@lincministry.com',
  emailVerified: false,
  name: 'Pastor',
  picture: null,
  signInProvider: 'password',
}

const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

describe('Bezalel agent routes', () => {
  it('requires Pastor authentication before exposing the private calendar agent', async () => {
    const app = createApp({ bezalel: { verifyToken: vi.fn().mockResolvedValue(pastor) } })
    const response = await app.request('/api/v1/bezalel/pastor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Open tomorrow.' }], locale: 'en' }),
    }, bindings)

    expect(response.status).toBe(401)
  })

  it('provides a sanitized calendar and preserves validated multi-day Pastor actions', async () => {
    const pastorAgent = vi.fn().mockResolvedValue({
      reply: 'I will open booking on August 20 and 21 from 2 PM to 4 PM.',
      focusDates: ['2026-08-20', '2026-08-21'],
      actions: ['2026-08-20', '2026-08-21'].map(date => ({
        action: 'open_availability',
        date,
        startTime: '14:00',
        endTime: '16:00',
        targetId: '',
        reason: 'Office hours',
        meetingTitle: 'Meeting with Pastor',
      })),
    })
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/availability.json')) return Promise.resolve(json({ block: { date: '2026-08-20', startTime: '09:00', endTime: '12:00', internalSecret: 'hidden' } }))
      return Promise.resolve(json({}))
    })
    const app = createApp({
      bezalel: {
        verifyToken: vi.fn().mockResolvedValue(pastor),
        databaseFetch: databaseFetch as typeof fetch,
        pastorAgent,
        now: () => Date.parse('2026-08-11T12:00:00Z'),
      },
    })
    const response = await app.request('/api/v1/bezalel/pastor/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Open August 20 from 2 to 4 PM.' }], locale: 'en' }),
    }, bindings)
    const body = await response.json() as { data: { focusDates: string[]; actions: Array<{ action: string; date: string }> } }

    expect(response.status).toBe(200)
    expect(body.data.focusDates).toEqual(['2026-08-20', '2026-08-21'])
    expect(body.data.actions).toEqual([
      expect.objectContaining({ action: 'open_availability', date: '2026-08-20' }),
      expect.objectContaining({ action: 'open_availability', date: '2026-08-21' }),
    ])
    const calendar = pastorAgent.mock.calls[0][1].calendar
    expect(JSON.stringify(calendar)).not.toContain('internalSecret')
  })

  it('lets the public booking agent inspect only public availability', async () => {
    const bookingAgent = vi.fn().mockResolvedValue({
      reply: 'The first opening is August 20 at 9 AM.',
      stage: 'answer',
      focusDate: '2026-08-20',
      suggestions: [{ date: '2026-08-20', startTime: '09:00', endTime: '09:30' }],
      booking: { name: '', email: '', date: '', startTime: '', endTime: '', reason: '' },
    })
    const databaseFetch = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/availability.json')) return Promise.resolve(json({ open: { date: '2026-08-20', startTime: '09:00', endTime: '10:00' } }))
      return Promise.resolve(json(null))
    })
    const app = createApp({
      bezalel: {
        getAccessToken: vi.fn().mockResolvedValue('firebase-token'),
        databaseFetch: databaseFetch as typeof fetch,
        bookingAgent,
        now: () => Date.parse('2026-08-11T12:00:00Z'),
      },
    })
    const response = await app.request('/api/v1/bezalel/booking/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'What is the first opening?' }], locale: 'en' }),
    }, bindings)

    expect(response.status).toBe(200)
    expect(bookingAgent.mock.calls[0][1].schedule.availability).toEqual([
      { date: '2026-08-20', startTime: '09:00', endTime: '10:00' },
    ])
  })
})
