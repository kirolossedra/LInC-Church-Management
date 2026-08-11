import { auth } from '../firebase';

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export type NextGenQaSessionStatus = 'draft' | 'open' | 'closed';
export type NextGenParticipantStatus = 'pending' | 'verified' | 'discarded';
export type NextGenQaVoteType = 'upvote' | 'downvote';
export type NextGenQaMemberView = 'all' | 'my-upvotes' | 'net-votes';

export interface NextGenQaSession {
  id: string;
  title: string;
  description: string;
  theme: {
    en: string;
    ar: string;
    sourceLanguage: 'en' | 'ar' | 'mixed';
  };
  status: NextGenQaSessionStatus;
  createdAt: number;
  updatedAt: number;
  questionCount?: number;
  participantCount?: number;
  pendingParticipantCount?: number;
}

export interface NextGenQaQuestion {
  id: string;
  sessionId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  createdAt: number;
  selectedForDiscussion: boolean;
  selectedAt?: number;
  bezalelReview?: { relevant: boolean; reason: string };
}

export interface NextGenQaParticipant {
  uid: string;
  email: string;
  name: string;
  status: NextGenParticipantStatus;
  firstVotedAt: number;
  updatedAt: number;
}

export interface NextGenPastorSessionView {
  session: NextGenQaSession;
  questions: NextGenQaQuestion[];
  participants: NextGenQaParticipant[];
  results: Array<{
    questionId: string;
    totalVerifiedVotes: number;
    counts: Record<string, number>;
  }>;
}

export interface NextGenFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface NextGenFile {
  id: string;
  folderId: string | null;
  name: string;
  size: number;
  contentType: string;
  status: 'pending' | 'ready';
  createdAt: number;
}

export const getNextGenSessions = async () =>
  request<{ sessions: NextGenQaSession[] }>('/qa/sessions', { method: 'GET' });

export const getNextGenSession = async (sessionId: string, view: NextGenQaMemberView = 'all') =>
  request<{
    session: NextGenQaSession;
    questions: NextGenQaQuestion[];
    currentVotes: Record<string, NextGenQaVoteType>;
    view: NextGenQaMemberView;
    questionLimit: number;
    submittedQuestionCount: number;
  }>(
    `/qa/sessions/${encodeURIComponent(sessionId)}?view=${encodeURIComponent(view)}`,
    { method: 'GET' },
  );

export const submitNextGenQuestion = async (sessionId: string, prompt: string) =>
  request<{
    question: NextGenQaQuestion;
    review: { relevant: boolean; reason: string; suggestedQuestion: string };
    questionLimit: number;
    submittedQuestionCount: number;
  }>(
    `/qa/sessions/${encodeURIComponent(sessionId)}/questions`,
    { method: 'POST', body: JSON.stringify({ prompt }) },
  );

export const submitNextGenVote = async (sessionId: string, questionId: string, voteType: NextGenQaVoteType) =>
  request<{ submitted: true; voteType: NextGenQaVoteType }>(
    `/qa/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/votes`,
    { method: 'POST', body: JSON.stringify({ voteType }) },
  );

export const getPastorNextGenSessions = async () =>
  request<{ sessions: NextGenQaSession[] }>('/pastor/qa/sessions', { method: 'GET' });

export const createPastorNextGenSession = async (input: { title: string; description: string; theme: string; status: NextGenQaSessionStatus }) =>
  request<{ session: NextGenQaSession }>('/pastor/qa/sessions', { method: 'POST', body: JSON.stringify(input) });

export const updatePastorNextGenSession = async (sessionId: string, input: Partial<Pick<NextGenQaSession, 'title' | 'description' | 'status'> & { theme: string }>) =>
  request<{ session: NextGenQaSession }>(`/pastor/qa/sessions/${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: JSON.stringify(input) });

export const updateNextGenQuestionDiscussionSelection = async (
  sessionId: string,
  questionId: string,
  selectedForDiscussion: boolean,
) => request<{ question: NextGenQaQuestion }>(
  `/pastor/qa/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}`,
  { method: 'PATCH', body: JSON.stringify({ selectedForDiscussion }) },
);

export const getPastorNextGenSession = async (sessionId: string) =>
  request<NextGenPastorSessionView>(`/pastor/qa/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET' });

export const updateNextGenParticipantStatus = async (sessionId: string, participantUid: string, status: 'verified' | 'discarded') =>
  request<{ participant: NextGenQaParticipant }>(
    `/pastor/qa/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantUid)}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );

export const getNextGenFolders = async () => request<{ folders: NextGenFolder[] }>('/files/folders', { method: 'GET' });
export const createNextGenFolder = async (name: string, parentId: string | null) =>
  request<{ folder: NextGenFolder }>('/files/folders', { method: 'POST', body: JSON.stringify({ name, parentId }) });
export const deleteNextGenFolder = async (folderId: string) =>
  request<{ deleted: true }>(`/files/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' });
export const getNextGenFiles = async () => request<{ files: NextGenFile[] }>('/files', { method: 'GET' });

export async function uploadNextGenFile(file: File, folderId: string | null) {
  const contentType = file.type || 'application/octet-stream';
  const prepared = await request<{ file: NextGenFile; uploadUrl: string }>(
    '/files/upload-url',
    { method: 'POST', body: JSON.stringify({ name: file.name, folderId, size: file.size, contentType }) },
  );
  const response = await fetch(prepared.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!response.ok) {
    try { await deleteNextGenFile(prepared.file.id); } catch { /* preserve upload error */ }
    throw new Error(`Private storage rejected the upload (HTTP ${response.status}).`);
  }
  return completeNextGenFile(prepared.file.id);
}

export const completeNextGenFile = async (fileId: string) =>
  (await request<{ file: NextGenFile }>(`/files/${encodeURIComponent(fileId)}/complete`, { method: 'POST' })).file;
export const getNextGenDownloadUrl = async (fileId: string) =>
  request<{ downloadUrl: string; expiresAt: number }>(`/files/${encodeURIComponent(fileId)}/download-url`, { method: 'GET' });
export const deleteNextGenFile = async (fileId: string) =>
  request<{ deleted: true }>(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('NextGen login is required.');
  const send = async (refresh: boolean) => fetch(`${BACKEND_BASE_URL}/api/v1/nextgen${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
      Authorization: `Bearer ${await user.getIdToken(refresh)}`,
    },
  });
  let response: Response;
  try {
    response = await send(false);
    if (response.status === 401) response = await send(true);
  } catch {
    throw new Error('The NextGen backend could not be reached. Check the connection or backend deployment.');
  }
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  } | null;
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(nextGenResponseError(response.status, body?.error));
  }
  return body.data;
}

export function nextGenResponseError(
  status: number,
  error?: { message?: string; code?: string },
) {
  if (error?.message) return `${error.message} (HTTP ${status})`;
  if (status === 404) {
    return 'The NextGen backend endpoint is not deployed or does not exist (HTTP 404).';
  }
  if (status === 401) return 'Your Firebase login expired. Sign in again (HTTP 401).';
  if (status === 403) return 'This account cannot use that NextGen function (HTTP 403).';
  return `The NextGen backend returned an unexpected response (HTTP ${status}).`;
}
