import type { User } from 'firebase/auth';

export interface PastorSession {
  authenticated: true;
  authorized: boolean;
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  signInProvider: string | null;
  role: 'pastor' | null;
  authorizationSource: string;
}

interface PastorSessionApiResponse {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  data?: PastorSession;
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

async function requestPastorSession(
  idToken: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${BACKEND_BASE_URL}/api/v1/auth/session`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    signal,
  });
}

export async function getPastorSession(
  user: User,
  signal?: AbortSignal,
): Promise<PastorSession> {
  let response = await requestPastorSession(
    await user.getIdToken(),
    signal,
  );

  if (response.status === 401) {
    response = await requestPastorSession(
      await user.getIdToken(true),
      signal,
    );
  }

  let responseBody: PastorSessionApiResponse | null = null;

  try {
    responseBody =
      (await response.json()) as PastorSessionApiResponse;
  } catch {
    responseBody = null;
  }

  if (
    !response.ok ||
    responseBody?.success !== true ||
    !responseBody.data ||
    responseBody.data.authenticated !== true ||
    responseBody.data.uid !== user.uid
  ) {
    throw new Error(
      responseBody?.error?.message ||
        'Pastor authorization could not be verified.',
    );
  }

  return responseBody.data;
}
