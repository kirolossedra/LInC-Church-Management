import { auth } from '../firebase';
import type { AdminAccount, AdminAuthority } from '../components/admin/admin.types';
import type { ArchiveFile, ArchiveFolder } from '../components/admin/archives/archives.types';

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export interface PeopleAccessPerson {
  memberKey: string;
  fullName: string;
  sourceEmail: string;
  authEmail: string;
  firebaseUid: string;
  status: 'ready' | 'complete' | 'firebase_ready' | 'email_failed' | 'firebase_failed' | 'missing_email' | 'invalid_email';
  problem: string;
}

export interface PeopleAccessMigrationResult {
  memberKey: string;
  status: string;
  message: string;
}

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

export async function getPeopleAccessAudit() {
  return requestAdmin<{ people: PeopleAccessPerson[] }>('/people-access', { method: 'GET' });
}

export async function updatePeopleAccessEmail(memberKey: string, email: string) {
  return requestAdmin<{ updated: true }>(
    `/people-access/${encodeURIComponent(memberKey)}/email`,
    { method: 'PATCH', body: JSON.stringify({ email }) },
  );
}

export async function migratePeopleAccess(memberKeys?: string[]) {
  return requestAdmin<{ results: PeopleAccessMigrationResult[]; summary: Record<string, number> }>(
    '/people-access/migrate',
    { method: 'POST', body: JSON.stringify(memberKeys ? { memberKeys } : {}) },
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

export async function getArchiveFiles() {
  return requestAdmin<{ files: ArchiveFile[] }>(
    '/archives/files',
    { method: 'GET' },
  );
}

export async function uploadArchiveFile(file: File, folderId: string | null) {
  const contentType = file.type || 'application/octet-stream';
  const prepared = await requestAdmin<{
    file: ArchiveFile;
    uploadUrl: string;
    expiresAt: number;
  }>(
    '/archives/files/upload-url',
    {
      method: 'POST',
      body: JSON.stringify({
        name: file.name,
        folderId,
        size: file.size,
        contentType,
      }),
    },
  );

  try {
    const uploadResponse = await fetch(prepared.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Private storage rejected the upload (HTTP ${uploadResponse.status}).`);
    }
  } catch (error) {
    try { await deleteArchiveFile(prepared.file.id); } catch { /* preserve the upload error */ }
    throw error;
  }

  try {
    return await completeArchiveFileUpload(prepared.file.id);
  } catch {
    throw new Error('The file reached private storage, but verification is pending. Use Verify upload.');
  }
}

export async function completeArchiveFileUpload(fileId: string) {
  const completed = await requestAdmin<{ file: ArchiveFile }>(
    `/archives/files/${encodeURIComponent(fileId)}/complete`,
    { method: 'POST' },
  );
  return completed.file;
}

export async function getArchiveFileDownloadUrl(fileId: string) {
  return requestAdmin<{ downloadUrl: string; expiresAt: number }>(
    `/archives/files/${encodeURIComponent(fileId)}/download-url`,
    { method: 'GET' },
  );
}

export async function deleteArchiveFile(fileId: string) {
  return requestAdmin<{ deleted: true }>(
    `/archives/files/${encodeURIComponent(fileId)}`,
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
