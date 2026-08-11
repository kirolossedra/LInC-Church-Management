export const CALENDAR_TIME_ZONE = 'America/Toronto' as const

export function calendarTemporalFields(date: string, startTime: string, endTime: string) {
  const startsAt = zonedDateTimeToEpoch(date, startTime, CALENDAR_TIME_ZONE)
  const endsAt = zonedDateTimeToEpoch(date, endTime, CALENDAR_TIME_ZONE)
  return {
    timeZone: CALENDAR_TIME_ZONE,
    startsAt,
    endsAt,
    startsAtISO: new Date(startsAt).toISOString(),
    endsAtISO: new Date(endsAt).toISOString(),
  }
}

export function zonedDateTimeToEpoch(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  let timestamp = utcGuess - timeZoneOffsetMilliseconds(new Date(utcGuess), timeZone)
  timestamp = utcGuess - timeZoneOffsetMilliseconds(new Date(timestamp), timeZone)
  return timestamp
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )
  return representedAsUtc - date.getTime()
}

export function calendarReservationKey(date: string, startTime: string, endTime: string) {
  return `${date}_${startTime.replace(':', '')}_${endTime.replace(':', '')}`
}
