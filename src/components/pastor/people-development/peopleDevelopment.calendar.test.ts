import { describe, expect, it } from 'vitest';

import { getPeopleDevelopmentMeetingColorClass } from './peopleDevelopment.constants';
import type { PeopleDevelopmentMeetingSchedule } from './peopleDevelopment.types';
import {
  formatPeopleDevelopmentMeetingTime,
  getNextPeopleDevelopmentMeetingOccurrence,
} from './peopleDevelopment.utils';

describe('People Development calendar presentation', () => {
  it('uses the respective group palette and a distinct shared-meeting palette', () => {
    expect(getPeopleDevelopmentMeetingColorClass('pastors', 'group', 'solid')).toContain('bg-rose-700');
    expect(getPeopleDevelopmentMeetingColorClass('prophets', 'group', 'solid')).toContain('bg-purple-700');
    expect(getPeopleDevelopmentMeetingColorClass('helpers', 'group')).toContain('bg-emerald-50');
    expect(getPeopleDevelopmentMeetingColorClass('', 'shared')).toContain('bg-amber-50');
  });

  it('finds the next group meeting and presents its time in 12-hour format', () => {
    const schedule: PeopleDevelopmentMeetingSchedule = {
      id: 'schedule-1',
      audience: 'group',
      group: 'teachers',
      ordinal: 3,
      weekday: 2,
      startTime: '18:30',
      durationMinutes: 90,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      createdAt: 1,
      createdAtISO: '2026-01-01T00:00:00.000Z',
      updatedAt: 1,
      updatedAtISO: '2026-01-01T00:00:00.000Z',
    };

    const occurrence = getNextPeopleDevelopmentMeetingOccurrence(
      schedule,
      new Date(2026, 7, 17, 12, 0, 0),
      'en',
    );

    expect(occurrence?.date).toBe('2026-08-18');
    expect(formatPeopleDevelopmentMeetingTime(occurrence?.startTime || '', 'en')).toBe('6:30 PM');
    expect(formatPeopleDevelopmentMeetingTime(occurrence?.endTime || '', 'en')).toBe('8:00 PM');
  });
});
