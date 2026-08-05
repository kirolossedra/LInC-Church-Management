import { AwsClient } from 'aws4fetch'

import type { BackblazeBindings } from '../types/app'

const SIGNED_URL_TTL_SECONDS = 300
const VERIFICATION_RETRY_DELAYS_MS = [250, 750, 1_500] as const

export type ArchiveStoredObject = {
  size: number
  contentType: string
}

export type ArchiveStorage = {
  createUploadUrl(objectKey: string): Promise<{ url: string; expiresAt: number }>
  createDownloadUrl(objectKey: string, fileName: string): Promise<{ url: string; expiresAt: number }>
  inspectObject(objectKey: string): Promise<ArchiveStoredObject>
  deleteObject(objectKey: string): Promise<void>
}

export function createBackblazeArchiveStorage(
  bindings: BackblazeBindings,
  now: () => number = Date.now,
  sleep: (milliseconds: number) => Promise<void> = delay,
): ArchiveStorage {
  const bucketName = requiredValue(bindings.B2_BUCKET_NAME, 'B2_BUCKET_NAME')
  const endpoint = normalizedEndpoint(bindings.B2_S3_ENDPOINT)
  const region = requiredValue(bindings.B2_REGION, 'B2_REGION')
  const accessKeyId = requiredValue(bindings.B2_APPLICATION_KEY_ID, 'B2_APPLICATION_KEY_ID')
  const secretAccessKey = requiredValue(bindings.B2_APPLICATION_KEY, 'B2_APPLICATION_KEY')
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region,
    service: 's3',
    retries: 2,
  })

  const objectUrl = (objectKey: string) => {
    const encodedKey = objectKey
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
    return `${endpoint}/${encodeURIComponent(bucketName)}/${encodedKey}`
  }

  const signedUrl = async (
    objectKey: string,
    method: 'GET' | 'PUT',
    configure?: (url: URL) => void,
  ) => {
    return storageOperation(async () => {
      const url = new URL(objectUrl(objectKey))
      url.searchParams.set('X-Amz-Expires', String(SIGNED_URL_TTL_SECONDS))
      configure?.(url)
      const request = await client.sign(url, {
        method,
        aws: { signQuery: true },
      })
      return {
        url: request.url,
        expiresAt: now() + SIGNED_URL_TTL_SECONDS * 1_000,
      }
    })
  }

  return {
    createUploadUrl: objectKey => signedUrl(objectKey, 'PUT'),
    createDownloadUrl: (objectKey, fileName) => signedUrl(
      objectKey,
      'GET',
      url => url.searchParams.set(
        'response-content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      ),
    ),
    async inspectObject(objectKey) {
      return storageOperation(async () => {
        for (let attempt = 0; attempt <= VERIFICATION_RETRY_DELAYS_MS.length; attempt += 1) {
          const response = await client.fetch(objectUrl(objectKey), { method: 'HEAD' })
          if (response.status === 404 && attempt < VERIFICATION_RETRY_DELAYS_MS.length) {
            await sleep(VERIFICATION_RETRY_DELAYS_MS[attempt])
            continue
          }
          if (response.status === 404) {
            throw new ArchiveStorageError(
              'ARCHIVE_OBJECT_NOT_FOUND',
              'The uploaded file could not be found after verification retries.',
            )
          }
          if (!response.ok) throw storageResponseError('inspect', response.status)
          const size = Number(response.headers.get('content-length'))
          if (!Number.isSafeInteger(size) || size < 0) {
            throw new ArchiveStorageError(
              'ARCHIVE_OBJECT_INVALID',
              'Archive storage returned invalid file metadata.',
            )
          }
          return {
            size,
            contentType: response.headers.get('content-type')?.trim() || 'application/octet-stream',
          }
        }
        throw new ArchiveStorageError(
          'ARCHIVE_OBJECT_NOT_FOUND',
          'The uploaded file could not be verified.',
        )
      })
    },
    async deleteObject(objectKey) {
      await storageOperation(async () => {
        const response = await client.fetch(objectUrl(objectKey), { method: 'DELETE' })
        if (!response.ok && response.status !== 404) {
          throw storageResponseError('delete', response.status)
        }
      })
    },
  }
}

function delay(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, milliseconds))
}

async function storageOperation<T>(operation: () => Promise<T>) {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ArchiveStorageError) throw error
    throw new ArchiveStorageError(
      'ARCHIVE_STORAGE_REQUEST_FAILED',
      'Backblaze archive storage could not complete the request.',
    )
  }
}

function normalizedEndpoint(value: string | undefined) {
  const endpoint = requiredValue(value, 'B2_S3_ENDPOINT').replace(/\/+$/, '')
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new ArchiveStorageError(
      'ARCHIVE_STORAGE_CONFIGURATION_INVALID',
      'The Backblaze endpoint is invalid.',
    )
  }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
    throw new ArchiveStorageError(
      'ARCHIVE_STORAGE_CONFIGURATION_INVALID',
      'The Backblaze endpoint must be an HTTPS origin.',
    )
  }
  return url.origin
}

function requiredValue(value: string | undefined, name: string) {
  const normalized = value?.trim()
  if (!normalized) {
    throw new ArchiveStorageError(
      'ARCHIVE_STORAGE_CONFIGURATION_MISSING',
      `${name} is not configured.`,
    )
  }
  return normalized
}

function storageResponseError(operation: string, status: number) {
  return new ArchiveStorageError(
    'ARCHIVE_STORAGE_REQUEST_FAILED',
    `Backblaze could not ${operation} the archive object (HTTP ${status}).`,
  )
}

export class ArchiveStorageError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ArchiveStorageError'
  }
}
