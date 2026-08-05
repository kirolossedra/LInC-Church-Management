import { describe, expect, it } from 'vitest';
import {
  formatDateLabel,
  formatDateTimeLabel,
  getErrorMessage,
  todayDateString,
} from './peopleNotes.utils';

describe('people notes utilities', () => {
  it('creates a valid ISO date default', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('extracts readable error messages', () => {
    expect(getErrorMessage(new Error('Request failed'))).toBe('Request failed');
    expect(getErrorMessage('Unavailable')).toBe('Unavailable');
  });

  it('formats stored dates for display', () => {
    expect(formatDateLabel('2026-08-04', false)).toContain('2026');
    expect(formatDateTimeLabel(Date.UTC(2026, 7, 4, 12), false)).toContain('2026');
  });

  it('uses readable localized fallbacks for missing dates', () => {
    expect(formatDateLabel('', false)).toBe('Not set');
    expect(formatDateLabel('', true)).toBe('غير محدد');
    expect(formatDateTimeLabel(0, true)).toBe('غير محدد');
  });
});
