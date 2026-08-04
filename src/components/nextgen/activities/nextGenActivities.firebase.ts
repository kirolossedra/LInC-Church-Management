import { get, onValue, push, ref, runTransaction, update } from 'firebase/database';
import { database } from '../../../firebase';
import {
  NEXTGEN_ACTIVITIES_PATH,
  NEXTGEN_SURVEY_ID,
  NEXTGEN_USERS_PATH,
} from './nextGenActivities.constants';
import type {
  NextGenUserRecord,
  QASessionForm,
  SavedQASession,
  VoteType,
} from './nextGenActivities.types';
import {
  extractQuestionVoterIdentifiers,
  normalizeNumber,
  normalizeSavedSession,
  normalizeUserRecord,
  questionHasIdentifierVote,
  toRecord,
} from './nextGenActivities.utils';

export async function createNextGenRegistration(record: NextGenUserRecord): Promise<boolean> {
  const result = await runTransaction(
    ref(database, `${NEXTGEN_USERS_PATH}/${record.userId}`),
    currentValue => currentValue === null ? record : undefined,
    { applyLocally: false },
  );
  return result.committed;
}

export async function getNextGenUser(userId: string): Promise<NextGenUserRecord | null> {
  const snapshot = await get(ref(database, `${NEXTGEN_USERS_PATH}/${userId}`));
  return snapshot.exists() ? normalizeUserRecord(userId, snapshot.val()) : null;
}

export async function loadReviewedSessionIds(userId: string): Promise<Set<string>> {
  const [questionsSnapshot, participationSnapshot] = await Promise.all([
    get(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions`)),
    get(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes`)),
  ]);

  const rawQuestions = toRecord(questionsSnapshot.val());
  const legacyParticipationVotes = toRecord(participationSnapshot.val());
  const votedQuestionIds = new Set<string>();
  const migrations: Promise<void>[] = [];

  Object.entries(rawQuestions).forEach(([questionId, questionValue]) => {
    if (questionHasIdentifierVote(questionValue, userId)) votedQuestionIds.add(questionId);
  });

  Object.entries(legacyParticipationVotes).forEach(([questionId, voteValue]) => {
    votedQuestionIds.add(questionId);
    const questionValue = rawQuestions[questionId];
    if (!questionValue || questionHasIdentifierVote(questionValue, userId)) return;

    const legacyVote = toRecord(voteValue);
    const voteType: VoteType = legacyVote.voteType === 'downvote' ? 'downvote' : 'upvote';
    const completedAt = normalizeNumber(legacyVote.completedAt) || Date.now();
    const completedAtISO = String(legacyVote.completedAtISO || new Date(completedAt).toISOString());

    migrations.push(update(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${questionId}`), {
      [`votesByIdentifier/${userId}`]: {
        identifier: userId,
        voteType,
        completedAt,
        completedAtISO,
        migratedFromParticipationHistory: true,
      },
      [`voterIdentifiers/${userId}`]: true,
    }));
  });

  if (migrations.length > 0) {
    const results = await Promise.allSettled(migrations);
    results.forEach(result => {
      if (result.status === 'rejected') {
        console.warn('Could not migrate a legacy NextGen vote marker:', result.reason);
      }
    });
  }

  return votedQuestionIds;
}

export function subscribeToQuestions(
  userId: string,
  onSessions: (sessions: SavedQASession[], votedQuestionIds: Set<string>) => void,
  onError: (error: Error) => void,
): () => void {
  return onValue(
    ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/`),
    snapshot => {
      const sessions = Object.entries(toRecord(snapshot.val()))
        .map(([firebaseId, value]) => normalizeSavedSession(firebaseId, value))
        .filter(session => session.question);
      const votedQuestionIds = new Set(
        sessions
          .filter(session => session.voterIdentifiers.includes(userId))
          .map(session => session.firebaseId),
      );
      onSessions(sessions, votedQuestionIds);
    },
    onError,
  );
}

export async function saveNextGenQuestion(
  user: NextGenUserRecord,
  form: QASessionForm,
): Promise<void> {
  const now = Date.now();
  const questionReference = push(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions`));
  const questionId = questionReference.key;
  if (!questionId) throw new Error('Firebase did not generate a question ID.');

  const payload = {
    question: form.question.trim(),
    category: form.category,
    notes: form.notes.trim(),
    status: 'submittedForPastorReview',
    source: 'nextGenActivities',
    submittedByIdentifier: user.userId,
    submittedByName: user.fullName,
    verses: [],
    translation: '',
    totalUpvotes: 0,
    totalDownvotes: 0,
    netVotes: 0,
    votesByIdentifier: {},
    voterIdentifiers: {},
    createdAt: now,
    createdAtISO: new Date(now).toISOString(),
    updatedAt: now,
    updatedAtISO: new Date(now).toISOString(),
  };

  await update(ref(database), {
    [`${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${questionId}`]: payload,
    [`${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${user.userId}/questionSubmissions/${questionId}`]: {
      activityType: 'questionSubmission',
      activityId: questionId,
      fillingStatus: 'completed',
      completedAt: now,
      completedAtISO: new Date(now).toISOString(),
    },
  });
}

export type PeerVoteResult = 'submitted' | 'already-voted' | 'missing-question';

export async function submitPeerVote(
  userId: string,
  sessionId: string,
  voteType: VoteType,
): Promise<PeerVoteResult> {
  const questionReference = ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${sessionId}`);
  const legacyVoteReference = ref(
    database,
    `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes/${sessionId}`,
  );
  const [currentQuestionSnapshot, legacyVoteSnapshot] = await Promise.all([
    get(questionReference),
    get(legacyVoteReference),
  ]);

  if (!currentQuestionSnapshot.exists()) return 'missing-question';

  const questionAlreadyContainsVote = questionHasIdentifierVote(currentQuestionSnapshot.val(), userId);
  const legacyVoteAlreadyExists = legacyVoteSnapshot.exists();
  if (questionAlreadyContainsVote || legacyVoteAlreadyExists) {
    if (!questionAlreadyContainsVote && legacyVoteAlreadyExists) {
      const legacyValue = toRecord(legacyVoteSnapshot.val());
      const legacyVoteType: VoteType = legacyValue.voteType === 'downvote' ? 'downvote' : 'upvote';
      const completedAt = normalizeNumber(legacyValue.completedAt) || Date.now();
      const completedAtISO = String(legacyValue.completedAtISO || new Date(completedAt).toISOString());
      try {
        await update(questionReference, {
          [`votesByIdentifier/${userId}`]: {
            identifier: userId,
            voteType: legacyVoteType,
            completedAt,
            completedAtISO,
            migratedFromParticipationHistory: true,
          },
          [`voterIdentifiers/${userId}`]: true,
        });
      } catch (migrationError) {
        console.warn('Could not migrate legacy vote marker to the question:', migrationError);
      }
    }
    return 'already-voted';
  }

  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const transactionResult = await runTransaction(
    questionReference,
    currentQuestion => {
      if (!currentQuestion || typeof currentQuestion !== 'object') return undefined;
      if (questionHasIdentifierVote(currentQuestion, userId)) return undefined;

      const currentRecord = toRecord(currentQuestion);
      const currentUpvotes = normalizeNumber(currentRecord.totalUpvotes);
      const currentDownvotes = normalizeNumber(currentRecord.totalDownvotes);
      const nextUpvotes = voteType === 'upvote' ? currentUpvotes + 1 : currentUpvotes;
      const nextDownvotes = voteType === 'downvote' ? currentDownvotes + 1 : currentDownvotes;
      const votesByIdentifier = toRecord(currentRecord.votesByIdentifier);
      const storedVoterIdentifiers = toRecord(currentRecord.voterIdentifiers);
      const voterIdentifiers = Object.keys(storedVoterIdentifiers).length > 0
        ? storedVoterIdentifiers
        : Object.fromEntries(extractQuestionVoterIdentifiers(currentRecord).map(identifier => [identifier, true]));

      return {
        ...currentRecord,
        totalUpvotes: nextUpvotes,
        totalDownvotes: nextDownvotes,
        netVotes: nextUpvotes - nextDownvotes,
        updatedAt: now,
        updatedAtISO: nowISO,
        votesByIdentifier: {
          ...votesByIdentifier,
          [userId]: { identifier: userId, voteType, completedAt: now, completedAtISO: nowISO },
        },
        voterIdentifiers: { ...voterIdentifiers, [userId]: true },
      };
    },
    { applyLocally: false },
  );

  if (!transactionResult.committed) return 'already-voted';
  if (!questionHasIdentifierVote(transactionResult.snapshot.val(), userId)) {
    throw new Error('The vote transaction committed without storing the identifier.');
  }

  try {
    await update(legacyVoteReference, {
      activityType: 'peerReviewVote',
      activityId: sessionId,
      fillingStatus: 'completed',
      identifier: userId,
      voteType,
      completedAt: now,
      completedAtISO: nowISO,
    });
  } catch (historyError) {
    console.warn('Vote was saved, but the participation history could not be updated:', historyError);
  }

  return 'submitted';
}

export function subscribeToSurveyCompletion(
  userId: string,
  onCompletion: (completed: boolean) => void,
  onError: (error: Error) => void,
): () => void {
  return onValue(
    ref(database, `${NEXTGEN_ACTIVITIES_PATH}/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/${userId}`),
    snapshot => onCompletion(snapshot.exists()),
    onError,
  );
}

export async function saveSurveyResponse(
  userId: string,
  responsePayload: Record<string, unknown>,
  completedAt: number,
  completedAtISO: string,
): Promise<boolean> {
  const responseRef = ref(
    database,
    `${NEXTGEN_ACTIVITIES_PATH}/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/${userId}`,
  );
  const result = await runTransaction(
    responseRef,
    currentValue => currentValue === null ? responsePayload : undefined,
    { applyLocally: false },
  );
  if (!result.committed) return false;

  try {
    await update(
      ref(database, `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/surveys/${NEXTGEN_SURVEY_ID}`),
      {
        activityType: 'feedbackSurvey',
        activityId: NEXTGEN_SURVEY_ID,
        fillingStatus: 'completed',
        completedAt,
        completedAtISO,
      },
    );
  } catch (historyError) {
    console.warn('Survey response was saved, but participation history could not be updated:', historyError);
  }
  return true;
}
