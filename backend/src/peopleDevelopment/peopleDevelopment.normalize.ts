import { peopleDevelopmentGroups, type groupSchema } from '../schemas/peopleDevelopment.schema'
import type { z } from 'zod'

export type GroupId = z.infer<typeof groupSchema>
type RecordValue = Record<string, unknown>

export function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : {}
}

function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function normalizeGroup(value: unknown): GroupId | '' {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  const aliases: Record<string, GroupId> = {
    pastor: 'pastors', pastors: 'pastors', pastoral: 'pastors',
    prophet: 'prophets', prophets: 'prophets', prophetic: 'prophets',
    evangelist: 'evangelists', evangelists: 'evangelists', evangelistic: 'evangelists',
    teacher: 'teachers', teachers: 'teachers', teaching: 'teachers',
    apostle: 'apostles', apostles: 'apostles', apostolic: 'apostles',
    helper: 'helpers', helpers: 'helpers', mercy: 'mercy', mercies: 'mercy', merciful: 'mercy',
    facilitator: 'facilitators', facilitators: 'facilitators', facilitation: 'facilitators',
    service: 'services', services: 'services', serving: 'services',
    giving: 'giving', giver: 'giving', givers: 'giving',
  }
  return aliases[normalized] || ''
}

function normalizeGroups(value: unknown, fallback: GroupId | ''): GroupId[] {
  const raw = Array.isArray(value) ? value : Object.values(asRecord(value))
  const groups = raw.map(normalizeGroup).filter((group): group is GroupId => Boolean(group))
  if (fallback) groups.unshift(fallback)
  return Array.from(new Set(groups))
}

function normalizeAttachments(value: unknown) {
  const raw = Array.isArray(value) ? value : Object.values(asRecord(value))
  return raw.map(item => {
    const attachment = asRecord(item)
    return {
      name: String(attachment.name || attachment.fileName || '').trim(),
      type: String(attachment.type || attachment.mimeType || 'application/pdf').trim(),
      size: numberValue(attachment.size || attachment.sizeBytes),
      encoding: 'base64' as const,
      storage: 'realtimeDatabase' as const,
      base64: String(attachment.base64 || attachment.data || '').trim(),
      uploadedAt: numberValue(attachment.uploadedAt),
      uploadedAtISO: String(attachment.uploadedAtISO || '').trim(),
    }
  }).filter(attachment => attachment.name && attachment.base64)
}

export function normalizeMembers(value: unknown) {
  return Object.fromEntries(Object.entries(asRecord(value)).map(([memberKey, raw]) => {
    const member = asRecord(raw)
    return [memberKey, {
      memberKey,
      identifier: String(member.identifier || '').trim(),
      fullName: String(member.fullName || member.name || '').trim(),
      email: String(member.email || '').trim(),
      group: normalizeGroup(member.group),
      sourcePath: String(member.sourcePath || 'form').trim(),
      sourceKeys: Array.isArray(member.sourceKeys) ? member.sourceKeys.map(String) : [],
      updatedAt: numberValue(member.updatedAt),
      updatedAtISO: String(member.updatedAtISO || '').trim(),
    }]
  }))
}

export function normalizeAssignments(value: unknown) {
  return Object.entries(asRecord(value)).map(([id, raw]) => {
    const entry = asRecord(raw)
    const group = normalizeGroup(entry.group)
    const groups = normalizeGroups(entry.groups, group)
    if (!groups.length) return null
    return {
      id, group: groups[0], groups,
      groupLabel: String(entry.groupLabel || '').trim(),
      text: String(entry.text || '').trim(),
      date: String(entry.date || '').trim(),
      createdAt: numberValue(entry.createdAt),
      createdAtISO: String(entry.createdAtISO || '').trim(),
      source: String(entry.source || '').trim(),
      attachments: normalizeAttachments(entry.attachments),
    }
  }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function normalizePersonalNotes(value: unknown) {
  return Object.entries(asRecord(value)).map(([id, raw]) => {
    const note = asRecord(raw)
    return {
      id,
      identifier: String(note.identifier || '').trim(),
      memberKey: String(note.memberKey || '').trim(),
      fullName: String(note.fullName || '').trim(),
      email: String(note.email || '').trim(),
      group: normalizeGroup(note.group),
      groupLabel: String(note.groupLabel || '').trim(),
      type: note.type === 'weakness' ? 'weakness' as const : 'strength' as const,
      text: String(note.text || '').trim(),
      date: String(note.date || '').trim(),
      createdAt: numberValue(note.createdAt),
      createdAtISO: String(note.createdAtISO || '').trim(),
      source: String(note.source || '').trim(),
    }
  }).filter(note => note.identifier && note.text).sort((a, b) => b.createdAt - a.createdAt)
}

export function normalizeSchedules(value: unknown) {
  return Object.entries(asRecord(value)).map(([id, raw]) => {
    const schedule = asRecord(raw)
    const audience = schedule.audience === 'shared' ? 'shared' as const : 'group' as const
    const group = audience === 'shared' ? '' : normalizeGroup(schedule.group)
    return {
      id, audience, group,
      ordinal: schedule.ordinal === 'last' ? 'last' as const : Math.min(4, Math.max(1, numberValue(schedule.ordinal))) as 1 | 2 | 3 | 4,
      weekday: Math.min(6, Math.max(0, numberValue(schedule.weekday))) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: String(schedule.startTime || '19:00').trim(),
      durationMinutes: Math.min(480, Math.max(30, numberValue(schedule.durationMinutes) || 90)),
      startDate: String(schedule.startDate || '').trim(),
      endDate: String(schedule.endDate || '').trim(),
      active: schedule.active !== false,
      createdAt: numberValue(schedule.createdAt),
      createdAtISO: String(schedule.createdAtISO || '').trim(),
      updatedAt: numberValue(schedule.updatedAt || schedule.createdAt),
      updatedAtISO: String(schedule.updatedAtISO || schedule.createdAtISO || '').trim(),
    }
  }).filter(schedule => schedule.audience === 'shared' || schedule.group)
}

export function safeFirebaseKey(value: string) {
  return value.trim().toLowerCase().replace(/[.#$/[\]]/g, '_').replace(/\s+/g, '_')
}

export function extractResponseValue(value: unknown, keys: string[]): string {
  const wanted = new Set(keys.map(key => key.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const visit = (current: unknown, currentKey = ''): string => {
    if (current == null) return ''
    if (typeof current === 'string' || typeof current === 'number') {
      return wanted.has(currentKey.toLowerCase().replace(/[^a-z0-9]/g, '')) ? String(current).trim() : ''
    }
    if (Array.isArray(current)) {
      for (const item of current) { const found = visit(item, currentKey); if (found) return found }
      return ''
    }
    const record = asRecord(current)
    for (const [key, nested] of Object.entries(record)) {
      if (wanted.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim()
        const nestedRecord = asRecord(nested)
        for (const field of ['value', 'answer', 'currentValue', 'identifier']) {
          if (typeof nestedRecord[field] === 'string' || typeof nestedRecord[field] === 'number') return String(nestedRecord[field]).trim()
        }
      }
    }
    for (const [key, nested] of Object.entries(record)) { const found = visit(nested, key); if (found) return found }
    return ''
  }
  return visit(value)
}

export function isGroupId(value: string): value is GroupId {
  return (peopleDevelopmentGroups as readonly string[]).includes(value)
}
