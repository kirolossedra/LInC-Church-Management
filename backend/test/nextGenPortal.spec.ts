import { describe, expect, it } from 'vitest'

import { createNextGenObjectKey } from '../src/nextgen/nextGenFiles'
import {
  getPastorSessionView,
  recordQaVote,
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
}

describe('NextGen portal domain', () => {
  it('atomically rejects a second vote from the same email key', async () => {
    const { database } = memoryDatabase()
    const input = {
      database,
      session,
      question,
      participant: { uid: 'member-1', email: 'member@example.com', name: 'Member One' },
      optionId: 'option-1',
      emailVoteKey: 'email-hash',
      timestamp: 10,
    }
    await recordQaVote(input)
    await expect(recordQaVote({ ...input, optionId: 'option-2', timestamp: 11 }))
      .rejects.toMatchObject({ code: 'NEXTGEN_QA_ALREADY_VOTED' })
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

  it('places every NextGen object below the isolated nextgen prefix', () => {
    const key = createNextGenObjectKey('file-1', 'folder-1', 'notes.pdf')
    expect(key).toBe('nextgen/folder-1/file-1/notes.pdf')
    expect(key.startsWith('archives/')).toBe(false)
  })
})
