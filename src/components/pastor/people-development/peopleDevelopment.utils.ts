import { PEOPLE_DEVELOPMENT_GROUPS } from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentGroupId,
  PeoplePersonalNoteType,
} from './peopleDevelopment.types';

export function normalizePeopleDevelopmentGroup(
  value: unknown,
): PeopleDevelopmentGroupId | '' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (
    normalized === 'pastor' ||
    normalized === 'pastors' ||
    normalized === 'pastoral'
  ) {
    return 'pastors';
  }

  if (
    normalized === 'prophet' ||
    normalized === 'prophets' ||
    normalized === 'prophetic'
  ) {
    return 'prophets';
  }

  if (
    normalized === 'evangelist' ||
    normalized === 'evangelists' ||
    normalized === 'evangelistic'
  ) {
    return 'evangelists';
  }

  if (
    normalized === 'teacher' ||
    normalized === 'teachers' ||
    normalized === 'teaching'
  ) {
    return 'teachers';
  }

  if (
    normalized === 'apostle' ||
    normalized === 'apostles' ||
    normalized === 'apostolic'
  ) {
    return 'apostles';
  }

  if (normalized === 'helper' || normalized === 'helpers') {
    return 'helpers';
  }

  if (
    normalized === 'mercy' ||
    normalized === 'mercies' ||
    normalized === 'merciful'
  ) {
    return 'mercy';
  }

  if (
    normalized === 'facilitator' ||
    normalized === 'facilitators' ||
    normalized === 'facilitation'
  ) {
    return 'facilitators';
  }

  if (
    normalized === 'service' ||
    normalized === 'services' ||
    normalized === 'serving'
  ) {
    return 'services';
  }

  if (
    normalized === 'giving' ||
    normalized === 'giver' ||
    normalized === 'givers'
  ) {
    return 'giving';
  }

  return '';
}

export function normalizePeoplePersonalNoteType(
  value: unknown,
): PeoplePersonalNoteType {
  const normalized = String(value || '').trim().toLowerCase();

  return normalized === 'weakness' ? 'weakness' : 'strength';
}

export function extractPeopleDevelopmentGroup(
  raw: Record<string, any>,
): PeopleDevelopmentGroupId | '' {
  return normalizePeopleDevelopmentGroup(
    raw.peopleDevelopmentGroup ||
      raw.peopleDevelopment?.group ||
      raw.fields?.peopleDevelopment?.group?.value ||
      raw.fields?.peopleDevelopment?.group?.answer ||
      '',
  );
}

export function getPeopleDevelopmentStaticGroupLabel(
  groupId: PeopleDevelopmentGroupId,
  targetLocale: 'en' | 'ar',
): string {
  const group = PEOPLE_DEVELOPMENT_GROUPS.find(
    item => item.id === groupId,
  );

  if (!group) {
    return groupId;
  }

  return targetLocale === 'ar' ? group.labelAr : group.labelEn;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result =
        typeof reader.result === 'string' ? reader.result : '';

      const [, base64 = ''] = result.split(',');

      if (!base64) {
        reject(new Error('Could not read the selected file.'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error('Could not read the selected file.'),
      );
    };

    reader.readAsDataURL(file);
  });
}

export function isUsableEmail(value: string): boolean {
  const trimmed = String(value || '').trim();

  return (
    trimmed.length > 3 &&
    trimmed !== 'N/A' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  );
}

export function truncateEmailText(
  value: string,
  maxLength = 700,
): string {
  const normalized = String(value || '').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}
