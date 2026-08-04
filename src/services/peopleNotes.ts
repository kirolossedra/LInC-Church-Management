import type { User } from 'firebase/auth';

export type DevelopmentType = 'strength' | 'growth';

export interface DevelopmentComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
}

export interface DevelopmentItem {
  id: string;
  type: DevelopmentType;
  title: string;
  description: string;
  dateAdded: string;
  latestFollowUpDate: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  comments: DevelopmentComment[];
}

export interface PersonRecord {
  id: string;
  fullName: string;
  contact: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  items: DevelopmentItem[];
}

export interface CreatePersonRequest {
  fullName: string;
  contact: string;
}

export interface CreateDevelopmentItemRequest {
  type: DevelopmentType;
  title: string;
  description: string;
  dateAdded: string;
  latestFollowUpDate: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

async function requestPeopleNotes<T>(
  user: User,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const send = async (forceRefresh: boolean) =>
    fetch(`${BACKEND_BASE_URL}/api/v1/people-notes${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...init.headers,
        Authorization: `Bearer ${await user.getIdToken(
          forceRefresh,
        )}`,
      },
    });

  let response = await send(false);

  if (response.status === 401) {
    response = await send(true);
  }

  let body: ApiResponse<T> | null = null;

  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || body?.success !== true || !body.data) {
    throw new Error(
      body?.error?.message ||
        'The People Development Notes request failed.',
    );
  }

  return body.data;
}

function encodeId(id: string) {
  return encodeURIComponent(id);
}

export async function getPeopleNotes(
  user: User,
  signal?: AbortSignal,
): Promise<PersonRecord[]> {
  const result = await requestPeopleNotes<{
    people: PersonRecord[];
  }>(user, '', { method: 'GET', signal });

  return result.people;
}

export async function createPerson(
  user: User,
  request: CreatePersonRequest,
): Promise<string> {
  const result = await requestPeopleNotes<{ id: string }>(
    user,
    '',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );

  return result.id;
}

export async function createDevelopmentItem(
  user: User,
  personId: string,
  request: CreateDevelopmentItemRequest,
): Promise<string> {
  const result = await requestPeopleNotes<{ id: string }>(
    user,
    `/${encodeId(personId)}/items`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );

  return result.id;
}

export async function createDevelopmentComment(
  user: User,
  personId: string,
  itemId: string,
  text: string,
): Promise<string> {
  const result = await requestPeopleNotes<{ id: string }>(
    user,
    `/${encodeId(personId)}/items/${encodeId(
      itemId,
    )}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  );

  return result.id;
}

export async function updateDevelopmentFollowUpDate(
  user: User,
  personId: string,
  itemId: string,
  latestFollowUpDate: string,
) {
  await requestPeopleNotes<{ updated: true }>(
    user,
    `/${encodeId(personId)}/items/${encodeId(
      itemId,
    )}/follow-up`,
    {
      method: 'PATCH',
      body: JSON.stringify({ latestFollowUpDate }),
    },
  );
}

export async function deletePerson(
  user: User,
  personId: string,
) {
  await requestPeopleNotes<{ deleted: true }>(
    user,
    `/${encodeId(personId)}`,
    { method: 'DELETE' },
  );
}

export async function deleteDevelopmentItem(
  user: User,
  personId: string,
  itemId: string,
) {
  await requestPeopleNotes<{ deleted: true }>(
    user,
    `/${encodeId(personId)}/items/${encodeId(itemId)}`,
    { method: 'DELETE' },
  );
}

export async function deleteDevelopmentComment(
  user: User,
  personId: string,
  itemId: string,
  commentId: string,
) {
  await requestPeopleNotes<{ deleted: true }>(
    user,
    `/${encodeId(personId)}/items/${encodeId(
      itemId,
    )}/comments/${encodeId(commentId)}`,
    { method: 'DELETE' },
  );
}
