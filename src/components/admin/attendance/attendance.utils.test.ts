import { describe, expect, it } from 'vitest';
import {
  buildCalendarDays,
  buildDaysOfAttendance,
  buildSundayDateKeysFromStart,
  formatDateKey,
  getAttendanceDays,
  getFirstSundayInMay,
  normalizePerson,
} from './attendance.utils';

describe('attendance utilities', () => {
  it('normalizes person records and legacy raw Base64 photos', () => {
    const person = normalizePerson('person-1', {
      firstName: '  Ada ',
      lastName: ' Lovelace ',
      photo: 'a'.repeat(32),
      createdAt: '10',
    });
    expect(person).toMatchObject({
      firebaseId: 'person-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      photoBase64: `data:image/jpeg;base64,${'a'.repeat(32)}`,
      createdAt: 10,
    });
  });

  it('adds attendance dates once and keeps them sorted', () => {
    expect(buildDaysOfAttendance('2026-05-10, 2026-05-24', '2026-05-17'))
      .toBe('2026-05-10, 2026-05-17, 2026-05-24');
    expect(buildDaysOfAttendance('2026-05-10', '2026-05-10')).toBe('2026-05-10');
  });

  it('parses stored attendance strings without blank entries', () => {
    expect(getAttendanceDays('2026-05-10, , 2026-05-17')).toEqual(['2026-05-10', '2026-05-17']);
  });

  it('builds a six-week calendar and marks Sundays', () => {
    const days = buildCalendarDays(new Date(2026, 7, 1));
    expect(days).toHaveLength(42);
    expect(days.filter(day => day.isSunday)).toHaveLength(6);
  });

  it('finds the first Sunday in May and builds inclusive Sunday ranges', () => {
    const firstSunday = getFirstSundayInMay(2026);
    expect(formatDateKey(firstSunday)).toBe('2026-05-03');
    expect(buildSundayDateKeysFromStart(firstSunday, new Date(2026, 4, 17)))
      .toEqual(['2026-05-03', '2026-05-10', '2026-05-17']);
  });
});
