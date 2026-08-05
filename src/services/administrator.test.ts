import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    },
  },
}));

import { uploadArchiveFile } from './administrator';

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
});
