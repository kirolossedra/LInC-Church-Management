import { auth } from '../firebase';
import type { AdminAccount, AdminAuthority } from '../components/admin/admin.types';
import type { ArchiveFolder } from '../components/admin/archives/archives.types';

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function getAdministratorSession() {
  return requestAdmin<{ account: AdminAccount; adminAccounts: AdminAccount[] }>(
    '/session',
    { method: 'GET' },
  );
}

export async function saveAdministratorAuthority(uid: string, authority: AdminAuthority) {
  return requestAdmin<{ updated: true }>(
    `/users/${encodeURIComponent(uid)}/authority`,
    { method: 'PATCH', body: JSON.stringify(authority) },
  );
}

export async function suspendAdministrator(uid: string) {
  return requestAdmin<{ suspended: true }>(
    `/users/${encodeURIComponent(uid)}/suspend`,
    { method: 'PATCH' },
  );
}

export async function getArchiveFolders() {
  return requestAdmin<{ folders: ArchiveFolder[] }>(
    '/archives/folders',
    { method: 'GET' },
  );
}

export async function createArchiveFolder(name: string, parentId: string | null) {
  return requestAdmin<{ folder: ArchiveFolder }>(
    '/archives/folders',
    { method: 'POST', body: JSON.stringify({ name, parentId }) },
  );
}

export async function deleteArchiveFolder(folderId: string) {
  return requestAdmin<{ deleted: true }>(
    `/archives/folders/${encodeURIComponent(folderId)}`,
    { method: 'DELETE' },
  );
}

async function requestAdmin<T>(path: string, init: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator login is required.');
  const send = async (forceRefresh: boolean) => fetch(
    `${BACKEND_BASE_URL}/api/v1/admin${path}`,
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
  let body: { success?: boolean; data?: T; error?: { message?: string } } | null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.error?.message || 'The Administrator request failed.');
  }
  return body.data;
}
