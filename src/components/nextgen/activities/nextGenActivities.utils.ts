import { BINARY_SURVEY_QUESTIONS, NEXTGEN_ID_PATTERN, RATING_SURVEY_QUESTIONS } from './nextGenActivities.constants';
import type {
  NextGenUserRecord,
  NextGenUserStatus,
  SavedQASession,
  SurveyAnswers,
} from './nextGenActivities.types';

export function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function createInitialSurveyAnswers(): SurveyAnswers {
  return {
    questionAnnouncement: '',
    postSessionMaterials: '',
    categoryStructure: '',
    subtopicStructure: '',
    sessionBalance: '',
    answerDepth: '',
    questionSelection: '',
    summaryLength: '',
    pastorClarity: '',
    pastorDepth: '',
    pastorEngagement: '',
  };
}

export function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function normalizeUserId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export function isUsableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getEasternTime(timestamp = Date.now()): string {
  return new Date(timestamp).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function normalizeUserStatus(value: unknown): NextGenUserStatus {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'approved' || status === 'rejected') return status;
  return 'pending';
}

export function normalizeUserRecord(userId: string, value: unknown): NextGenUserRecord {
  const record = toRecord(value);
  return {
    fullName: String(record.fullName || '').trim(),
    email: String(record.email || '').trim(),
    userId,
    normalizedUserId: userId,
    status: normalizeUserStatus(record.status),
    source: String(record.source || 'nextGenActivities').trim(),
    createdAt: normalizeNumber(record.createdAt),
    createdAtISO: String(record.createdAtISO || '').trim(),
    createdAtEasternTime: String(record.createdAtEasternTime || '').trim(),
    updatedAt: normalizeNumber(record.updatedAt),
    updatedAtISO: String(record.updatedAtISO || '').trim(),
  };
}

export function extractQuestionVoterIdentifiers(value: unknown): string[] {
  const record = toRecord(value);
  const identifiers = new Set<string>();

  const addIdentifier = (candidate: unknown) => {
    const normalized = normalizeUserId(String(candidate || ''));
    if (NEXTGEN_ID_PATTERN.test(normalized)) identifiers.add(normalized);
  };

  const addKeys = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    Object.keys(candidate as Record<string, unknown>).forEach(addIdentifier);
  };

  addKeys(record.votesByIdentifier);
  addKeys(record.voterIdentifiers);
  addKeys(record.votedIdentifiers);

  if (Array.isArray(record.voterIdentifiers)) record.voterIdentifiers.forEach(addIdentifier);
  if (Array.isArray(record.votedIdentifiers)) record.votedIdentifiers.forEach(addIdentifier);

  return Array.from(identifiers);
}

export function questionHasIdentifierVote(value: unknown, userId: string): boolean {
  const normalizedUserId = normalizeUserId(userId);
  if (!NEXTGEN_ID_PATTERN.test(normalizedUserId)) return false;
  return extractQuestionVoterIdentifiers(value).includes(normalizedUserId);
}

export function normalizeSavedSession(firebaseId: string, value: unknown): SavedQASession {
  const record = toRecord(value);
  const totalUpvotes = normalizeNumber(record.totalUpvotes);
  const totalDownvotes = normalizeNumber(record.totalDownvotes);
  const netVotes = typeof record.netVotes === 'number'
    ? normalizeNumber(record.netVotes)
    : totalUpvotes - totalDownvotes;

  return {
    firebaseId,
    question: String(record.question || '').trim(),
    category: String(record.category || 'Other').trim(),
    notes: String(record.notes || '').trim(),
    status: String(record.status || '').trim(),
    source: String(record.source || '').trim(),
    totalUpvotes,
    totalDownvotes,
    netVotes,
    voterIdentifiers: extractQuestionVoterIdentifiers(record),
    createdAt: normalizeNumber(record.createdAt),
    updatedAt: normalizeNumber(record.updatedAt),
  };
}

export function getReviewableSessions(
  sessions: SavedQASession[],
  reviewedSessionIds: ReadonlySet<string>,
): SavedQASession[] {
  return sessions
    .filter(session => session.question && !reviewedSessionIds.has(session.firebaseId))
    .sort((a, b) => {
      if (b.totalUpvotes !== a.totalUpvotes) return b.totalUpvotes - a.totalUpvotes;
      if (b.netVotes !== a.netVotes) return b.netVotes - a.netVotes;
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return a.question.localeCompare(b.question);
    });
}

export function countSurveyAnswers(answers: SurveyAnswers): number {
  const binaryAnswered = BINARY_SURVEY_QUESTIONS.filter(
    question => answers[question.id] === 'A' || answers[question.id] === 'B',
  ).length;
  const ratingAnswered = RATING_SURVEY_QUESTIONS.filter(
    question => typeof answers[question.id] === 'number',
  ).length;
  return binaryAnswered + ratingAnswered;
}
