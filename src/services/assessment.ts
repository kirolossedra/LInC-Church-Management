import { auth } from '../firebase';

export type AssessmentFormId =
  | 'five-service-pathways'
  | 'spiritual-gifts-discovery';
export type AssessmentFormState = 'active' | 'disabled' | 'hidden';

export interface AssessmentAdminResponse {
  id: string;
  formId: AssessmentFormId;
  fullName: string;
  email: string;
  userIdentifier: string;
  databaseFormId: string;
  fillingLanguage: string;
  identifierEmailSentAt: number | null;
  createdAt: number;
  createdAtEasternTime: string;
  raw: Record<string, unknown>;
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function getAssessmentFormStates(signal?: AbortSignal) {
  return requestPublic<{ forms: Record<AssessmentFormId, AssessmentFormState> }>(
    '/forms',
    { method: 'GET', signal },
  );
}

export async function submitAssessment(input: {
  formId: AssessmentFormId;
  locale: 'en' | 'ar';
  answers: Record<string, string | number>;
}) {
  return requestPublic<{
    id: string;
    result: Record<string, string>;
    notificationSent: boolean;
  }>('/submissions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function submitDirectAssessmentSignup(input: {
  fullName: string;
  email: string;
  locale: 'en' | 'ar';
}) {
  return requestPublic<{ id: string }>('/direct-signups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAssessmentResponses(formId: AssessmentFormId) {
  return requestAdmin<{ responses: AssessmentAdminResponse[] }>(
    `/admin/responses?formId=${encodeURIComponent(formId)}`,
    { method: 'GET' },
  );
}

export async function updateAssessmentLinkage(
  responseId: string,
  input: { userIdentifier: string; databaseFormId: '' | '0' | '1' },
) {
  return requestAdmin<{ updated: true }>(
    `/admin/responses/${encodeURIComponent(responseId)}/linkage`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export async function deleteAssessmentResponse(responseId: string) {
  return requestAdmin<{ deleted: true }>(
    `/admin/responses/${encodeURIComponent(responseId)}`,
    { method: 'DELETE' },
  );
}

export async function sendAssessmentIdentifierEmail(responseId: string) {
  return requestAdmin<{ sent: true }>(
    `/admin/responses/${encodeURIComponent(responseId)}/identifier-email`,
    { method: 'POST' },
  );
}

export async function updateAssessmentFormState(
  formId: AssessmentFormId,
  state: AssessmentFormState,
) {
  return requestAdmin<{ updated: true }>(
    `/admin/forms/${encodeURIComponent(formId)}`,
    { method: 'PATCH', body: JSON.stringify({ state }) },
  );
}

async function requestPublic<T>(path: string, init: RequestInit): Promise<T> {
  return parseResponse<T>(await fetch(`${BACKEND_BASE_URL}/api/v1/assessment${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  }));
}

async function requestAdmin<T>(path: string, init: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator login is required.');
  const send = async (forceRefresh: boolean) => fetch(
    `${BACKEND_BASE_URL}/api/v1/assessment${path}`,
    {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
        Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
      },
    },
  );
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: { success?: boolean; data?: T; error?: { message?: string } } | null = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.error?.message || 'The Assessment request failed.');
  }
  return body.data;
}

