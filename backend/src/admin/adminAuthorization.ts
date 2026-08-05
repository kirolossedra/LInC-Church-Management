import type { AuthenticatedFirebaseUser } from '../types/app'
import type { FirebaseRealtimeDatabaseClient } from '../services/firebaseRealtimeDatabase.service'

export const ADMIN_HIERARCHY_PATH = ['administration', 'adminHierarchy'] as const
export const EMPTY_ADMIN_AUTHORITY = {
  manageAssessmentForms: false,
  manageCarousel: false,
  manageAttendance: false,
  manageArchives: false,
}
export const FULL_ADMIN_AUTHORITY = {
  manageAssessmentForms: true,
  manageCarousel: true,
  manageAttendance: true,
  manageArchives: true,
}

export type AdminAuthority = typeof EMPTY_ADMIN_AUTHORITY
export type AdminAccount = {
  uid: string
  email: string
  role: 'chief' | 'administrator'
  status: 'pending' | 'active' | 'suspended'
  authority: AdminAuthority
  firstSignedInAt: number
  lastSignedInAt: number
  approvedAt?: number
  approvedByUid?: string
  updatedAt?: number
}

export async function getAdminAccount(
  database: FirebaseRealtimeDatabaseClient,
  uid: string,
): Promise<AdminAccount | null> {
  const value = await database.get<unknown>([
    ...ADMIN_HIERARCHY_PATH,
    'users',
    uid,
  ])
  return normalizeAdminAccount(uid, value)
}

export async function requireAdminAuthority(
  database: FirebaseRealtimeDatabaseClient,
  user: AuthenticatedFirebaseUser,
  authority: keyof AdminAuthority,
) {
  const account = await getAdminAccount(database, user.uid)
  const allowed = account !== null && (
    account.role === 'chief' ||
    (account.status === 'active' && account.authority[authority])
  )
  return { account, allowed }
}

export function normalizeAdminAccount(
  uid: string,
  value: unknown,
): AdminAccount | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const role = record.role === 'chief' ? 'chief' : 'administrator'
  const status = record.status === 'active' || record.status === 'suspended'
    ? record.status
    : 'pending'
  const rawAuthority = record.authority && typeof record.authority === 'object'
    ? record.authority as Record<string, unknown>
    : {}
  return {
    uid,
    email: typeof record.email === 'string' ? record.email : '',
    role,
    status,
    authority: role === 'chief' ? { ...FULL_ADMIN_AUTHORITY } : {
      manageAssessmentForms: rawAuthority.manageAssessmentForms === true,
      manageCarousel: rawAuthority.manageCarousel === true,
      manageAttendance: rawAuthority.manageAttendance === true,
      manageArchives: rawAuthority.manageArchives === true,
    },
    firstSignedInAt: numberOrZero(record.firstSignedInAt),
    lastSignedInAt: numberOrZero(record.lastSignedInAt),
    approvedAt: optionalNumber(record.approvedAt),
    approvedByUid: typeof record.approvedByUid === 'string' ? record.approvedByUid : undefined,
    updatedAt: optionalNumber(record.updatedAt),
  }
}

function numberOrZero(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function optionalNumber(value: unknown) {
  const number = numberOrZero(value)
  return number > 0 ? number : undefined
}
