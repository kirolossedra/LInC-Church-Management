import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const missionMapData = {
  locations: [
    {
      id: 'test-church',
      name: 'Test Church',
      type: 'church',
      address: '100 Test Street, Montréal, QC',
      latitude: 45.5,
      longitude: -73.6,
      languages: ['Arabic', 'English'],
    },
    {
      id: 'test-mall',
      name: 'Test Mall',
      type: 'mall',
      address: '200 Test Street, Montréal, QC',
      latitude: 45.55,
      longitude: -73.65,
      languages: ['French'],
    },
  ],
  connections: [
    {
      from: 'test-church',
      to: 'test-mall',
      minutes: 12,
    },
  ],
}

const mockBindings = {
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  BREVO_SENDER_NAME: 'LinC Test Sender',
  BREVO_TEST_RECIPIENT: 'recipient@example.com',
  FIREBASE_PROJECT_ID: 'test-project',
  NEXTGEN_MISSION_MAP_DATA: JSON.stringify(missionMapData),
}

const nextGenUser: AuthenticatedFirebaseUser = {
  uid: 'nextgen-map-uid',
  email: 'NextGen@Montreal.ca',
  emailVerified: false,
  name: null,
  picture: null,
  signInProvider: 'password',
}

function authRequest(token = 'valid-nextgen-token') {
  return new Request(
    'https://worker.test/api/v1/nextgen/mission-map',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}

describe('NextGen Montréal Mission Trip map', () => {
  it('requires a Firebase Bearer token', async () => {
    const app = createApp({
      nextGenMissionMap: {
        verifyToken: vi.fn(),
      },
    })

    const response = await app.request(
      '/api/v1/nextgen/mission-map',
      {},
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('forbids a different Firebase email', async () => {
    const app = createApp({
      nextGenMissionMap: {
        verifyToken: vi.fn().mockResolvedValue({
          ...nextGenUser,
          email: 'member@montreal.ca',
        }),
      },
    })

    const response = await app.request(
      authRequest(),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(403)
    expect(body.error.code).toBe(
      'NEXTGEN_MISSION_MAP_ACCESS_REQUIRED',
    )
  })

  it('requires the Firebase password provider', async () => {
    const app = createApp({
      nextGenMissionMap: {
        verifyToken: vi.fn().mockResolvedValue({
          ...nextGenUser,
          signInProvider: 'google.com',
        }),
      },
    })

    const response = await app.request(
      authRequest(),
      undefined,
      mockBindings,
    )

    expect(response.status).toBe(403)
  })

  it('returns validated map data for the exact login', async () => {
    const verifyToken = vi.fn().mockResolvedValue(nextGenUser)
    const app = createApp({
      nextGenMissionMap: { verifyToken },
    })

    const response = await app.request(
      authRequest(),
      undefined,
      mockBindings,
    )
    const body = (await response.json()) as {
      success: boolean
      data: typeof missionMapData
    }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.locations).toHaveLength(2)
    expect(body.data.connections).toEqual(
      missionMapData.connections,
    )
    expect(response.headers.get('Cache-Control')).toContain(
      'no-store',
    )
    expect(verifyToken).toHaveBeenCalledWith(
      'valid-nextgen-token',
      'test-project',
    )
  })

  it('fails closed when the secret map data is invalid', async () => {
    const app = createApp({
      nextGenMissionMap: {
        verifyToken: vi.fn().mockResolvedValue(nextGenUser),
      },
    })

    const response = await app.request(
      authRequest(),
      undefined,
      {
        ...mockBindings,
        NEXTGEN_MISSION_MAP_DATA: '{invalid-json',
      },
    )
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe(
      'NEXTGEN_MISSION_MAP_UNAVAILABLE',
    )
  })
})
