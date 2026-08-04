type FirebaseCollection = Record<string, unknown> | null
type NormalizedRecord = Record<string, unknown> & { id: string }

export function normalizePastorCalendarSnapshot({
  meetings,
  meetingRequests,
  availability,
  unavailability,
}: {
  meetings: FirebaseCollection
  meetingRequests: FirebaseCollection
  availability: FirebaseCollection
  unavailability: FirebaseCollection
}) {
  return {
    meetings: normalizeCollection(meetings).sort(compareByDate),
    meetingRequests: normalizeCollection(meetingRequests).sort(
      (first, second) =>
        numberValue(first.createdAt) - numberValue(second.createdAt),
    ),
    availability: normalizeCollection(availability).sort(compareByDate),
    unavailability: normalizeCollection(unavailability).sort(compareByDate),
  }
}

function normalizeCollection(
  collection: FirebaseCollection,
): NormalizedRecord[] {
  if (!collection || typeof collection !== 'object') return []

  return Object.entries(collection).flatMap(([id, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return []
    }

    return [{ id, ...(value as Record<string, unknown>) }]
  })
}

function compareByDate(
  first: Record<string, unknown>,
  second: Record<string, unknown>,
) {
  return String(first.date || '').localeCompare(
    String(second.date || ''),
  )
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0
}
