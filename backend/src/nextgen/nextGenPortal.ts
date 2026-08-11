import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'

export const NEXTGEN_QA_PATH = ['nextGenPortal', 'qa'] as const
export const LEGACY_NEXTGEN_QA_PATH = ['nextGenActivities', 'qaSessions'] as const
export const LEGACY_NEXTGEN_USERS_PATH = ['nextGenUsers'] as const
export const LEGACY_QA_SESSION_ID = 'qa-session-1'
const LEGACY_QA_MIGRATION_PATH = [...NEXTGEN_QA_PATH, 'migrations', 'legacyQaSession1'] as const

export type NextGenQaSessionStatus = 'draft' | 'open' | 'closed'
export type NextGenParticipantStatus = 'pending' | 'verified' | 'discarded'

export type NextGenQaSession = {
  id: string
  title: string
  description: string
  status: NextGenQaSessionStatus
  createdAt: number
  createdByUid: string
  updatedAt: number
}

export type NextGenQaOption = { id: string; label: string }

export type NextGenQaQuestion = {
  id: string
  sessionId: string
  prompt: string
  options: NextGenQaOption[]
  createdAt: number
  createdByUid: string
  updatedAt: number
}

export type NextGenQaParticipant = {
  uid: string
  email: string
  name: string
  status: NextGenParticipantStatus
  firstVotedAt: number
  updatedAt: number
  reviewedAt?: number
  reviewedByUid?: string
}

type NextGenQaVote = {
  participantUid: string
  optionId: string
  createdAt: number
}

export async function listQaSessions(database: FirebaseRealtimeDatabaseClient) {
  return normalizeSessions(await database.get([...NEXTGEN_QA_PATH, 'sessions']))
}

export async function ensureLegacyQaSession({
  database,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  timestamp: number
}) {
  const migration = asRecord(await database.get(LEGACY_QA_MIGRATION_PATH))
  if (migration.complete === true) return getQaSession(database, LEGACY_QA_SESSION_ID)

  const legacyQuestionEntries = Object.entries(
    asRecord(await database.get(LEGACY_NEXTGEN_QA_PATH)),
  ).filter(([, value]) => stringValue(asRecord(value).question))

  if (legacyQuestionEntries.length === 0) {
    await database.patch(LEGACY_QA_MIGRATION_PATH, {
      complete: true,
      migratedAt: timestamp,
      questionCount: 0,
    })
    return null
  }

  const earliestCreatedAt = legacyQuestionEntries.reduce((earliest, [, value]) => {
    const createdAt = numberValue(asRecord(value).createdAt)
    return createdAt > 0 && createdAt < earliest ? createdAt : earliest
  }, timestamp)
  const session: NextGenQaSession = {
    id: LEGACY_QA_SESSION_ID,
    title: 'QA Session 1',
    description: 'Archived questions from the previous NextGen QA page.',
    status: 'closed',
    createdAt: earliestCreatedAt,
    createdByUid: 'legacy-nextgen-migration',
    updatedAt: timestamp,
  }
  await patchIfMissing(database, [...NEXTGEN_QA_PATH, 'sessions', session.id], session)

  const legacyUsers = asRecord(await database.get(LEGACY_NEXTGEN_USERS_PATH))
  let voteCount = 0
  const participantKeys = new Set<string>()

  for (const [questionId, value] of legacyQuestionEntries) {
    const record = asRecord(value)
    const question: NextGenQaQuestion = {
      id: questionId,
      sessionId: session.id,
      prompt: stringValue(record.question),
      options: [
        { id: 'option-1', label: 'Upvote' },
        { id: 'option-2', label: 'Downvote' },
      ],
      createdAt: numberValue(record.createdAt) || earliestCreatedAt,
      createdByUid: stringValue(record.submittedByIdentifier) || 'legacy-nextgen-migration',
      updatedAt: numberValue(record.updatedAt) || timestamp,
    }
    await patchIfMissing(
      database,
      [...NEXTGEN_QA_PATH, 'questions', session.id, questionId],
      question,
    )

    const legacyVotes = asRecord(record.votesByIdentifier)
    const voterIdentifiers = new Set([
      ...Object.keys(asRecord(record.voterIdentifiers)),
      ...Object.keys(legacyVotes),
    ])
    for (const identifier of voterIdentifiers) {
      const user = asRecord(legacyUsers[identifier])
      const email = stringValue(user.email).toLowerCase()
      if (!email) continue
      const emailVoteKey = await createEmailVoteKey(email)
      const participantUid = `legacy_${emailVoteKey.slice(0, 40)}`
      const legacyVote = asRecord(legacyVotes[identifier])
      const firstVotedAt = numberValue(legacyVote.completedAt) || question.createdAt
      const status: NextGenParticipantStatus = user.status === 'approved'
        ? 'verified'
        : user.status === 'rejected'
          ? 'discarded'
          : 'pending'
      const participant: NextGenQaParticipant = {
        uid: participantUid,
        email,
        name: stringValue(user.fullName) || email,
        status,
        firstVotedAt,
        updatedAt: timestamp,
      }
      await patchIfMissing(
        database,
        [...NEXTGEN_QA_PATH, 'participants', session.id, participantUid],
        participant,
      )
      participantKeys.add(participantUid)

      const optionId = legacyVote.voteType === 'downvote'
        ? 'option-2'
        : legacyVote.voteType === 'upvote'
          ? 'option-1'
          : null
      if (optionId && await patchIfMissing(
        database,
        [...NEXTGEN_QA_PATH, 'votes', session.id, questionId, emailVoteKey],
        { participantUid, optionId, createdAt: firstVotedAt },
      )) voteCount += 1
    }
  }

  await database.patch(LEGACY_QA_MIGRATION_PATH, {
    complete: true,
    migratedAt: timestamp,
    questionCount: legacyQuestionEntries.length,
    participantCount: participantKeys.size,
    voteCount,
  })
  return getQaSession(database, LEGACY_QA_SESSION_ID)
}

export async function getQaSession(database: FirebaseRealtimeDatabaseClient, sessionId: string) {
  return normalizeSession(
    sessionId,
    await database.get([...NEXTGEN_QA_PATH, 'sessions', sessionId]),
  )
}

export async function listQaQuestions(database: FirebaseRealtimeDatabaseClient, sessionId: string) {
  return normalizeQuestions(
    sessionId,
    await database.get([...NEXTGEN_QA_PATH, 'questions', sessionId]),
  )
}

export async function createQaSession({
  database,
  id,
  title,
  description,
  status,
  userUid,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  id: string
  title: string
  description: string
  status: NextGenQaSessionStatus
  userUid: string
  timestamp: number
}) {
  const session: NextGenQaSession = {
    id,
    title: title.trim(),
    description: description.trim(),
    status,
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...NEXTGEN_QA_PATH, 'sessions', id], session)
  return session
}

export async function createQaQuestion({
  database,
  session,
  id,
  prompt,
  optionLabels,
  userUid,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  session: NextGenQaSession
  id: string
  prompt: string
  optionLabels: string[]
  userUid: string
  timestamp: number
}) {
  const question: NextGenQaQuestion = {
    id,
    sessionId: session.id,
    prompt: prompt.trim(),
    options: optionLabels.map((label, index) => ({
      id: `option-${index + 1}`,
      label: label.trim(),
    })),
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...NEXTGEN_QA_PATH, 'questions', session.id, id], question)
  return question
}

export async function recordQaVote({
  database,
  session,
  question,
  participant,
  optionId,
  emailVoteKey,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  session: NextGenQaSession
  question: NextGenQaQuestion
  participant: Pick<NextGenQaParticipant, 'uid' | 'email' | 'name'>
  optionId: string
  emailVoteKey: string
  timestamp: number
}) {
  if (session.status !== 'open') {
    throw new NextGenPortalError('NEXTGEN_QA_SESSION_NOT_OPEN', 'This QA session is not accepting votes.', 409)
  }
  if (!question.options.some(option => option.id === optionId)) {
    throw new NextGenPortalError('NEXTGEN_QA_OPTION_NOT_FOUND', 'The selected answer no longer exists.', 404)
  }

  const vote: NextGenQaVote = {
    participantUid: participant.uid,
    optionId,
    createdAt: timestamp,
  }
  const stored = await database.putIfAbsent(
    [...NEXTGEN_QA_PATH, 'votes', session.id, question.id, emailVoteKey],
    vote,
  )
  if (!stored) {
    throw new NextGenPortalError('NEXTGEN_QA_ALREADY_VOTED', 'This email has already voted on this question.', 409)
  }

  const currentParticipant = normalizeParticipant(
    participant.uid,
    await database.get([...NEXTGEN_QA_PATH, 'participants', session.id, participant.uid]),
  )
  const participantRecord: NextGenQaParticipant = {
    uid: participant.uid,
    email: participant.email,
    name: participant.name,
    status: currentParticipant?.status ?? 'pending',
    firstVotedAt: currentParticipant?.firstVotedAt || timestamp,
    updatedAt: timestamp,
    ...(currentParticipant?.reviewedAt ? { reviewedAt: currentParticipant.reviewedAt } : {}),
    ...(currentParticipant?.reviewedByUid ? { reviewedByUid: currentParticipant.reviewedByUid } : {}),
  }
  await database.patch(
    [...NEXTGEN_QA_PATH, 'participants', session.id, participant.uid],
    participantRecord,
  )
  return participantRecord
}

export async function getMemberSessionView({
  database,
  session,
  emailVoteKey,
}: {
  database: FirebaseRealtimeDatabaseClient
  session: NextGenQaSession
  emailVoteKey: string
}) {
  const questions = await listQaQuestions(database, session.id)
  const votedQuestionIds: string[] = []
  await Promise.all(questions.map(async question => {
    const vote = await database.get([
      ...NEXTGEN_QA_PATH,
      'votes',
      session.id,
      question.id,
      emailVoteKey,
    ])
    if (vote !== null) votedQuestionIds.push(question.id)
  }))
  return { session, questions, votedQuestionIds }
}

export async function getPastorSessionView(
  database: FirebaseRealtimeDatabaseClient,
  session: NextGenQaSession,
) {
  const [questions, rawParticipants, rawVotes] = await Promise.all([
    listQaQuestions(database, session.id),
    database.get([...NEXTGEN_QA_PATH, 'participants', session.id]),
    database.get([...NEXTGEN_QA_PATH, 'votes', session.id]),
  ])
  const participants = normalizeParticipants(rawParticipants)
  const verifiedUids = new Set(
    participants.filter(participant => participant.status === 'verified').map(participant => participant.uid),
  )
  const votesByQuestion = asRecord(rawVotes)
  const results = questions.map(question => {
    const counts = Object.fromEntries(question.options.map(option => [option.id, 0]))
    Object.values(asRecord(votesByQuestion[question.id])).forEach(value => {
      const vote = asRecord(value)
      const participantUid = stringValue(vote.participantUid)
      const optionId = stringValue(vote.optionId)
      if (verifiedUids.has(participantUid) && optionId in counts) counts[optionId] += 1
    })
    return {
      questionId: question.id,
      totalVerifiedVotes: Object.values(counts).reduce((total, count) => total + count, 0),
      counts,
    }
  })
  return { session, questions, participants, results }
}

export async function updateParticipantStatus({
  database,
  sessionId,
  participantUid,
  status,
  pastorUid,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  sessionId: string
  participantUid: string
  status: NextGenParticipantStatus
  pastorUid: string
  timestamp: number
}) {
  const path = [...NEXTGEN_QA_PATH, 'participants', sessionId, participantUid]
  const participant = normalizeParticipant(participantUid, await database.get(path))
  if (!participant) throw new NextGenPortalError('NEXTGEN_PARTICIPANT_NOT_FOUND', 'The participant was not found.', 404)
  await database.patch(path, {
    status,
    reviewedAt: timestamp,
    reviewedByUid: pastorUid,
    updatedAt: timestamp,
  })
  return { ...participant, status, reviewedAt: timestamp, reviewedByUid: pastorUid, updatedAt: timestamp }
}

export async function createEmailVoteKey(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeSessions(value: unknown) {
  return Object.entries(asRecord(value))
    .map(([id, session]) => normalizeSession(id, session))
    .filter((session): session is NextGenQaSession => session !== null)
    .sort((left, right) => right.createdAt - left.createdAt)
}

function normalizeSession(id: string, value: unknown): NextGenQaSession | null {
  const record = asRecord(value)
  const title = stringValue(record.title)
  const status = record.status === 'draft' || record.status === 'open' || record.status === 'closed'
    ? record.status
    : null
  if (!id || !title || !status) return null
  return {
    id,
    title,
    description: stringValue(record.description),
    status,
    createdAt: numberValue(record.createdAt),
    createdByUid: stringValue(record.createdByUid),
    updatedAt: numberValue(record.updatedAt),
  }
}

function normalizeQuestions(sessionId: string, value: unknown) {
  return Object.entries(asRecord(value))
    .map(([id, question]) => normalizeQuestion(sessionId, id, question))
    .filter((question): question is NextGenQaQuestion => question !== null)
    .sort((left, right) => left.createdAt - right.createdAt)
}

function normalizeQuestion(sessionId: string, id: string, value: unknown): NextGenQaQuestion | null {
  const record = asRecord(value)
  const prompt = stringValue(record.prompt)
  const options = Array.isArray(record.options)
    ? record.options.map(option => {
        const normalized = asRecord(option)
        return { id: stringValue(normalized.id), label: stringValue(normalized.label) }
      }).filter(option => option.id && option.label)
    : Object.values(asRecord(record.options)).map(option => {
        const normalized = asRecord(option)
        return { id: stringValue(normalized.id), label: stringValue(normalized.label) }
      }).filter(option => option.id && option.label)
  if (!id || !prompt || options.length < 2) return null
  return {
    id,
    sessionId,
    prompt,
    options,
    createdAt: numberValue(record.createdAt),
    createdByUid: stringValue(record.createdByUid),
    updatedAt: numberValue(record.updatedAt),
  }
}

function normalizeParticipants(value: unknown) {
  return Object.entries(asRecord(value))
    .map(([uid, participant]) => normalizeParticipant(uid, participant))
    .filter((participant): participant is NextGenQaParticipant => participant !== null)
    .sort((left, right) => left.name.localeCompare(right.name) || left.email.localeCompare(right.email))
}

function normalizeParticipant(uid: string, value: unknown): NextGenQaParticipant | null {
  const record = asRecord(value)
  const email = stringValue(record.email).toLowerCase()
  const status = record.status === 'verified' || record.status === 'discarded' ? record.status : 'pending'
  if (!uid || !email) return null
  return {
    uid,
    email,
    name: stringValue(record.name) || email,
    status,
    firstVotedAt: numberValue(record.firstVotedAt),
    updatedAt: numberValue(record.updatedAt),
    ...(numberValue(record.reviewedAt) ? { reviewedAt: numberValue(record.reviewedAt) } : {}),
    ...(stringValue(record.reviewedByUid) ? { reviewedByUid: stringValue(record.reviewedByUid) } : {}),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}
function stringValue(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : 0 }

async function patchIfMissing(
  database: FirebaseRealtimeDatabaseClient,
  path: readonly string[],
  value: unknown,
) {
  if (await database.get(path) !== null) return false
  await database.patch(path, value)
  return true
}

export class NextGenPortalError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 404 | 409,
  ) {
    super(message)
    this.name = 'NextGenPortalError'
  }
}
