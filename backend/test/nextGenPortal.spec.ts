import { describe, expect, it } from 'vitest'

import { createNextGenObjectKey } from '../src/nextgen/nextGenFiles'
import {
  createQaQuestion,
  ensureLegacyQaSession,
  getMemberSessionView,
  getPastorSessionView,
  LEGACY_QA_SESSION_ID,
  recordQaVote,
  updateQuestionDiscussionSelection,
  type NextGenQaQuestion,
  type NextGenQaSession,
} from '../src/nextgen/nextGenPortal'
import type { FirebaseRealtimeDatabaseClient } from '../src/services/firebaseRealtimeDatabase.service'

function memoryDatabase(initial: Record<string, unknown> = {}) {
  const values = new Map<string, unknown>(Object.entries(initial))
  const key = (path: readonly string[]) => path.join('/')
  const database: FirebaseRealtimeDatabaseClient = {
    get: async <T>(path: readonly string[]) => (values.get(key(path)) as T | undefined) ?? null,
    post: async <T>(_path: readonly string[], value: unknown) => value as T,
    patch: async <T>(path: readonly string[], value: unknown) => {
      const existing = values.get(key(path))
      values.set(key(path), {
        ...(existing && typeof existing === 'object' ? existing : {}),
        ...(value && typeof value === 'object' ? value : {}),
      })
      return value as T
    },
    putIfAbsent: async (path, value) => {
      const pathKey = key(path)
      if (values.has(pathKey)) return false
      values.set(pathKey, value)
      return true
    },
    delete: async path => { values.delete(key(path)) },
  }
  return { database, values }
}

const session: NextGenQaSession = {
  id: 'session-1',
  title: 'Session One',
  description: '',
  theme: { en: 'Faith and service', ar: 'الإيمان والخدمة', sourceLanguage: 'en' },
  status: 'open',
  createdAt: 1,
  createdByUid: 'pastor',
  updatedAt: 1,
}

const question: NextGenQaQuestion = {
  id: 'question-1',
  sessionId: session.id,
  prompt: 'Choose one',
  options: [
    { id: 'option-1', label: 'First' },
    { id: 'option-2', label: 'Second' },
  ],
  createdAt: 2,
  createdByUid: 'pastor',
  updatedAt: 2,
  selectedForDiscussion: false,
}

describe('NextGen portal domain', () => {
  it('stores one current vote per email key and allows changing that vote', async () => {
    const { database, values } = memoryDatabase()
    const input = {
      database,
      session,
      question,
      participant: { uid: 'member-1', email: 'member@example.com', name: 'Member One' },
      voteType: 'upvote' as const,
      emailVoteKey: 'email-hash',
      timestamp: 10,
    }
    await recordQaVote(input)
    const changed = await recordQaVote({ ...input, voteType: 'downvote', timestamp: 11 })

    expect(changed).toMatchObject({ voteType: 'downvote', changed: true })
    expect(values.get('nextGenPortal/qa/votes/session-1/question-1/email-hash')).toMatchObject({
      participantUid: 'member-1',
      optionId: 'option-2',
      voteType: 'downvote',
      createdAt: 10,
      updatedAt: 11,
    })
  })

  it('creates member questions with fixed upvote and downvote choices', async () => {
    const { database } = memoryDatabase()
    const created = await createQaQuestion({
      database,
      session,
      id: 'question-2',
      prompt: '  What should we discuss?  ',
      userUid: 'member-2',
      review: { relevant: true, reason: 'The question fits the session theme.' },
      timestamp: 12,
    })

    expect(created).toMatchObject({
      prompt: 'What should we discuss?',
      createdByUid: 'member-2',
      selectedForDiscussion: false,
      options: [
        { id: 'option-1', label: 'Upvote' },
        { id: 'option-2', label: 'Downvote' },
      ],
    })
  })

  it('migrates legacy questions once into a closed QA Session 1', async () => {
    const { database, values } = memoryDatabase({
      'nextGenActivities/qaSessions': {
        'legacy-question': {
          question: 'Which topic should be discussed?',
          submittedByIdentifier: 'person-a',
          totalUpvotes: 1,
          totalDownvotes: 0,
          voterIdentifiers: { 'person-a': true },
          votesByIdentifier: {
            'person-a': { voteType: 'upvote', completedAt: 15 },
          },
          createdAt: 10,
          updatedAt: 20,
        },
      },
      nextGenUsers: {
        'person-a': {
          fullName: 'Legacy Member',
          email: 'legacy@example.com',
          status: 'approved',
        },
      },
    })

    const migrated = await ensureLegacyQaSession({ database, timestamp: 30 })
    const valueCountAfterFirstMigration = values.size
    const repeated = await ensureLegacyQaSession({ database, timestamp: 40 })

    expect(migrated).toMatchObject({
      id: LEGACY_QA_SESSION_ID,
      title: 'QA Session 1',
      status: 'closed',
    })
    expect(repeated?.status).toBe('closed')
    expect(values.size).toBe(valueCountAfterFirstMigration)
    expect(values.get(`nextGenPortal/qa/questions/${LEGACY_QA_SESSION_ID}/legacy-question`))
      .toMatchObject({ prompt: 'Which topic should be discussed?' })
    expect(values.get(`nextGenPortal/qa/migrations/legacyQaSession1`))
      .toMatchObject({ complete: true, questionCount: 1, participantCount: 1, voteCount: 1 })
    expect([...values.entries()].find(([key]) => key.startsWith(`nextGenPortal/qa/participants/${LEGACY_QA_SESSION_ID}/`))?.[1])
      .toMatchObject({ name: 'Legacy Member', status: 'verified' })
    expect([...values.keys()].some(key => key.startsWith(`nextGenPortal/qa/votes/${LEGACY_QA_SESSION_ID}/legacy-question/`)))
      .toBe(true)
  })

  it('keeps a closed session read-only for voting', async () => {
    const { database } = memoryDatabase()
    await expect(recordQaVote({
      database,
      session: { ...session, status: 'closed' },
      question,
      participant: { uid: 'member-1', email: 'member@example.com', name: 'Member One' },
      voteType: 'upvote',
      emailVoteKey: 'email-hash',
      timestamp: 10,
    })).rejects.toMatchObject({ code: 'NEXTGEN_QA_SESSION_NOT_OPEN' })
  })

  it('returns voter identities separately from aggregate results and excludes unverified votes', async () => {
    const { database } = memoryDatabase({
      'nextGenPortal/qa/questions/session-1': { 'question-1': question },
      'nextGenPortal/qa/participants/session-1': {
        verified: { uid: 'verified', email: 'real@example.com', name: 'Real Person', status: 'verified', firstVotedAt: 4, updatedAt: 4 },
        discarded: { uid: 'discarded', email: 'fake@example.com', name: 'Fake Person', status: 'discarded', firstVotedAt: 5, updatedAt: 5 },
      },
      'nextGenPortal/qa/votes/session-1': {
        'question-1': {
          hash1: { participantUid: 'verified', optionId: 'option-1', createdAt: 4 },
          hash2: { participantUid: 'discarded', optionId: 'option-2', createdAt: 5 },
        },
      },
    })
    const view = await getPastorSessionView(database, session)
    expect(view.participants.map(participant => participant.name)).toEqual(['Fake Person', 'Real Person'])
    expect(view.results[0]).toEqual({ questionId: 'question-1', totalVerifiedVotes: 1, counts: { 'option-1': 1, 'option-2': 0 } })
    expect(JSON.stringify(view.participants)).not.toContain('option-1')
  })

  it('filters personal upvotes and ranks by verified net votes without returning scores', async () => {
    const secondQuestion = { ...question, id: 'question-2', prompt: 'Second question', createdAt: 3 }
    const { database } = memoryDatabase({
      'nextGenPortal/qa/questions/session-1': {
        'question-1': question,
        'question-2': secondQuestion,
      },
      'nextGenPortal/qa/participants/session-1': {
        verified: { uid: 'verified', email: 'verified@example.com', name: 'Verified', status: 'verified', firstVotedAt: 4, updatedAt: 4 },
        discarded: { uid: 'discarded', email: 'discarded@example.com', name: 'Discarded', status: 'discarded', firstVotedAt: 5, updatedAt: 5 },
      },
      'nextGenPortal/qa/votes/session-1': {
        'question-1': {
          memberHash: { participantUid: 'member', optionId: 'option-1', voteType: 'upvote', createdAt: 4 },
          verifiedHash: { participantUid: 'verified', optionId: 'option-2', voteType: 'downvote', createdAt: 4 },
          discardedHash: { participantUid: 'discarded', optionId: 'option-1', voteType: 'upvote', createdAt: 5 },
        },
        'question-2': {
          verifiedHash: { participantUid: 'verified', optionId: 'option-1', voteType: 'upvote', createdAt: 4 },
        },
      },
    })

    const personal = await getMemberSessionView({ database, session, emailVoteKey: 'memberHash', view: 'my-upvotes' })
    const ranked = await getMemberSessionView({ database, session, emailVoteKey: 'memberHash', view: 'net-votes' })

    expect(personal.questions.map(item => item.id)).toEqual(['question-1'])
    expect(personal.currentVotes).toEqual({ 'question-1': 'upvote' })
    expect(ranked.questions.map(item => item.id)).toEqual(['question-2', 'question-1'])
    expect(JSON.stringify(ranked)).not.toContain('netScore')
  })

  it('lets management select and unselect a member question for discussion', async () => {
    const { database, values } = memoryDatabase({
      'nextGenPortal/qa/questions/session-1/question-1': question,
    })

    const selected = await updateQuestionDiscussionSelection({
      database,
      sessionId: session.id,
      questionId: question.id,
      selectedForDiscussion: true,
      managerUid: 'admin-1',
      timestamp: 20,
    })
    expect(selected).toMatchObject({ selectedForDiscussion: true, selectedByUid: 'admin-1', selectedAt: 20 })

    const unselected = await updateQuestionDiscussionSelection({
      database,
      sessionId: session.id,
      questionId: question.id,
      selectedForDiscussion: false,
      managerUid: 'pastor-1',
      timestamp: 21,
    })
    expect(unselected.selectedForDiscussion).toBe(false)
    expect(values.get('nextGenPortal/qa/questions/session-1/question-1')).toMatchObject({
      selectedForDiscussion: false,
      selectedAt: null,
      selectedByUid: null,
    })
  })

  it('places every NextGen object below the isolated nextgen prefix', () => {
    const key = createNextGenObjectKey('file-1', 'folder-1', 'notes.pdf')
    expect(key).toBe('nextgen/folder-1/file-1/notes.pdf')
    expect(key.startsWith('archives/')).toBe(false)
  })
})
