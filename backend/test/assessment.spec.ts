import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
}

const verifiedAdmin: AuthenticatedFirebaseUser = {
  uid: 'assessment-admin',
  email: 'assessment.admin@example.com',
  emailVerified: true,
  name: 'Assessment Admin',
  picture: null,
  signInProvider: 'password',
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function request(path: string, method = 'GET', body?: unknown, authenticated = false) {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: {
      ...(authenticated ? { Authorization: 'Bearer valid-token' } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function createTestApp(
  databaseFetch: ReturnType<typeof vi.fn>,
  sendNotification = vi.fn().mockResolvedValue({ messageId: 'message-1' }),
) {
  return createApp({
    assessment: {
      verifyToken: vi.fn().mockResolvedValue(verifiedAdmin),
      getAccessToken: vi.fn().mockResolvedValue('server-token'),
      databaseFetch: databaseFetch as unknown as typeof fetch,
      sendNotification,
      now: () => 1_777_777_777_000,
    },
  })
}

function validPathwayAnswers() {
  const answers: Record<string, string | number> = {
    fullName: 'Visitor Name',
    email: 'visitor@example.com',
    surveyDate: '2026-08-04',
    age: 35,
    attendance: 'Weekly',
    currentService: '',
    workContext: '',
    arabicFluency: '',
    englishFluency: '',
    otherLanguages: '',
    q1_1: 'Answer 1', q1_2: 'Answer 2', q1_3: 'Answer 3', q1_4: 'Answer 4', q1_5: 'Answer 5',
    v1: 'Vision 1', v2: 'Vision 2', v3: 'Vision 3', v4: 'Vision 4', v5: 'Vision 5', v6: '',
  }
  for (const group of ['A', 'B', 'C', 'D', 'E']) {
    for (let index = 1; index <= 5; index += 1) {
      answers[`${group}${index}`] = group === 'A' ? 5 : group === 'B' ? 4 : 1
    }
  }
  for (let index = 1; index <= 10; index += 1) answers[`F${index}`] = index === 3 ? 5 : 1
  return answers
}

function adminProfile(authority = true) {
  return {
    uid: verifiedAdmin.uid,
    email: verifiedAdmin.email,
    role: 'administrator',
    status: 'active',
    authority: {
      manageAssessmentForms: authority,
      manageCarousel: false,
      manageAttendance: false,
    },
    firstSignedInAt: 1,
    lastSignedInAt: 2,
  }
}

describe('Assessment routes', () => {
  it('returns public form states without authentication', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(jsonResponse({
      'five-service-pathways': { state: 'disabled' },
      'spiritual-gifts-discovery': { state: 'hidden' },
    }))
    const app = createTestApp(databaseFetch)
    const response = await app.request('/api/v1/assessment/forms', {}, mockBindings)
    const body = await response.json() as { data: { forms: Record<string, string> } }

    expect(response.status).toBe(200)
    expect(body.data.forms).toEqual({
      'five-service-pathways': 'disabled',
      'spiritual-gifts-discovery': 'hidden',
    })
  })

  it('stores a validated assessment with server calculations and timestamps', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(jsonResponse({ name: 'response-new' }))
      return Promise.resolve(jsonResponse(null))
    })
    const sendNotification = vi.fn().mockResolvedValue({ messageId: 'message-1' })
    const app = createTestApp(databaseFetch, sendNotification)
    const response = await app.request(request('/api/v1/assessment/submissions', 'POST', {
      formId: 'five-service-pathways', locale: 'en', answers: validPathwayAnswers(),
    }), undefined, mockBindings)
    const body = await response.json() as { data: { id: string; result: Record<string, string> } }

    expect(response.status).toBe(201)
    expect(body.data.id).toBe('response-new')
    expect(body.data.result.primaryGift).toContain('Apostolic')
    expect(body.data.result.recommendedMinistry).toContain('Bible Teaching')
    const postCall = databaseFetch.mock.calls.find(call => (call[1] as RequestInit)?.method === 'POST')
    const stored = JSON.parse(String((postCall?.[1] as RequestInit).body)) as Record<string, unknown>
    expect(stored).toMatchObject({
      formId: 'five-service-pathways',
      source: 'hono-public-assessment',
      createdAt: 1_777_777_777_000,
    })
    expect(sendNotification).toHaveBeenCalledTimes(2)
  })

  it('rejects unknown answers and invalid ratings', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(jsonResponse(null))
    const app = createTestApp(databaseFetch)
    const response = await app.request(request('/api/v1/assessment/submissions', 'POST', {
      formId: 'five-service-pathways', locale: 'en',
      answers: { ...validPathwayAnswers(), A1: 99, injected: 'value' },
    }), undefined, mockBindings)

    expect(response.status).toBe(400)
    expect(databaseFetch.mock.calls.some(call => (call[1] as RequestInit)?.method === 'POST')).toBe(false)
  })

  it('refuses submissions when an administrator disabled the form', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(jsonResponse({ state: 'disabled' }))
    const app = createTestApp(databaseFetch)
    const response = await app.request(request('/api/v1/assessment/submissions', 'POST', {
      formId: 'five-service-pathways', locale: 'en', answers: validPathwayAnswers(),
    }), undefined, mockBindings)
    expect(response.status).toBe(409)
  })

  it('keeps a stored assessment successful when Brevo fails', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) =>
      Promise.resolve(init?.method === 'POST' ? jsonResponse({ name: 'response-new' }) : jsonResponse(null)),
    )
    const app = createTestApp(databaseFetch, vi.fn().mockRejectedValue(new Error('Brevo unavailable')))
    const response = await app.request(request('/api/v1/assessment/submissions', 'POST', {
      formId: 'five-service-pathways', locale: 'en', answers: validPathwayAnswers(),
    }), undefined, mockBindings)
    const body = await response.json() as { data: { notificationSent: boolean } }
    expect(response.status).toBe(201)
    expect(body.data.notificationSent).toBe(false)
  })

  it('stores a public direct signup with backend-controlled fields', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, init?: RequestInit) =>
      Promise.resolve(init?.method === 'POST' ? jsonResponse({ name: 'signup-new' }) : jsonResponse(null)),
    )
    const app = createTestApp(databaseFetch)
    const response = await app.request(request('/api/v1/assessment/direct-signups', 'POST', {
      fullName: 'Direct Person', email: 'direct@example.com', locale: 'ar',
    }), undefined, mockBindings)
    expect(response.status).toBe(201)
    const postCall = databaseFetch.mock.calls.find(call => (call[1] as RequestInit)?.method === 'POST')
    const stored = JSON.parse(String((postCall?.[1] as RequestInit).body)) as Record<string, unknown>
    expect(stored).toMatchObject({
      sourceFormId: 'directSignup',
      source: 'hono-public-assessment',
      fullName: 'Direct Person',
      interfaceLanguageUsed: 'Arabic',
    })
  })

  it('requires Firebase authentication for User Linkage', async () => {
    const databaseFetch = vi.fn()
    const app = createTestApp(databaseFetch)
    const response = await app.request(
      '/api/v1/assessment/admin/responses?formId=five-service-pathways',
      {},
      mockBindings,
    )
    expect(response.status).toBe(401)
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('denies an active administrator without Manage Assessment Forms allocation', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(jsonResponse(adminProfile(false)))
    const app = createTestApp(databaseFetch)
    const response = await app.request(request(
      '/api/v1/assessment/admin/responses?formId=five-service-pathways',
      'GET', undefined, true,
    ), undefined, mockBindings)
    expect(response.status).toBe(403)
    expect(databaseFetch).toHaveBeenCalledTimes(1)
  })

  it('allows an allocated administrator to list normalized User Linkage responses', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/administration/adminHierarchy/users/assessment-admin.json')) {
        return Promise.resolve(jsonResponse(adminProfile(true)))
      }
      return Promise.resolve(jsonResponse({
        response1: {
          formId: 'five-service-pathways', createdAt: 10,
          fields: { trainee: { fullName: { value: 'Member One' }, email: { value: 'member@example.com' } } },
        },
      }))
    })
    const app = createTestApp(databaseFetch)
    const response = await app.request(request(
      '/api/v1/assessment/admin/responses?formId=five-service-pathways',
      'GET', undefined, true,
    ), undefined, mockBindings)
    const body = await response.json() as { data: { responses: Array<{ fullName: string }> } }
    expect(response.status).toBe(200)
    expect(body.data.responses[0].fullName).toBe('Member One')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })

  it('lets an allocated administrator update linkage and form availability', async () => {
    const databaseFetch = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      return Promise.resolve(url.includes('/administration/adminHierarchy/users/')
        ? jsonResponse(adminProfile(true))
        : jsonResponse({}))
    })
    const app = createTestApp(databaseFetch)
    const linkageResponse = await app.request(request(
      '/api/v1/assessment/admin/responses/response1/linkage', 'PATCH',
      { userIdentifier: 'member-001', databaseFormId: '0' }, true,
    ), undefined, mockBindings)
    const stateResponse = await app.request(request(
      '/api/v1/assessment/admin/forms/five-service-pathways', 'PATCH',
      { state: 'hidden' }, true,
    ), undefined, mockBindings)
    expect(linkageResponse.status).toBe(200)
    expect(stateResponse.status).toBe(200)
    const patchBodies = databaseFetch.mock.calls
      .filter(call => (call[1] as RequestInit)?.method === 'PATCH')
      .map(call => JSON.parse(String((call[1] as RequestInit).body)))
    expect(patchBodies).toEqual(expect.arrayContaining([
      expect.objectContaining({ userIdentifier: 'member-001', databaseFormId: '0' }),
      expect.objectContaining({ state: 'hidden' }),
    ]))
  })
})
