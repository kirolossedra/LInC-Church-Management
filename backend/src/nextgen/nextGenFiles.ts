import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'

export const NEXTGEN_FILE_FOLDERS_PATH = ['nextGenPortal', 'files', 'folders'] as const
export const NEXTGEN_FILE_RECORDS_PATH = ['nextGenPortal', 'files', 'records'] as const

export type NextGenFolder = {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  createdByUid: string
  updatedAt: number
}

export type NextGenFile = {
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

export async function listNextGenFolders(database: FirebaseRealtimeDatabaseClient) {
  return normalizeFolders(await database.get(NEXTGEN_FILE_FOLDERS_PATH))
}

export async function createNextGenFolder({ database, id, name, parentId, userUid, timestamp }: {
  database: FirebaseRealtimeDatabaseClient
  id: string
  name: string
  parentId: string | null
  userUid: string
  timestamp: number
}) {
  const folders = await listNextGenFolders(database)
  if (parentId !== null && !folders.some(folder => folder.id === parentId)) {
    throw new NextGenFileError('NEXTGEN_FOLDER_PARENT_NOT_FOUND', 'The parent folder no longer exists.', 404)
  }
  const normalizedName = name.trim()
  if (folders.some(folder => folder.parentId === parentId && folder.name.localeCompare(normalizedName, undefined, { sensitivity: 'accent' }) === 0)) {
    throw new NextGenFileError('NEXTGEN_FOLDER_EXISTS', 'A folder with this name already exists here.', 409)
  }
  const folder: NextGenFolder = {
    id,
    name: normalizedName,
    parentId,
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...NEXTGEN_FILE_FOLDERS_PATH, id], folder)
  return folder
}

export async function deleteNextGenFolder(database: FirebaseRealtimeDatabaseClient, folderId: string) {
  const [folders, files] = await Promise.all([listNextGenFolders(database), listNextGenFiles(database)])
  if (!folders.some(folder => folder.id === folderId)) {
    throw new NextGenFileError('NEXTGEN_FOLDER_NOT_FOUND', 'The folder no longer exists.', 404)
  }
  if (folders.some(folder => folder.parentId === folderId) || files.some(file => file.folderId === folderId)) {
    throw new NextGenFileError('NEXTGEN_FOLDER_NOT_EMPTY', 'Remove nested folders and files first.', 409)
  }
  await database.delete([...NEXTGEN_FILE_FOLDERS_PATH, folderId])
}

export async function listNextGenFiles(database: FirebaseRealtimeDatabaseClient) {
  return normalizeFiles(await database.get(NEXTGEN_FILE_RECORDS_PATH))
}

export async function getNextGenFile(database: FirebaseRealtimeDatabaseClient, fileId: string) {
  return normalizeFile(fileId, await database.get([...NEXTGEN_FILE_RECORDS_PATH, fileId]))
}

export async function createPendingNextGenFile({ database, fileId, folderId, name, contentType, size, userUid, timestamp }: {
  database: FirebaseRealtimeDatabaseClient
  fileId: string
  folderId: string | null
  name: string
  contentType: string
  size: number
  userUid: string
  timestamp: number
}) {
  if (folderId !== null) {
    const folders = await listNextGenFolders(database)
    if (!folders.some(folder => folder.id === folderId)) {
      throw new NextGenFileError('NEXTGEN_FOLDER_NOT_FOUND', 'The selected folder no longer exists.', 404)
    }
  }
  const file: NextGenFile = {
    id: fileId,
    folderId,
    objectKey: createNextGenObjectKey(fileId, folderId, name),
    name: name.trim(),
    size,
    contentType: normalizeContentType(contentType),
    status: 'pending',
    createdAt: timestamp,
    createdByUid: userUid,
    updatedAt: timestamp,
  }
  await database.patch([...NEXTGEN_FILE_RECORDS_PATH, fileId], file)
  return file
}

export async function completeNextGenFile(database: FirebaseRealtimeDatabaseClient, file: NextGenFile, size: number, contentType: string, timestamp: number) {
  const completed: NextGenFile = {
    ...file,
    size,
    contentType: normalizeContentType(contentType || file.contentType),
    status: 'ready',
    updatedAt: timestamp,
  }
  await database.patch([...NEXTGEN_FILE_RECORDS_PATH, file.id], {
    size: completed.size,
    contentType: completed.contentType,
    status: completed.status,
    updatedAt: timestamp,
  })
  return completed
}

export async function deleteNextGenFileRecord(database: FirebaseRealtimeDatabaseClient, fileId: string) {
  await database.delete([...NEXTGEN_FILE_RECORDS_PATH, fileId])
}

export function createNextGenObjectKey(fileId: string, folderId: string | null, name: string) {
  const safeName = name.trim().normalize('NFKC').split('').map(character => {
    const code = character.charCodeAt(0)
    return character === '/' || character === '\\' || code <= 31 || code === 127 ? '_' : character
  }).join('').replace(/\s+/g, ' ').slice(0, 180) || 'file'
  return `nextgen/${folderId ?? '_root'}/${fileId}/${safeName}`
}

function normalizeFolders(value: unknown): NextGenFolder[] {
  return Object.entries(asRecord(value)).map(([id, raw]) => {
    const record = asRecord(raw)
    const name = stringValue(record.name)
    if (!id || !name) return null
    return {
      id,
      name,
      parentId: stringValue(record.parentId) || null,
      createdAt: numberValue(record.createdAt),
      createdByUid: stringValue(record.createdByUid),
      updatedAt: numberValue(record.updatedAt),
    }
  }).filter((folder): folder is NextGenFolder => folder !== null).sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeFiles(value: unknown): NextGenFile[] {
  return Object.entries(asRecord(value)).map(([id, raw]) => normalizeFile(id, raw))
    .filter((file): file is NextGenFile => file !== null).sort((a, b) => b.createdAt - a.createdAt)
}

function normalizeFile(id: string, value: unknown): NextGenFile | null {
  const record = asRecord(value)
  const name = stringValue(record.name)
  const objectKey = stringValue(record.objectKey)
  const status = record.status === 'pending' || record.status === 'ready' ? record.status : null
  if (!id || !name || !objectKey.startsWith('nextgen/') || !status) return null
  return {
    id,
    folderId: stringValue(record.folderId) || null,
    objectKey,
    name,
    size: Math.max(0, numberValue(record.size)),
    contentType: normalizeContentType(record.contentType),
    status,
    createdAt: numberValue(record.createdAt),
    createdByUid: stringValue(record.createdByUid),
    updatedAt: numberValue(record.updatedAt),
  }
}

function normalizeContentType(value: unknown) {
  return stringValue(value).slice(0, 150) || 'application/octet-stream'
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function stringValue(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : 0 }

export class NextGenFileError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: 404 | 409) {
    super(message)
    this.name = 'NextGenFileError'
  }
}
