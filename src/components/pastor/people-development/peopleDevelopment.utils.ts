import {
  PEOPLE_DEVELOPMENT_GROUPS,
  PEOPLE_DEVELOPMENT_MEETING_ORDINALS,
  PEOPLE_DEVELOPMENT_MEETING_WEEKDAYS,
} from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentGroupId,
  PeopleDevelopmentMeetingAudience,
  PeopleDevelopmentMeetingOccurrence,
  PeopleDevelopmentMeetingOrdinal,
  PeopleDevelopmentMeetingSchedule,
  PeopleDevelopmentMeetingWeekday,
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

export function normalizePeopleDevelopmentGroups(
  value: unknown,
  fallbackGroup: unknown = '',
): PeopleDevelopmentGroupId[] {
  const rawGroups = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value as Record<string, unknown>)
      : [];

  const normalizedGroups = rawGroups
    .map(normalizePeopleDevelopmentGroup)
    .filter(
      (
        groupId,
      ): groupId is PeopleDevelopmentGroupId =>
        Boolean(groupId),
    );

  const normalizedFallback =
    normalizePeopleDevelopmentGroup(
      fallbackGroup,
    );

  if (normalizedFallback) {
    normalizedGroups.unshift(
      normalizedFallback,
    );
  }

  return Array.from(
    new Set(normalizedGroups),
  );
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

export function normalizePeopleDevelopmentMeetingAudience(
  value: unknown,
): PeopleDevelopmentMeetingAudience {
  return String(value || '')
    .trim()
    .toLowerCase() === 'shared'
    ? 'shared'
    : 'group';
}

export function normalizePeopleDevelopmentMeetingOrdinal(
  value: unknown,
): PeopleDevelopmentMeetingOrdinal {
  if (String(value || '').trim().toLowerCase() === 'last') {
    return 'last';
  }

  const numberValue = Number(value);

  if (
    numberValue === 1 ||
    numberValue === 2 ||
    numberValue === 3 ||
    numberValue === 4
  ) {
    return numberValue;
  }

  return 1;
}

export function normalizePeopleDevelopmentMeetingWeekday(
  value: unknown,
): PeopleDevelopmentMeetingWeekday {
  const numberValue = Number(value);

  if (
    Number.isInteger(numberValue) &&
    numberValue >= 0 &&
    numberValue <= 6
  ) {
    return numberValue as PeopleDevelopmentMeetingWeekday;
  }

  return 6;
}

export function normalizePeopleDevelopmentMeetingTime(
  value: unknown,
): string {
  const normalized = String(value || '').trim();

  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return normalized;
  }

  return '18:00';
}

export function normalizePeopleDevelopmentDateKey(
  value: unknown,
): string {
  const normalized = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return '';
  }

  const date = new Date(`${normalized}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return normalized;
}

export function getPeopleDevelopmentLocalDateKey(
  date: Date,
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getPeopleDevelopmentMeetingScheduleTitle(
  schedule: Pick<
    PeopleDevelopmentMeetingSchedule,
    'audience' | 'group'
  >,
  locale: 'en' | 'ar',
): string {
  if (schedule.audience === 'shared') {
    return locale === 'ar'
      ? 'اجتماع مشترك — جميع المجموعات'
      : 'Shared Meeting — All Groups';
  }

  const groupLabel = schedule.group
    ? getPeopleDevelopmentStaticGroupLabel(
        schedule.group,
        locale,
      )
    : locale === 'ar'
      ? 'المجموعة'
      : 'Group';

  return locale === 'ar'
    ? `اجتماع المجموعة — ${groupLabel}`
    : `Group Meeting — ${groupLabel}`;
}

export function getPeopleDevelopmentMeetingRecurrenceLabel(
  schedule: Pick<
    PeopleDevelopmentMeetingSchedule,
    'ordinal' | 'weekday'
  >,
  locale: 'en' | 'ar',
): string {
  const ordinal = PEOPLE_DEVELOPMENT_MEETING_ORDINALS.find(
    item => item.value === schedule.ordinal,
  );

  const weekday = PEOPLE_DEVELOPMENT_MEETING_WEEKDAYS.find(
    item => item.value === schedule.weekday,
  );

  const ordinalLabel = locale === 'ar'
    ? ordinal?.labelAr
    : ordinal?.labelEn;

  const weekdayLabel = locale === 'ar'
    ? weekday?.labelAr
    : weekday?.labelEn;

  if (locale === 'ar') {
    return `${weekdayLabel || ''} ${ordinalLabel || ''} من كل شهر`.trim();
  }

  return `${ordinalLabel || ''} ${weekdayLabel || ''} of every month`.trim();
}

export function formatPeopleDevelopmentMeetingTime(
  value: string,
  locale: 'en' | 'ar',
): string {
  const normalized = normalizePeopleDevelopmentMeetingTime(value);
  const [hoursText, minutes] = normalized.split(':');
  const hours = Number(hoursText);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const formatted = `${displayHours}:${minutes} ${period}`;

  if (locale === 'ar') {
    return formatted
      .replace('AM', 'ص')
      .replace('PM', 'م');
  }

  return formatted;
}

export function getMonthlyOrdinalWeekdayDate(
  year: number,
  monthIndex: number,
  weekday: PeopleDevelopmentMeetingWeekday,
  ordinal: PeopleDevelopmentMeetingOrdinal,
): Date | null {
  if (ordinal === 'last') {
    const lastDay = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);
    const difference =
      (lastDay.getDay() - weekday + 7) % 7;

    lastDay.setDate(lastDay.getDate() - difference);
    return lastDay;
  }

  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const difference =
    (weekday - firstDay.getDay() + 7) % 7;
  const dayOfMonth =
    1 + difference + (ordinal - 1) * 7;
  const result = new Date(
    year,
    monthIndex,
    dayOfMonth,
    12,
    0,
    0,
    0,
  );

  return result.getMonth() === monthIndex
    ? result
    : null;
}

export function isPeopleDevelopmentMeetingOccurrenceInRange(
  schedule: Pick<
    PeopleDevelopmentMeetingSchedule,
    'startDate' | 'endDate'
  >,
  occurrenceDate: Date,
): boolean {
  const occurrenceKey =
    getPeopleDevelopmentLocalDateKey(occurrenceDate);

  const startDate =
    normalizePeopleDevelopmentDateKey(schedule.startDate);

  const endDate =
    normalizePeopleDevelopmentDateKey(schedule.endDate);

  if (startDate && occurrenceKey < startDate) {
    return false;
  }

  if (endDate && occurrenceKey > endDate) {
    return false;
  }

  return true;
}

export function getPeopleDevelopmentMeetingOccurrencesForMonth(
  schedules: PeopleDevelopmentMeetingSchedule[],
  monthDate: Date,
  locale: 'en' | 'ar',
): PeopleDevelopmentMeetingOccurrence[] {
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();

  return schedules
    .filter(schedule => schedule.active)
    .map(schedule => {
      const dateValue = getMonthlyOrdinalWeekdayDate(
        year,
        monthIndex,
        schedule.weekday,
        schedule.ordinal,
      );

      if (
        !dateValue ||
        !isPeopleDevelopmentMeetingOccurrenceInRange(
          schedule,
          dateValue,
        )
      ) {
        return null;
      }

      return {
        scheduleId: schedule.id,
        date: getPeopleDevelopmentLocalDateKey(dateValue),
        dateValue,
        startTime: schedule.startTime,
        audience: schedule.audience,
        group: schedule.group,
        title: getPeopleDevelopmentMeetingScheduleTitle(
          schedule,
          locale,
        ),
      } satisfies PeopleDevelopmentMeetingOccurrence;
    })
    .filter(
      (
        occurrence,
      ): occurrence is PeopleDevelopmentMeetingOccurrence =>
        Boolean(occurrence),
    )
    .sort((first, second) => {
      const dateDifference =
        first.dateValue.getTime() -
        second.dateValue.getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return first.startTime.localeCompare(second.startTime);
    });
}

export function getNextPeopleDevelopmentMeetingOccurrence(
  schedule: PeopleDevelopmentMeetingSchedule,
  fromDate: Date,
  locale: 'en' | 'ar',
): PeopleDevelopmentMeetingOccurrence | null {
  const monthCursor = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    1,
    12,
    0,
    0,
    0,
  );

  const fromTimestamp = fromDate.getTime();

  for (let offset = 0; offset < 24; offset += 1) {
    const candidateMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + offset,
      1,
      12,
      0,
      0,
      0,
    );

    const occurrence =
      getPeopleDevelopmentMeetingOccurrencesForMonth(
        [schedule],
        candidateMonth,
        locale,
      )[0];

    if (occurrence) {
      const [hours = 0, minutes = 0] = occurrence.startTime
        .split(':')
        .map(value => Number(value));
      const occurrenceDateTime = new Date(occurrence.dateValue);

      occurrenceDateTime.setHours(hours, minutes, 0, 0);

      if (occurrenceDateTime.getTime() >= fromTimestamp) {
        return occurrence;
      }
    }
  }

  return null;
}
