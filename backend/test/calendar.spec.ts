import { describe, expect, it } from 'vitest'

import {
  hasCalendarConflict,
  normalizeRecurringGroupMeetings,
} from '../src/booking/booking.service'
import { buildCalendarIcs } from '../src/calendar/calendar.ics'
import { calendarTemporalFields } from '../src/calendar/calendar.time'

describe('Unified calendar rules', () => {
  it('stores Toronto wall times with the correct daylight-saving offset', () => {
    expect(calendarTemporalFields('2026-01-15', '10:00', '11:00').startsAtISO)
      .toBe('2026-01-15T15:00:00.000Z')
    expect(calendarTemporalFields('2026-07-15', '10:00', '11:00').startsAtISO)
      .toBe('2026-07-15T14:00:00.000Z')
  })

  it('expands recurring People Development meetings and blocks overlapping bookings', () => {
    const schedules = {
      groupOne: {
        active: true,
        ordinal: 2,
        weekday: 2,
        startTime: '18:00',
        durationMinutes: 90,
        startDate: '2026-01-01',
        endDate: '',
      },
    }

    expect(normalizeRecurringGroupMeetings(schedules, '2026-08-01', '2026-08-31'))
      .toEqual([{ date: '2026-08-11', startTime: '18:00', endTime: '19:30' }])
    expect(hasCalendarConflict({
      date: '2026-08-11',
      startTime: '18:30',
      endTime: '19:00',
      meetings: null,
      meetingRequests: null,
      peopleDevelopmentSchedules: schedules,
    })).toBe(true)
  })

  it('builds an importable calendar using UTC timestamps', () => {
    const calendar = buildCalendarIcs([{
      id: 'meeting-1',
      title: 'Pastor meeting',
      date: '2026-08-11',
      startTime: '10:00',
      endTime: '11:00',
      status: 'CONFIRMED',
    }])

    expect(calendar).toContain('BEGIN:VCALENDAR')
    expect(calendar).toContain('DTSTART:20260811T140000Z')
    expect(calendar).toContain('DTEND:20260811T150000Z')
    expect(calendar).toContain('SUMMARY:Pastor meeting')
  })
})
