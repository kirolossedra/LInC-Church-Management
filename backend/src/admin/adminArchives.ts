import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'

export const ADMIN_ARCHIVE_FOLDERS_PATH = [
  'administration',
  'archives',
  'folders',
] as const

export const ADMIN_ARCHIVE_FILES_PATH = [
  'administration',
  'archives',
  'files',
] as const

export type AdminArchiveFolder = {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  createdByUid: string
  updatedAt: number
}

export type AdminArchiveFile = {
  id: string
  folderId: string | null
  objectKey: string
  name: string
  size: number
  contentType: string
  status: 'pending' | 'ready'
  createdAt: number
  createdByUid: string
  updatedAt: number
}

export async function listArchiveFolders(
  database: FirebaseRealtimeDatabaseClient,
): Promise<AdminArchiveFolder[]> {
  return normalizeArchiveFolders(
    await database.get<unknown>(ADMIN_ARCHIVE_FOLDERS_PATH),
  )
}

export async function createArchiveFolder({
  database,
  id,
  name,
  parentId,
  userUid,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  id: string
  name: string
  parentId: string | null
  userUid: string
  timestamp: number
}): Promise<AdminArchiveFolder> {
  const folders = await listArchiveFolders(database)

  if (parentId !== null && !folders.some(folder => folder.id === parentId)) {
    throw new AdminArchiveError(
      'ARCHIVE_PARENT_NOT_FOUND',
      'The selected parent folder no longer exists.',
      404,
    )
  }

  const normalizedName = name.trim()
  const duplicate = folders.some(folder =>
    folder.parentId === parentId &&
    folder.name.localeCompare(normalizedName, undefined, { sensitivity: 'accent' }) === 0
  )
  if (duplicate) {
    throw new AdminArchiveError(
      'ARCHIVE_FOLDER_EXISTS',
      'A folder with this name already exists in the selected location.',
      409,
    )
  }

  const folder: AdminArchiveFolder = {
    id,
    name: normalizedName,
    parentId,
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...ADMIN_ARCHIVE_FOLDERS_PATH, id], folder)
  return folder
}

export async function deleteArchiveFolder(
  database: FirebaseRealtimeDatabaseClient,
  folderId: string,
): Promise<void> {
  const folders = await listArchiveFolders(database)
  if (!folders.some(folder => folder.id === folderId)) {
    throw new AdminArchiveError(
      'ARCHIVE_FOLDER_NOT_FOUND',
      'The folder no longer exists.',
      404,
    )
  }
  if (folders.some(folder => folder.parentId === folderId)) {
    throw new AdminArchiveError(
      'ARCHIVE_FOLDER_NOT_EMPTY',
      'Remove the nested folders before deleting this folder.',
      409,
    )
  }
  const files = await listArchiveFiles(database)
  if (files.some(file => file.folderId === folderId)) {
    throw new AdminArchiveError(
      'ARCHIVE_FOLDER_NOT_EMPTY',
      'Remove the files from this folder before deleting it.',
      409,
    )
  }
  await database.delete([...ADMIN_ARCHIVE_FOLDERS_PATH, folderId])
}

export async function listArchiveFiles(
  database: FirebaseRealtimeDatabaseClient,
): Promise<AdminArchiveFile[]> {
  return normalizeArchiveFiles(
    await database.get<unknown>(ADMIN_ARCHIVE_FILES_PATH),
  )
}

export async function getArchiveFile(
  database: FirebaseRealtimeDatabaseClient,
  fileId: string,
): Promise<AdminArchiveFile | null> {
  return normalizeArchiveFile(
    fileId,
    await database.get<unknown>([...ADMIN_ARCHIVE_FILES_PATH, fileId]),
  )
}

export async function createPendingArchiveFile({
  database,
  fileId,
  folderId,
  name,
  contentType,
  declaredSize,
  userUid,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  fileId: string
  folderId: string | null
  name: string
  contentType: string
  declaredSize: number
  userUid: string
  timestamp: number
}): Promise<AdminArchiveFile> {
  if (folderId !== null) {
    const folders = await listArchiveFolders(database)
    if (!folders.some(folder => folder.id === folderId)) {
      throw new AdminArchiveError(
        'ARCHIVE_FOLDER_NOT_FOUND',
        'The selected archive folder no longer exists.',
        404,
      )
    }
  }

  const file: AdminArchiveFile = {
    id: fileId,
    folderId,
    objectKey: createArchiveObjectKey(fileId, folderId, name),
    name: name.trim(),
    size: declaredSize,
    contentType: normalizedContentType(contentType),
    status: 'pending',
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...ADMIN_ARCHIVE_FILES_PATH, fileId], file)
  return file
}

export async function completeArchiveFile({
  database,
  file,
  size,
  contentType,
  timestamp,
}: {
  database: FirebaseRealtimeDatabaseClient
  file: AdminArchiveFile
  size: number
  contentType: string
  timestamp: number
}): Promise<AdminArchiveFile> {
  const completed: AdminArchiveFile = {
    ...file,
    size,
    contentType: normalizedContentType(contentType || file.contentType),
    status: 'ready',
    updatedAt: timestamp,
  }
  await database.patch([...ADMIN_ARCHIVE_FILES_PATH, file.id], {
    size: completed.size,
    contentType: completed.contentType,
    status: completed.status,
    updatedAt: completed.updatedAt,
  })
  return completed
}

export async function deleteArchiveFileMetadata(
  database: FirebaseRealtimeDatabaseClient,
  fileId: string,
) {
  await database.delete([...ADMIN_ARCHIVE_FILES_PATH, fileId])
}

export function createArchiveObjectKey(
  fileId: string,
  folderId: string | null,
  name: string,
) {
  const safeName = name
    .trim()
    .normalize('NFKC')
    .split('')
    .map(character => hasInvalidArchiveNameCharacter(character) ? '_' : character)
    .join('')
    .replace(/\s+/g, ' ')
    .slice(0, 180) || 'file'
  return `archives/${folderId ?? '_root'}/${fileId}/${safeName}`
}

export function hasInvalidArchiveNameCharacter(value: string) {
  return [...value].some(character => {
    const code = character.charCodeAt(0)
    return character === '/' || character === '\\' || code <= 31 || code === 127
  })
}

export function normalizeArchiveFolders(value: unknown): AdminArchiveFolder[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []

  return Object.entries(value as Record<string, unknown>)
    .map(([id, folder]) => normalizeArchiveFolder(id, folder))
    .filter((folder): folder is AdminArchiveFolder => folder !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function normalizeArchiveFiles(value: unknown): AdminArchiveFile[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []

  return Object.entries(value as Record<string, unknown>)
    .map(([id, file]) => normalizeArchiveFile(id, file))
    .filter((file): file is AdminArchiveFile => file !== null)
    .sort((left, right) => right.createdAt - left.createdAt)
}

function normalizeArchiveFolder(
  id: string,
  value: unknown,
): AdminArchiveFolder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const parentId = typeof record.parentId === 'string' && record.parentId
    ? record.parentId
    : null
  if (!id || !name) return null

  return {
    id,
    name,
    parentId,
    createdAt: finiteNumber(record.createdAt),
    createdByUid: typeof record.createdByUid === 'string' ? record.createdByUid : '',
    updatedAt: finiteNumber(record.updatedAt),
  }
}

function normalizeArchiveFile(
  id: string,
  value: unknown,
): AdminArchiveFile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const objectKey = typeof record.objectKey === 'string' ? record.objectKey.trim() : ''
  const status = record.status === 'pending' || record.status === 'ready'
    ? record.status
    : null
  if (!id || !name || !objectKey || !status) return null

  return {
    id,
    folderId: typeof record.folderId === 'string' && record.folderId
      ? record.folderId
      : null,
    objectKey,
    name,
    size: Math.max(0, finiteNumber(record.size)),
    contentType: normalizedContentType(record.contentType),
    status,
    createdAt: finiteNumber(record.createdAt),
    createdByUid: typeof record.createdByUid === 'string' ? record.createdByUid : '',
    updatedAt: finiteNumber(record.updatedAt),
  }
}

function normalizedContentType(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 150)
    : 'application/octet-stream'
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export class AdminArchiveError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 404 | 409,
  ) {
    super(message)
    this.name = 'AdminArchiveError'
  }
}
