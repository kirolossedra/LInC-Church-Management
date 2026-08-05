import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { PeopleDevelopmentMeetingOccurrence } from '../pastor/people-development';
import { getGroupLabel } from './congregationGroupNotes.config';
import type {
  GroupAssignment,
  GroupAssignmentAttachment,
  MemberProfile,
  PeopleDevelopmentGroupId,
} from './congregationGroupNotes.types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

export function getMeetingOccurrenceTimestamp(
  occurrence: PeopleDevelopmentMeetingOccurrence,
): number {
  const [hours = 0, minutes = 0] = occurrence.startTime
    .split(':')
    .map(value => Number(value));
  const occurrenceDate = new Date(occurrence.dateValue);

  occurrenceDate.setHours(hours, minutes, 0, 0);
  return occurrenceDate.getTime();
}

export function formatMeetingOccurrenceDate(
  dateValue: Date,
  locale: 'en' | 'ar',
): string {
  return format(
    dateValue,
    locale === 'ar'
      ? 'EEEE، d MMMM yyyy'
      : 'EEEE, MMMM d, yyyy',
    {
      locale: locale === 'ar' ? ar : enUS,
    },
  );
}

export function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function unwrapStoredValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value !== 'object' || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;

  for (const key of ['value', 'answer', 'currentValue', 'userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId', 'group']) {
    const nested = record[key];
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim();
  }

  return '';
}

export function extractResponseValue(value: unknown, candidateKeys: string[]): string {
  const wantedKeys = new Set(candidateKeys.map(normalizeLookupKey));

  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) return '';

    if (typeof current === 'string' || typeof current === 'number') {
      return wantedKeys.has(normalizeLookupKey(currentKey)) ? String(current).trim() : '';
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, currentKey);
        if (found) return found;
      }
      return '';
    }

    if (typeof current !== 'object') return '';

    const record = current as Record<string, unknown>;

    for (const [key, nested] of Object.entries(record)) {
      if (wantedKeys.has(normalizeLookupKey(key))) {
        const directValue = unwrapStoredValue(nested);
        if (directValue) return directValue;

        const nestedValue = visit(nested, key);
        if (nestedValue) return nestedValue;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      const found = visit(nested, key);
      if (found) return found;
    }

    return '';
  };

  return visit(value);
}

export function safeFirebaseKey(value: string): string {
  const safeValue = String(value || '')
    .trim()
    .replace(/[.#$/[\]]/g, '_')
    .replace(/\s+/g, '_');

  return safeValue || `unknown_${Date.now()}`;
}

export function normalizeIdentifier(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePeopleDevelopmentGroup(value: unknown): PeopleDevelopmentGroupId | '' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'pastor' || normalized === 'pastors' || normalized === 'pastoral') return 'pastors';
  if (normalized === 'prophet' || normalized === 'prophets' || normalized === 'prophetic') return 'prophets';
  if (normalized === 'evangelist' || normalized === 'evangelists' || normalized === 'evangelistic') return 'evangelists';
  if (normalized === 'teacher' || normalized === 'teachers' || normalized === 'teaching') return 'teachers';
  if (normalized === 'apostle' || normalized === 'apostles' || normalized === 'apostolic') return 'apostles';
  if (normalized === 'helper' || normalized === 'helpers') return 'helpers';
  if (normalized === 'mercy' || normalized === 'mercies' || normalized === 'merciful') return 'mercy';
  if (normalized === 'facilitator' || normalized === 'facilitators' || normalized === 'facilitation') return 'facilitators';
  if (normalized === 'service' || normalized === 'services' || normalized === 'serving') return 'services';
  if (normalized === 'giving' || normalized === 'giver' || normalized === 'givers') return 'giving';

  return '';
}

export function extractPeopleDevelopmentGroup(raw: unknown): PeopleDevelopmentGroupId | '' {
  const record = asRecord(raw);
  const peopleDevelopment = asRecord(record.peopleDevelopment);
  const fields = asRecord(record.fields);
  const peopleDevelopmentField = asRecord(fields.peopleDevelopment);
  const groupField = asRecord(peopleDevelopmentField.group);

  return normalizePeopleDevelopmentGroup(
    record.peopleDevelopmentGroup ||
    peopleDevelopment.group ||
    groupField.value ||
    groupField.answer ||
    peopleDevelopmentField.group ||
    '',
  );
}


export function normalizeAssignmentGroups(
  value: unknown,
  fallbackGroup: PeopleDevelopmentGroupId | '',
): PeopleDevelopmentGroupId[] {
  const rawGroups = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value as Record<string, unknown>)
      : [];

  const normalizedGroups = rawGroups
    .map(group => normalizePeopleDevelopmentGroup(group))
    .filter((group): group is PeopleDevelopmentGroupId => Boolean(group));

  if (fallbackGroup) {
    normalizedGroups.unshift(fallbackGroup);
  }

  return Array.from(new Set(normalizedGroups));
}

export function getAssignmentDisplayGroupLabel(
  assignment: GroupAssignment,
  currentGroupLabel: string,
): string {
  return assignment.groups.length > 1
    ? currentGroupLabel
    : assignment.groupLabel || currentGroupLabel;
}

export function formatDateLabel(dateValue: string, fallbackTimestamp: number, displayLocale: 'en' | 'ar'): string {
  const dateLocale = displayLocale === 'ar' ? ar : enUS;

  try {
    const source = dateValue || (fallbackTimestamp ? new Date(fallbackTimestamp).toISOString() : '');
    if (!source) return '';

    const date = source.includes('T') ? new Date(source) : new Date(`${source}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;

    return format(date, 'EEEE, MMMM d, yyyy', { locale: dateLocale });
  } catch {
    return dateValue;
  }
}

export function normalizeAssignmentAttachments(value: unknown): GroupAssignmentAttachment[] {
  const rawAttachments = asRecord(value).attachments;
  if (!rawAttachments) return [];

  const attachmentList = Array.isArray(rawAttachments)
    ? rawAttachments
    : Object.values(rawAttachments as Record<string, unknown>);

  return attachmentList
    .map(attachment => {
      const record = asRecord(attachment);
      return {
        name: String(record.name || record.fileName || 'PDF attachment').trim(),
        type: String(record.type || record.mimeType || 'application/pdf').trim(),
        size: normalizeNumber(record.size || record.sizeBytes),
        encoding: String(record.encoding || 'base64').trim(),
        storage: String(record.storage || 'realtimeDatabase').trim(),
        base64: String(record.base64 || record.data || record.content || '').trim(),
        uploadedAt: normalizeNumber(record.uploadedAt),
        uploadedAtISO: String(record.uploadedAtISO || '').trim(),
      };
    })
    .filter(attachment => attachment.base64 && attachment.encoding.toLowerCase() === 'base64');
}

export function formatAttachmentSize(size: number): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function cleanBase64Payload(value: string): string {
  const trimmed = String(value || '').trim();
  const commaIndex = trimmed.indexOf(',');
  const payload = commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
  return payload.replace(/\s/g, '');
}

export function createDecodedAttachmentUrl(attachment: GroupAssignmentAttachment): string {
  if (typeof window === 'undefined') {
    throw new Error('Browser APIs are required to open this attachment.');
  }

  const payload = cleanBase64Payload(attachment.base64);
  if (!payload) {
    throw new Error('Attachment data is missing.');
  }

  const binaryString = window.atob(payload);
  const arrayBuffer = new ArrayBuffer(binaryString.length);
  const bytes = new Uint8Array(arrayBuffer);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  const blob = new Blob([arrayBuffer], { type: attachment.type || 'application/pdf' });
  return window.URL.createObjectURL(blob);
}

export function buildProfileFromMemberRecord(memberKey: string, value: unknown, fallbackIdentifier: string, displayLocale: 'en' | 'ar'): MemberProfile {
  const record = asRecord(value);
  const group = normalizePeopleDevelopmentGroup(record.group);

  return {
    memberKey,
    identifier: String(record.identifier || fallbackIdentifier || '').trim(),
    fullName: String(record.fullName || record.name || '').trim(),
    email: String(record.email || '').trim(),
    primaryGift: String(record.primaryGift || '').trim(),
    group,
    groupLabel: String(record.groupLabel || getGroupLabel(group, displayLocale) || '').trim(),
    sourcePath: String(record.sourcePath || 'peopleDevelopment/members'),
    sourceKeys: Array.isArray(record.sourceKeys) ? record.sourceKeys.map(item => String(item)) : [],
  };
}

export function buildProfileFromFormRecord(formId: string, raw: unknown, userIdentifier: string, memberKey: string, displayLocale: 'en' | 'ar'): MemberProfile {
  const record = asRecord(raw);
  const results = asRecord(record.results);
  const fullName = extractResponseValue(raw, ['fullName', 'full_name', 'name', 'firstName', 'lastName']);
  const email = extractResponseValue(raw, ['email', 'emailAddress', 'userEmail']);
  const group = extractPeopleDevelopmentGroup(raw);
  const lang = record.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
  const localizedResults = asRecord(results[lang]);
  const primaryGift = String(localizedResults.primaryGift || '');

  return {
    memberKey,
    identifier: userIdentifier,
    fullName: fullName || '',
    email: email || '',
    primaryGift,
    group,
    groupLabel: getGroupLabel(group, displayLocale),
    sourcePath: 'form',
    sourceKeys: [formId],
  };
}

export function normalizeAssignment(id: string, value: unknown, displayLocale: 'en' | 'ar'): GroupAssignment | null {
  const record = asRecord(value);
  const fallbackGroup = normalizePeopleDevelopmentGroup(record.group);
  const groups = normalizeAssignmentGroups(record.groups, fallbackGroup);
  const group = groups[0] || '';
  const text = String(record.text || '').trim();
  const attachments = normalizeAssignmentAttachments(value);

  if (!group || (!text && attachments.length === 0)) return null;

  return {
    id,
    group,
    groups,
    groupLabel: String(record.groupLabel || getGroupLabel(group, displayLocale) || '').trim(),
    text,
    date: String(record.date || '').trim(),
    createdAt: normalizeNumber(record.createdAt),
    createdAtISO: String(record.createdAtISO || '').trim(),
    source: String(record.source || '').trim(),
    attachments,
  };
}

