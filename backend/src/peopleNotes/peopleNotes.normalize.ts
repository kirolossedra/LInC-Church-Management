type UnknownRecord = Record<string, unknown>

export type PeopleNoteComment = {
  id: string
  text: string
  createdAt: number
  createdBy: string
}

export type PeopleNoteItem = {
  id: string
  type: 'strength' | 'growth'
  title: string
  description: string
  dateAdded: string
  latestFollowUpDate: string
  createdAt: number
  updatedAt: number
  createdBy: string
  comments: PeopleNoteComment[]
}

export type PeopleNotePerson = {
  id: string
  fullName: string
  contact: string
  createdAt: number
  updatedAt: number
  createdBy: string
  items: PeopleNoteItem[]
}

export function normalizePeopleNotes(
  value: unknown,
): PeopleNotePerson[] {
  return objectEntries(value)
    .map(([personId, personValue]) => {
      const person = asRecord(personValue)
      const items = objectEntries(person.items)
        .map(([itemId, itemValue]) => {
          const item = asRecord(itemValue)
          const comments = objectEntries(item.comments)
            .map(([commentId, commentValue]) => {
              const comment = asRecord(commentValue)

              return {
                id: commentId,
                text: asString(comment.text),
                createdAt: asNumber(comment.createdAt),
                createdBy: asString(comment.createdBy),
              }
            })
            .sort((a, b) => b.createdAt - a.createdAt)

          return {
            id: itemId,
            type: item.type === 'growth'
              ? 'growth' as const
              : 'strength' as const,
            title: asString(item.title),
            description: asString(item.description),
            dateAdded: asString(item.dateAdded),
            latestFollowUpDate: asString(
              item.latestFollowUpDate,
            ),
            createdAt: asNumber(item.createdAt),
            updatedAt: asNumber(item.updatedAt),
            createdBy: asString(item.createdBy),
            comments,
          }
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)

      return {
        id: personId,
        fullName: asString(person.fullName),
        contact: asString(person.contact),
        createdAt: asNumber(person.createdAt),
        updatedAt: asNumber(person.updatedAt),
        createdBy: asString(person.createdBy),
        items,
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

function asRecord(value: unknown): UnknownRecord {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function objectEntries(
  value: unknown,
): Array<[string, unknown]> {
  return Object.entries(asRecord(value))
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0
}
