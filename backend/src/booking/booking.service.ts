import { timeToMinutes } from '../schemas/booking.schema'

export type PublicScheduleBlock = {
  date: string
  startTime: string
  endTime: string
}

type RawFirebaseCollection = Record<string, unknown> | null

type NormalizedBlock = PublicScheduleBlock & {
  status?: string
}

export function buildPublicBookingSchedule({
  availability,
  unavailability,
  meetings,
  meetingRequests,
  peopleDevelopmentSchedules = null,
  reservations = null,
  start,
  end,
}: {
  availability: RawFirebaseCollection
  unavailability: RawFirebaseCollection
  meetings: RawFirebaseCollection
  meetingRequests: RawFirebaseCollection
  peopleDevelopmentSchedules?: RawFirebaseCollection
  reservations?: RawFirebaseCollection
  start: string
  end: string
}) {
  const available = normalizeBlocks(availability, '09:00', '20:00')
    .filter(block => isWithinRange(block.date, start, end))
    .map(withoutStatus)

  const busy = [
    ...normalizeBlocks(unavailability, '00:00', '23:59'),
    ...normalizeBlocks(meetings, '', ''),
    ...normalizeBlocks(meetingRequests, '', '').filter(
      block => block.status === 'pending',
    ),
    ...normalizeRecurringGroupMeetings(peopleDevelopmentSchedules, start, end),
    ...normalizeReservations(reservations),
  ]
    .filter(block => isWithinRange(block.date, start, end))
    .map(withoutStatus)

  return {
    availability: sortAndDedupe(available),
    busy: sortAndDedupe(busy),
  }
}

export function isBookingSlotAvailable({
  date,
  startTime,
  endTime,
  availability,
  unavailability,
  meetings,
  meetingRequests,
  peopleDevelopmentSchedules = null,
  reservations = null,
}: {
  date: string
  startTime: string
  endTime: string
  availability: RawFirebaseCollection
  unavailability: RawFirebaseCollection
  meetings: RawFirebaseCollection
  meetingRequests: RawFirebaseCollection
  peopleDevelopmentSchedules?: RawFirebaseCollection
  reservations?: RawFirebaseCollection
}): boolean {
  const requestedStart = timeToMinutes(startTime)
  const requestedEnd = timeToMinutes(endTime)

  const insideAvailability = normalizeBlocks(
    availability,
    '09:00',
    '20:00',
  ).some(block =>
    block.date === date &&
    requestedStart >= timeToMinutes(block.startTime) &&
    requestedEnd <= timeToMinutes(block.endTime),
  )

  if (!insideAvailability) return false

  const conflicts = [
    ...normalizeBlocks(unavailability, '00:00', '23:59'),
    ...normalizeBlocks(meetings, '', ''),
    ...normalizeBlocks(meetingRequests, '', '').filter(
      block => block.status === 'pending',
    ),
    ...normalizeRecurringGroupMeetings(peopleDevelopmentSchedules, date, date),
    ...normalizeReservations(reservations),
  ]

  return !conflicts.some(block =>
    block.date === date &&
    overlaps(
      requestedStart,
      requestedEnd,
      timeToMinutes(block.startTime),
      timeToMinutes(block.endTime),
    ),
  )
}

export function hasCalendarConflict({
  date,
  startTime,
  endTime,
  meetings,
  meetingRequests,
  unavailability = null,
  peopleDevelopmentSchedules = null,
  reservations = null,
  excludeMeetingId,
  excludeRequestId,
  excludeReservationKey,
  excludeUnavailabilityId,
}: {
  date: string
  startTime: string
  endTime: string
  meetings: RawFirebaseCollection
  meetingRequests: RawFirebaseCollection
  unavailability?: RawFirebaseCollection
  peopleDevelopmentSchedules?: RawFirebaseCollection
  reservations?: RawFirebaseCollection
  excludeMeetingId?: string
  excludeRequestId?: string
  excludeReservationKey?: string
  excludeUnavailabilityId?: string
}) {
  const requestedStart = timeToMinutes(startTime)
  const requestedEnd = timeToMinutes(endTime)
  const conflicts = [
    ...normalizeBlocks(omitKey(unavailability, excludeUnavailabilityId), '00:00', '23:59'),
    ...normalizeBlocks(omitKey(meetings, excludeMeetingId), '', ''),
    ...normalizeBlocks(omitKey(meetingRequests, excludeRequestId), '', '').filter(block => block.status === 'pending'),
    ...normalizeRecurringGroupMeetings(peopleDevelopmentSchedules, date, date),
    ...normalizeReservations(omitKey(reservations, excludeReservationKey)),
  ]
  return conflicts.some(block => block.date === date && overlaps(
    requestedStart,
    requestedEnd,
    timeToMinutes(block.startTime),
    timeToMinutes(block.endTime),
  ))
}

export function normalizeRecurringGroupMeetings(
  collection: RawFirebaseCollection,
  start: string,
  end: string,
): PublicScheduleBlock[] {
  if (!collection || typeof collection !== 'object') return []
  const schedules = Object.values(collection).filter(value => value && typeof value === 'object' && !Array.isArray(value))
  const dates = eachDate(start, end)
  return schedules.flatMap(value => {
    const record = value as Record<string, unknown>
    if (record.active === false) return []
    const weekday = Number(record.weekday)
    const ordinal = record.ordinal
    const startTime = stringValue(record.startTime)
    const startDate = stringValue(record.startDate)
    const endDate = stringValue(record.endDate)
    if (!startTime || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return []
    const duration = typeof record.durationMinutes === 'number' && record.durationMinutes > 0
      ? Math.min(record.durationMinutes, 720)
      : 90
    const endTime = addMinutes(startTime, duration)
    return dates.flatMap(date => {
      if ((startDate && date < startDate) || (endDate && date > endDate)) return []
      const parsed = new Date(`${date}T00:00:00Z`)
      if (parsed.getUTCDay() !== weekday) return []
      const day = parsed.getUTCDate()
      const matches = ordinal === 'last'
        ? new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), day + 7)).getUTCMonth() !== parsed.getUTCMonth()
        : Math.ceil(day / 7) === Number(ordinal)
      return matches ? [{ date, startTime, endTime }] : []
    })
  })
}

function normalizeReservations(collection: RawFirebaseCollection): NormalizedBlock[] {
  if (!collection || typeof collection !== 'object') return []
  const now = Date.now()
  return Object.values(collection).flatMap(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const record = value as Record<string, unknown>
    const status = stringValue(record.status)
    const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : 0
    if (status === 'released' || status === 'rejected' || (status === 'held' && expiresAt > 0 && expiresAt < now)) return []
    const date = stringValue(record.date)
    const startTime = stringValue(record.startTime)
    const endTime = stringValue(record.endTime)
    return date && startTime && endTime ? [{ date, startTime, endTime, status }] : []
  })
}

function omitKey(collection: RawFirebaseCollection, key?: string): RawFirebaseCollection {
  if (!collection || !key) return collection
  return Object.fromEntries(Object.entries(collection).filter(([entryKey]) => entryKey !== key))
}

function eachDate(start: string, end: string) {
  const result: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

function addMinutes(time: string, minutes: number) {
  const total = timeToMinutes(time) + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function normalizeBlocks(
  collection: RawFirebaseCollection,
  defaultStartTime: string,
  defaultEndTime: string,
): NormalizedBlock[] {
  if (!collection || typeof collection !== 'object') return []

  return Object.values(collection).flatMap(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return []
    }

    const record = value as Record<string, unknown>
    const date = stringValue(record.date)
    const startTime = stringValue(record.startTime) || defaultStartTime
    const endTime = stringValue(record.endTime) || defaultEndTime

    if (!date || !startTime || !endTime) return []

    return [{
      date,
      startTime,
      endTime,
      status: stringValue(record.status),
    }]
  })
}

function withoutStatus(block: NormalizedBlock): PublicScheduleBlock {
  return {
    date: block.date,
    startTime: block.startTime,
    endTime: block.endTime,
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isWithinRange(date: string, start: string, end: string) {
  return date >= start && date <= end
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && endA > startB
}

function sortAndDedupe(blocks: PublicScheduleBlock[]) {
  const unique = new Map<string, PublicScheduleBlock>()
  blocks.forEach(block => {
    unique.set(
      `${block.date}|${block.startTime}|${block.endTime}`,
      block,
    )
  })

  return Array.from(unique.values()).sort((first, second) =>
    `${first.date}|${first.startTime}`.localeCompare(
      `${second.date}|${second.startTime}`,
    ),
  )
}
