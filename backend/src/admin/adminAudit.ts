import type { AdminAccount } from './adminAuthorization'
import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'
import type { AuthenticatedFirebaseUser } from '../types/app'

export const ADMIN_AUDIT_PATH = ['administration', 'auditLog'] as const

export type AdminAuditEvent = {
  id: string
  occurredAt: number
  actorUid: string
  actorEmail: string
  actorRole: 'chief' | 'administrator'
  action: string
  targetType: string
  targetId: string
  targetLabel: string
  summary: string
  status: 'succeeded' | 'failed'
  changes: Record<string, { before: unknown; after: unknown }>
  metadata: Record<string, unknown>
}

export async function writeAdminAudit({
  database,
  id,
  occurredAt,
  actor,
  account,
  action,
  targetType,
  targetId,
  targetLabel = '',
  summary,
  status = 'succeeded',
  changes = {},
  metadata = {},
}: {
  database: FirebaseRealtimeDatabaseClient
  id: string
  occurredAt: number
  actor: AuthenticatedFirebaseUser
  account: AdminAccount
  action: string
  targetType: string
  targetId: string
  targetLabel?: string
  summary: string
  status?: 'succeeded' | 'failed'
  changes?: Record<string, { before: unknown; after: unknown }>
  metadata?: Record<string, unknown>
}) {
  const event: AdminAuditEvent = {
    id,
    occurredAt,
    actorUid: actor.uid,
    actorEmail: actor.email?.trim().toLowerCase() || account.email,
    actorRole: account.role,
    action: cleanText(action, 100),
    targetType: cleanText(targetType, 80),
    targetId: cleanText(targetId, 160),
    targetLabel: cleanText(targetLabel, 200),
    summary: cleanText(summary, 500),
    status,
    changes: sanitizeChanges(changes),
    metadata: sanitizeRecord(metadata),
  }
  await database.patch([...ADMIN_AUDIT_PATH, id], event)
  return event
}

export function normalizeAdminAuditEvents(value: unknown): AdminAuditEvent[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .map(([id, raw]) => normalizeEvent(id, raw))
    .filter((event): event is AdminAuditEvent => event !== null)
    .sort((a, b) => b.occurredAt - a.occurredAt)
}

function normalizeEvent(id: string, raw: unknown): AdminAuditEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const occurredAt = typeof record.occurredAt === 'number' && Number.isFinite(record.occurredAt)
    ? record.occurredAt
    : 0
  const actorUid = stringValue(record.actorUid)
  if (!occurredAt || !actorUid) return null
  return {
    id,
    occurredAt,
    actorUid,
    actorEmail: stringValue(record.actorEmail),
    actorRole: record.actorRole === 'chief' ? 'chief' : 'administrator',
    action: stringValue(record.action),
    targetType: stringValue(record.targetType),
    targetId: stringValue(record.targetId),
    targetLabel: stringValue(record.targetLabel),
    summary: stringValue(record.summary),
    status: record.status === 'failed' ? 'failed' : 'succeeded',
    changes: objectValue(record.changes) as AdminAuditEvent['changes'],
    metadata: objectValue(record.metadata),
  }
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(key, item)]))
}

function sanitizeChanges(value: Record<string, { before: unknown; after: unknown }>): AdminAuditEvent['changes'] {
  return Object.fromEntries(Object.entries(value).map(([field, change]) => {
    if (isSensitiveKey(field)) {
      return [field, { before: '[REDACTED]', after: '[REDACTED]' }]
    }
    return [field, {
      before: sanitizeValue(field, change.before),
      after: sanitizeValue(field, change.after),
    }]
  }))
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return '[REDACTED]'
  }
  if (typeof value === 'string') return cleanText(value, 500)
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitizeValue(key, item))
  if (value && typeof value === 'object') return sanitizeRecord(value as Record<string, unknown>)
  return null
}

function isSensitiveKey(key: string) {
  return /password|passcode|token|secret|private.?key|authorization|photo.?base64|data.?url|file.?content/i.test(key)
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
function stringValue(value: unknown) { return typeof value === 'string' ? value : '' }
function objectValue(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
