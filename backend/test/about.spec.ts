import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'

const bindings = {
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_DATABASE_URL: 'https://test-project.firebaseio.com',
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Public About Us routes', () => {
  it('returns the ordered public people directory without authentication', async () => {
    const databaseFetch = vi.fn().mockResolvedValue(jsonResponse({
      second: {
        photoUrl: 'data:image/png;base64,Yg==',
        nameEn: 'Grace Hopper',
        roleEn: 'Ministry advisor',
        order: 1,
        createdAt: 20,
        updatedAt: 21,
      },
      first: {
        photoUrl: 'data:image/png;base64,YQ==',
        nameAr: 'إبراهيم',
        roleAr: 'راعي',
        order: 0,
        createdAt: 10,
        updatedAt: 11,
      },
      invalid: { nameEn: 'Missing portrait and role' },
    }))
    const app = createApp({
      about: {
        getAccessToken: vi.fn().mockResolvedValue('server-token'),
        databaseFetch,
      },
    })

    const response = await app.request('/api/v1/about/people', {}, bindings)
    const body = await response.json() as { data: { people: Array<{ id: string }> } }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('public')
    expect(body.data.people.map(person => person.id)).toEqual(['first', 'second'])
    expect(databaseFetch).toHaveBeenCalledTimes(1)
  })

  it('returns a meaningful service error when Firebase is unavailable', async () => {
    const app = createApp({
      about: {
        getAccessToken: vi.fn().mockRejectedValue(new Error('Firebase unavailable')),
      },
    })

    const response = await app.request('/api/v1/about/people', {}, bindings)

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'ABOUT_PEOPLE_UNAVAILABLE',
        message: 'The About Us directory is temporarily unavailable.',
      },
    })
  })
})
