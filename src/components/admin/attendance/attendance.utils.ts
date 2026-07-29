import type {
  AttendancePerson,
  AttendancePersonForm,
  CalendarDay,
} from './attendance.types';

export function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizePersonPhotoSource(value: unknown): string {
  if (typeof value !== 'string') return '';

  const source = value.trim();
  if (!source) return '';

  if (
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(source) ||
    /^(https?:|blob:|\/)/i.test(source)
  ) {
    return source;
  }

  const compactBase64 = source.replace(/\s/g, '');

  if (
    compactBase64.length >= 32 &&
    /^[a-z0-9+/]+={0,2}$/i.test(compactBase64)
  ) {
    return `data:image/jpeg;base64,${compactBase64}`;
  }

  return '';
}

export function normalizePerson(
  firebaseId: string,
  value: unknown
): AttendancePerson {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    firebaseId,
    firstName: String(record.firstName || '').trim(),
    lastName: String(record.lastName || '').trim(),
    arabicFirstName: String(record.arabicFirstName || '').trim(),
    arabicLastName: String(record.arabicLastName || '').trim(),
    phoneNumber: String(record.phoneNumber || '').trim(),
    email: String(record.email || '').trim(),
    photoBase64: normalizePersonPhotoSource(
      record.photoBase64 ?? record.photoDataUrl ?? record.photoUrl ?? record.photo
    ),
    daysOfAttendance: String(record.daysOfAttendance || '').trim(),
    createdAt: normalizeNumber(record.createdAt),
    updatedAt: normalizeNumber(record.updatedAt),
  };
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getAttendanceDays(daysOfAttendance: string): string[] {
  return daysOfAttendance
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean);
}

export function buildDaysOfAttendance(
  existingDays: string,
  selectedDateKey: string
): string {
  const attendanceDays = getAttendanceDays(existingDays);

  if (attendanceDays.includes(selectedDateKey)) {
    return attendanceDays.join(', ');
  }

  return [...attendanceDays, selectedDateKey].sort().join(', ');
}

export function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      key: formatDateKey(date),
      dayNumber: date.getDate(),
      date,
      isCurrentMonth: date.getMonth() === month,
      isSunday: date.getDay() === 0,
    };
  });
}

export function getFirstSundayInMay(year: number): Date {
  const mayFirst = new Date(year, 4, 1);
  const firstSunday = new Date(mayFirst);
  const daysUntilSunday = (7 - mayFirst.getDay()) % 7;

  firstSunday.setDate(mayFirst.getDate() + daysUntilSunday);

  return firstSunday;
}

export function buildSundayDateKeysFromStart(
  startDate: Date,
  endDate: Date
): string[] {
  const sundayDateKeys: string[] = [];
  const cursor = new Date(startDate);

  cursor.setHours(0, 0, 0, 0);

  const cleanEndDate = new Date(endDate);
  cleanEndDate.setHours(0, 0, 0, 0);

  while (cursor <= cleanEndDate) {
    sundayDateKeys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return sundayDateKeys;
}

export function parseDateKeyToTime(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00`).getTime();
}

export const EMPTY_PERSON_FORM: AttendancePersonForm = {
  firstName: '',
  lastName: '',
  arabicFirstName: '',
  arabicLastName: '',
  phoneNumber: '',
  email: '',
  photoBase64: '',
};
