import { zonedDateTimeToEpoch, CALENDAR_TIME_ZONE } from './calendar.time'

export type CalendarIcsEvent = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  description?: string
  location?: string
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
}

export function buildCalendarIcs(events: CalendarIcsEvent[]) {
  const body = events.flatMap(event => {
    const startsAt = zonedDateTimeToEpoch(event.date, event.startTime, CALENDAR_TIME_ZONE)
    const endsAt = zonedDateTimeToEpoch(event.date, event.endTime, CALENDAR_TIME_ZONE)
    return [
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.id)}@lincministry.com`,
      `DTSTAMP:${formatUtc(Date.now())}`,
      `DTSTART:${formatUtc(startsAt)}`,
      `DTEND:${formatUtc(endsAt)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.description ?? '')}`,
      `LOCATION:${escapeIcs(event.location ?? '')}`,
      `STATUS:${event.status ?? 'CONFIRMED'}`,
      'END:VEVENT',
    ]
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LinC One//Unified Pastor Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LinC One Pastor Calendar',
    `X-WR-TIMEZONE:${CALENDAR_TIME_ZONE}`,
    ...body,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

function formatUtc(timestamp: number) {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}
