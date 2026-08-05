import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBackblazeArchiveStorage } from '../src/services/backblazeArchive.service'

const bindings = {
  B2_BUCKET_NAME: 'linc-ministry-archives',
  B2_S3_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
  B2_REGION: 'us-east-005',
  B2_APPLICATION_KEY_ID: 'test-application-key-id',
  B2_APPLICATION_KEY: 'test-application-secret-key',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Backblaze archive storage', () => {
  it('creates a five-minute signed upload URL scoped to the archive object', async () => {
    const storage = createBackblazeArchiveStorage(bindings, () => 1_000)
    const result = await storage.createUploadUrl('archives/_root/file-1/Board Minutes.pdf')
    const url = new URL(result.url)

    expect(url.origin).toBe('https://s3.us-east-005.backblazeb2.com')
    expect(decodeURIComponent(url.pathname)).toBe('/linc-ministry-archives/archives/_root/file-1/Board Minutes.pdf')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(result.expiresAt).toBe(301_000)
    expect(result.url).not.toContain(bindings.B2_APPLICATION_KEY)
  })

  it('signs private downloads with an attachment filename override', async () => {
    const storage = createBackblazeArchiveStorage(bindings, () => 5_000)
    const result = await storage.createDownloadUrl(
      'archives/folder/file-2/report.pdf',
      'Annual report.pdf',
    )
    const url = new URL(result.url)

    expect(url.searchParams.get('response-content-disposition')).toBe(
      "attachment; filename*=UTF-8''Annual%20report.pdf",
    )
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(result.expiresAt).toBe(305_000)
  })

  it('retries a newly uploaded object when the first HEAD request returns 404', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, {
        status: 200,
        headers: {
          'Content-Length': '420',
          'Content-Type': 'application/pdf',
        },
      }))
    const sleep = vi.fn().mockResolvedValue(undefined)
    const storage = createBackblazeArchiveStorage(bindings, () => 1_000, sleep)

    await expect(storage.inspectObject('archives/_root/file-3/report.pdf'))
      .resolves.toEqual({ size: 420, contentType: 'application/pdf' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(250)
  })
})
