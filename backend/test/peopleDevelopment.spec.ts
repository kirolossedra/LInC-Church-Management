import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const bindings = {
  BREVO_API_KEY: 'test', BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'Test', BREVO_TEST_RECIPIENT: 'test@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
}

const pastor: AuthenticatedFirebaseUser = {
  uid: 'pastor', email: 'rev.ibrahim@lincministry.com', emailVerified: false,
  name: null, picture: null, signInProvider: 'password',
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

function etagResponse(value: unknown, etag = 'null-etag') {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json', etag },
  })
}

function request(path: string, method = 'GET', body?: unknown, token = 'valid-token') {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: {
      ...(path.includes('/pastor') || path.endsWith('/portal') ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function app(fetchMock: ReturnType<typeof vi.fn>, user = pastor) {
  return createApp({ peopleDevelopment: {
    verifyToken: vi.fn().mockResolvedValue(user),
    getAccessToken: vi.fn().mockResolvedValue('service-token'),
    databaseFetch: fetchMock as unknown as typeof fetch,
    now: () => 1_777_777_777_000,
  } })
}

describe('People Development routes', () => {
  it('requires Firebase authentication for People Notes portal access', async () => {
    const fetchMock = vi.fn()
    const result = await app(fetchMock).request(
      '/api/v1/people-development/portal',
      {},
      bindings,
    )
    expect(result.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a Firebase account that is not linked to a person', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      other: { firebaseUid: 'someone-else', identifier: 'MEMBER-123' },
    }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/portal'),
      undefined,
      bindings,
    )
    expect(result.status).toBe(403)
  })

  it('returns only the matched group assignments and active schedules', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        member: { firebaseUid: 'pastor', identifier: 'MEMBER-123', fullName: 'Member', group: 'teachers', email: 'member@example.com' },
      }))
      .mockResolvedValueOnce(response({
        teacher: { group: 'teachers', groups: ['teachers'], text: 'Teacher note', createdAt: 10 },
        pastor: { group: 'pastors', groups: ['pastors'], text: 'Pastor note', createdAt: 20 },
      }))
      .mockResolvedValueOnce(response({
        group: { audience: 'group', group: 'teachers', active: true, ordinal: 1, weekday: 1, startTime: '19:00', startDate: '2026-01-01' },
        other: { audience: 'group', group: 'pastors', active: true, ordinal: 1, weekday: 1, startTime: '19:00', startDate: '2026-01-01' },
        shared: { audience: 'shared', active: true, ordinal: 1, weekday: 1, startTime: '19:00', startDate: '2026-01-01' },
        disabled: { audience: 'shared', active: false, ordinal: 1, weekday: 1, startTime: '19:00', startDate: '2026-01-01' },
      }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/portal'),
      undefined,
      bindings,
    )
    const body = await result.json() as { data: { assignments: Array<{ id: string }>, schedules: Array<{ id: string }>, personalNotes?: unknown } }
    expect(result.status).toBe(200)
    expect(body.data.assignments.map(item => item.id)).toEqual(['teacher'])
    expect(body.data.schedules.map(item => item.id).sort()).toEqual(['group', 'shared'])
    expect(body.data.personalNotes).toBeUndefined()
    expect(result.headers.get('Cache-Control')).toContain('no-store')
  })

  it('returns no group data for a recognized unassigned member', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      member: { firebaseUid: 'pastor', identifier: 'MEMBER-UNASSIGNED', fullName: 'Waiting Member', group: '', email: 'waiting@example.com' },
    }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/portal'),
      undefined,
      bindings,
    )
    const body = await result.json() as {
      data: { profile: { identifier: string, group: string }, assignments: unknown[], schedules: unknown[] }
    }
    expect(result.status).toBe(200)
    expect(body.data.profile).toMatchObject({ identifier: 'MEMBER-UNASSIGNED', group: '' })
    expect(body.data.assignments).toEqual([])
    expect(body.data.schedules).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.headers.get('Cache-Control')).toContain('no-store')
  })

  it('requires Firebase authentication for pastor routes', async () => {
    const fetchMock = vi.fn()
    const result = await app(fetchMock).request(
      '/api/v1/people-development/pastor/snapshot',
      {},
      bindings,
    )
    expect(result.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects authenticated non-pastors before database access', async () => {
    const fetchMock = vi.fn()
    const result = await app(fetchMock, { ...pastor, email: 'admin@example.com' }).request(
      request('/api/v1/people-development/pastor/snapshot'), undefined, bindings,
    )
    expect(result.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects arbitrary member source paths', async () => {
    const fetchMock = vi.fn()
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/members/member-1/group', 'PATCH', {
        identifier: 'MEMBER-1', sourcePath: 'form/../../admins', sourceKeys: ['record-1'],
        group: 'teachers', groupLabel: 'Teachers',
      }), undefined, bindings,
    )
    expect(result.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('assigns a member using backend-controlled narrow updates', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/members/member-1/group', 'PATCH', {
        identifier: 'MEMBER-1', fullName: 'Member', email: '', primaryGift: '',
        sourcePath: 'form', sourceKeys: ['record-1'], group: 'teachers', groupLabel: 'Teachers',
      }), undefined, bindings,
    )
    expect(result.status).toBe(200)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(payload['peopleDevelopment/members/member-1']).toMatchObject({ group: 'teachers', updatedAt: 1_777_777_777_000 })
    expect(payload['form/record-1/peopleDevelopmentGroup']).toBe('teachers')
    expect(Object.keys(payload).some(key => key.includes('admins'))).toBe(false)
  })

  it('creates assignments with server timestamps and generated IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ name: 'assignment-new' }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/assignments', 'POST', {
        groups: ['teachers'], groupLabel: 'Teachers', text: 'Prepare lesson', attachments: [], source: 'pastorCalendar',
      }), undefined, bindings,
    )
    const body = await result.json() as { data: { id: string } }
    expect(result.status).toBe(201)
    expect(body.data.id).toBe('assignment-new')
    const payload = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as Record<string, unknown>
    expect(payload.createdAt).toBe(1_777_777_777_000)
    expect(payload.group).toBe('teachers')
  })

  it('creates a schedule at an atomic canonical Firebase key', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(etagResponse(null))
      .mockResolvedValueOnce(response({ ok: true }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/schedules', 'POST', {
        audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
      }), undefined, bindings,
    )
    const body = await result.json() as { data: { id: string } }
    expect(result.status).toBe(201)
    expect(body.data.id).toBe('schedule_group_teachers_1_2_1800_60_20260801_open')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe('PUT')
    expect((fetchMock.mock.calls[2][1] as RequestInit).headers).toMatchObject({ 'if-match': 'null-etag' })
  })

  it('rejects a duplicate schedule already stored under a legacy random key', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      legacy: {
        audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: false,
      },
    }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/schedules', 'POST', {
        audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
      }), undefined, bindings,
    )
    const body = await result.json() as { error: { code: string } }
    expect(result.status).toBe(409)
    expect(body.error.code).toBe('PEOPLE_DEVELOPMENT_SCHEDULE_CONFLICT')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an identical concurrent schedule when the atomic write loses the race', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(etagResponse(null))
      .mockResolvedValueOnce(response({ conflict: true }, 412))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/schedules', 'POST', {
        audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
      }), undefined, bindings,
    )
    expect(result.status).toBe(409)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects editing a schedule into an existing schedule identity', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      first: {
        audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
      },
      second: {
        audience: 'group', group: 'teachers', ordinal: 2, weekday: 2,
        startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
      },
    }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/schedules/second', 'PATCH', { ordinal: 1 }),
      undefined,
      bindings,
    )
    expect(result.status).toBe(409)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates identical legacy schedules in pastor snapshots', async () => {
    const duplicate = {
      audience: 'group', group: 'teachers', ordinal: 1, weekday: 2,
      startTime: '18:00', durationMinutes: 60, startDate: '2026-08-01', endDate: '', active: true,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response({ first: duplicate, second: duplicate }))
    const result = await app(fetchMock).request(
      request('/api/v1/people-development/pastor/snapshot'), undefined, bindings,
    )
    const body = await result.json() as { data: { schedules: unknown[] } }
    expect(result.status).toBe(200)
    expect(body.data.schedules).toHaveLength(1)
  })
})
