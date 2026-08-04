import { describe, expect, it } from 'vitest';
import {
  countSurveyAnswers,
  createInitialSurveyAnswers,
  extractQuestionVoterIdentifiers,
  getReviewableSessions,
  isUsableEmail,
  normalizeSavedSession,
  normalizeUserId,
  normalizeUserRecord,
  questionHasIdentifierVote,
} from './nextGenActivities.utils';

describe('NextGen activity utilities', () => {
  it('normalizes identifiers to four uppercase alphanumeric characters', () => {
    expect(normalizeUserId(' a-7b_29 ')).toBe('A7B2');
  });

  it('validates usable email addresses', () => {
    expect(isUsableEmail('nextgen@example.com')).toBe(true);
    expect(isUsableEmail('not-an-email')).toBe(false);
  });

  it('normalizes a user record and defaults unknown status to pending', () => {
    expect(normalizeUserRecord('A7B2', { fullName: '  Ada  ', status: 'unknown' })).toMatchObject({
      fullName: 'Ada',
      userId: 'A7B2',
      normalizedUserId: 'A7B2',
      status: 'pending',
      source: 'nextGenActivities',
    });
  });

  it('collects voter identifiers from legacy and current storage shapes', () => {
    const question = {
      votesByIdentifier: { A7B2: { voteType: 'upvote' } },
      voterIdentifiers: ['c3d4'],
      votedIdentifiers: { E5F6: true },
    };
    expect(extractQuestionVoterIdentifiers(question).sort()).toEqual(['A7B2', 'C3D4', 'E5F6']);
    expect(questionHasIdentifierVote(question, 'c3d4')).toBe(true);
  });

  it('derives net votes when the stored value is absent', () => {
    expect(normalizeSavedSession('question-1', {
      question: 'Question?',
      totalUpvotes: 5,
      totalDownvotes: 2,
    }).netVotes).toBe(3);
  });

  it('filters reviewed sessions and sorts remaining questions by vote priority', () => {
    const sessions = [
      normalizeSavedSession('reviewed', { question: 'Reviewed', totalUpvotes: 10 }),
      normalizeSavedSession('second', { question: 'Second', totalUpvotes: 2, createdAt: 20 }),
      normalizeSavedSession('first', { question: 'First', totalUpvotes: 3, createdAt: 10 }),
    ];
    expect(getReviewableSessions(sessions, new Set(['reviewed'])).map(session => session.firebaseId))
      .toEqual(['first', 'second']);
  });

  it('counts completed binary and rating survey answers', () => {
    const answers = createInitialSurveyAnswers();
    answers.questionAnnouncement = 'A';
    answers.pastorClarity = 5;
    expect(countSurveyAnswers(answers)).toBe(2);
  });
});
