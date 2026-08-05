import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'

export const ADMIN_ARCHIVE_FOLDERS_PATH = [
  'administration',
  'archives',
  'folders',
] as const

export type AdminArchiveFolder = {
  id: string
  name: string
  parentId: string | null
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
  await database.delete([...ADMIN_ARCHIVE_FOLDERS_PATH, folderId])
}

export function normalizeArchiveFolders(value: unknown): AdminArchiveFolder[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []

  return Object.entries(value as Record<string, unknown>)
    .map(([id, folder]) => normalizeArchiveFolder(id, folder))
    .filter((folder): folder is AdminArchiveFolder => folder !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
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
