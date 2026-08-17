export type PeopleDevelopmentScheduleIdentity = {
  audience: 'group' | 'shared'
  group: string
  ordinal: 1 | 2 | 3 | 4 | 'last'
  weekday: number
  startTime: string
  durationMinutes: number
  startDate: string
  endDate: string
}

export function buildScheduleIdentity(schedule: PeopleDevelopmentScheduleIdentity): string {
  const audience = schedule.audience === 'shared' ? 'shared' : 'group'
  const group = audience === 'shared' ? 'shared' : schedule.group.trim().toLowerCase()
  return [
    'schedule', audience, group, String(schedule.ordinal), String(schedule.weekday),
    schedule.startTime.replace(':', ''), String(schedule.durationMinutes),
    compactDate(schedule.startDate), compactDate(schedule.endDate) || 'open',
  ].join('_')
}

export function deduplicateSchedules<T extends PeopleDevelopmentScheduleIdentity>(schedules: T[]): T[] {
  const seen = new Set<string>()
  return schedules.filter(schedule => {
    const identity = buildScheduleIdentity(schedule)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

function compactDate(value: string): string {
  return value.replaceAll('-', '')
}
