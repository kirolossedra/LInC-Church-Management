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
  start,
  end,
}: {
  availability: RawFirebaseCollection
  unavailability: RawFirebaseCollection
  meetings: RawFirebaseCollection
  meetingRequests: RawFirebaseCollection
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
}: {
  date: string
  startTime: string
  endTime: string
  availability: RawFirebaseCollection
  unavailability: RawFirebaseCollection
  meetings: RawFirebaseCollection
  meetingRequests: RawFirebaseCollection
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
