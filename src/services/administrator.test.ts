import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    },
  },
}));

import { getAdminAuditEvents, uploadArchiveFile } from './administrator';

function apiResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Administrator archive service', () => {
  it('uploads directly to a signed URL and completes the authenticated archive record', async () => {
    const pendingFile = {
      id: 'file-1',
      folderId: 'minutes',
      name: 'minutes.pdf',
      size: 7,
      contentType: 'application/pdf',
      status: 'pending' as const,
      createdAt: 1,
      createdByUid: 'admin',
      updatedAt: 1,
    };
    const readyFile = { ...pendingFile, status: 'ready' as const, updatedAt: 2 };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(apiResponse({
        file: pendingFile,
        uploadUrl: 'https://signed.backblaze.example/upload',
        expiresAt: 301_000,
      }, 201))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(apiResponse({ file: readyFile }));

    const result = await uploadArchiveFile(
      new File(['minutes'], 'minutes.pdf', { type: 'application/pdf' }),
      'minutes',
    );

    expect(result).toEqual(readyFile);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/archives/files/upload-url');
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization)
      .toBe('Bearer firebase-id-token');
    expect(fetchMock.mock.calls[1][0]).toBe('https://signed.backblaze.example/upload');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
    });
    expect(fetchMock.mock.calls[2][0]).toContain('/api/v1/admin/archives/files/file-1/complete');
  });

  it('preserves a successfully uploaded object when completion verification is delayed', async () => {
    const pendingFile = {
      id: 'file-2',
      folderId: null,
      name: 'photo.jpg',
      size: 5,
      contentType: 'image/jpeg',
      status: 'pending' as const,
      createdAt: 1,
      createdByUid: 'admin',
      updatedAt: 1,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(apiResponse({
        file: pendingFile,
        uploadUrl: 'https://signed.backblaze.example/upload-2',
        expiresAt: 301_000,
      }, 201))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        error: { message: 'Verification pending.' },
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(uploadArchiveFile(
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      null,
    )).rejects.toThrow('The file reached private storage, but verification is pending. Use Verify upload.');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')).toBe(false);
  });
});

describe('Administrator audit service', () => {
  it('loads the authenticated server-filtered audit trail', async () => {
    const events = [{
      id: 'audit-1',
      occurredAt: 100,
      actorUid: 'admin-1',
      actorEmail: 'admin@example.com',
      actorRole: 'administrator',
      action: 'attendance.person.created',
      targetType: 'attendancePerson',
      targetId: 'person-1',
      targetLabel: 'Ada Lovelace',
      summary: 'Created attendance person Ada Lovelace.',
      status: 'succeeded',
      changes: {},
      metadata: {},
    }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(apiResponse({ events }));

    await expect(getAdminAuditEvents()).resolves.toEqual({ events });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/audit');
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization)
      .toBe('Bearer firebase-id-token');
  });
});
