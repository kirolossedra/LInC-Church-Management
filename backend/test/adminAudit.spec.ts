import { describe, expect, it, vi } from 'vitest'

import { normalizeAdminAuditEvents, writeAdminAudit } from '../src/admin/adminAudit'
import type { AdminAccount } from '../src/admin/adminAuthorization'
import type { FirebaseRealtimeDatabaseClient } from '../src/services/firebaseRealtimeDatabase.service'
import type { AuthenticatedFirebaseUser } from '../src/types/app'

const actor: AuthenticatedFirebaseUser = {
  uid: 'admin-uid',
  email: 'Admin@Example.com',
  emailVerified: true,
  name: null,
  picture: null,
  signInProvider: 'password',
}

const account: AdminAccount = {
  uid: 'admin-uid',
  email: 'admin@example.com',
  role: 'administrator',
  status: 'active',
  authority: {
    manageAssessmentForms: true,
    manageCarousel: true,
    manageAttendance: true,
    manageArchives: true,
    manageNextGenQa: true,
    managePeopleAccess: true,
    manageAbout: true,
  },
  firstSignedInAt: 1,
  lastSignedInAt: 2,
}

describe('administrator audit records', () => {
  it('redacts credentials and file or image contents before persisting an event', async () => {
    const patch = vi.fn().mockResolvedValue({})
    const database = { patch } as unknown as FirebaseRealtimeDatabaseClient

    const event = await writeAdminAudit({
      database,
      id: 'audit-1',
      occurredAt: 1_777_777_777_000,
      actor,
      account,
      action: 'administrator.test.updated',
      targetType: 'test',
      targetId: 'target-1',
      summary: 'Updated a protected record.',
      changes: {
        displayName: { before: 'Before', after: 'After' },
        password: { before: 'old-secret', after: 'new-secret' },
      },
      metadata: {
        accessToken: 'token-value',
        nested: { privateKey: 'key-value', fileContent: 'file-value', safe: 'visible' },
        photoBase64: 'data:image/png;base64,secret',
      },
    })

    expect(patch).toHaveBeenCalledWith(['administration', 'auditLog', 'audit-1'], event)
    expect(event.actorEmail).toBe('admin@example.com')
    expect(event.changes).toMatchObject({
      displayName: { before: 'Before', after: 'After' },
      password: { before: '[REDACTED]', after: '[REDACTED]' },
    })
    expect(event.metadata).toEqual({
      accessToken: '[REDACTED]',
      nested: { privateKey: '[REDACTED]', fileContent: '[REDACTED]', safe: 'visible' },
      photoBase64: '[REDACTED]',
    })
  })

  it('normalizes valid records newest-first and ignores malformed records', () => {
    expect(normalizeAdminAuditEvents({
      older: { occurredAt: 10, actorUid: 'admin-1', action: 'older' },
      malformed: { occurredAt: 20, action: 'missing actor' },
      newer: { occurredAt: 30, actorUid: 'admin-2', action: 'newer', status: 'failed' },
    }).map(event => ({ id: event.id, status: event.status }))).toEqual([
      { id: 'newer', status: 'failed' },
      { id: 'older', status: 'succeeded' },
    ])
  })
})
