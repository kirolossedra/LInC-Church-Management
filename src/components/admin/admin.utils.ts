import {
  EMPTY_ADMIN_AUTHORITY,
  FULL_ADMIN_AUTHORITY,
} from './admin.constants';
import type {
  AdminAccount,
  AdminAuthority,
  AdminRole,
  AdminStatus,
  AssessmentFormDefinition,
  AssessmentFormState,
  CarouselPhoto,
  StoredCarouselPhoto,
} from './admin.types';

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function normalizeAdminAuthority(value: unknown): AdminAuthority {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...EMPTY_ADMIN_AUTHORITY };
  }

  const record = value as Record<string, unknown>;

  return {
    manageAssessmentForms: record.manageAssessmentForms === true,
    manageCarousel: record.manageCarousel === true,
    manageAttendance: record.manageAttendance === true,
  };
}

export function normalizeAdminAccount(
  uid: string,
  value: unknown
): AdminAccount | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  const role: AdminRole = record.role === 'chief' ? 'chief' : 'administrator';
  const status: AdminStatus =
    record.status === 'active' || record.status === 'suspended'
      ? record.status
      : 'pending';

  return {
    uid,
    email,
    role,
    status,
    authority:
      role === 'chief'
        ? { ...FULL_ADMIN_AUTHORITY }
        : normalizeAdminAuthority(record.authority),
    firstSignedInAt: normalizeNumber(record.firstSignedInAt),
    lastSignedInAt: normalizeNumber(record.lastSignedInAt),
    approvedAt: normalizeNumber(record.approvedAt) || undefined,
    approvedByUid:
      typeof record.approvedByUid === 'string'
        ? record.approvedByUid
        : undefined,
    updatedAt: normalizeNumber(record.updatedAt) || undefined,
  };
}

export function firebaseAuthenticationErrorMessage(error: unknown): string {
  const errorCode =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (
    errorCode === 'auth/invalid-credential' ||
    errorCode === 'auth/user-not-found' ||
    errorCode === 'auth/wrong-password'
  ) {
    return 'The email or password is incorrect.';
  }

  if (errorCode === 'auth/invalid-email') {
    return 'Enter a valid email address.';
  }

  if (errorCode === 'auth/user-disabled') {
    return 'This Firebase Authentication account has been disabled.';
  }

  if (errorCode === 'auth/too-many-requests') {
    return 'Too many failed attempts. Try again later.';
  }

  if (errorCode === 'auth/network-request-failed') {
    return 'The sign-in request failed because of a network problem.';
  }

  return 'Firebase Authentication could not sign you in.';
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function assessmentFormTitle(
  form: AssessmentFormDefinition,
  language: 'en' | 'ar'
): string {
  const localizedTitle = form.card?.title ?? form.page?.title;

  return (
    localizedTitle?.[language] ||
    localizedTitle?.en ||
    localizedTitle?.ar ||
    humanizeIdentifier(form.id)
  );
}

export function normalizeAssessmentFormState(
  value: unknown
): AssessmentFormState {
  if (typeof value === 'string') {
    if (value === 'disabled' || value === 'hidden') return value;
    return 'active';
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'active';
  }

  const record = value as Record<string, unknown>;
  const configuredState = record.state ?? record.status;

  if (configuredState === 'disabled' || configuredState === 'hidden') {
    return configuredState;
  }

  return 'active';
}

function normalizeStoredPhoto(
  id: string,
  value: StoredCarouselPhoto | string,
  fallbackOrder: number
): CarouselPhoto | null {
  if (typeof value === 'string') {
    if (!value.trim()) return null;

    return {
      id,
      url: value,
      altEn: '',
      altAr: '',
      order: fallbackOrder,
    };
  }

  if (!value || typeof value !== 'object') return null;

  const possibleUrl =
    typeof value.url === 'string'
      ? value.url
      : typeof value.dataUrl === 'string'
        ? value.dataUrl
        : '';

  if (!possibleUrl.trim()) return null;

  return {
    id,
    url: possibleUrl,
    altEn: typeof value.altEn === 'string' ? value.altEn : '',
    altAr: typeof value.altAr === 'string' ? value.altAr : '',
    order:
      typeof value.order === 'number' && Number.isFinite(value.order)
        ? value.order
        : fallbackOrder,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : undefined,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : undefined,
  };
}

export function parsePhotos(rawPhotos: unknown): CarouselPhoto[] {
  if (!rawPhotos) return [];

  if (Array.isArray(rawPhotos)) {
    return rawPhotos
      .map((value, index) =>
        normalizeStoredPhoto(
          String(index),
          value as StoredCarouselPhoto | string,
          index
        )
      )
      .filter((photo): photo is CarouselPhoto => photo !== null)
      .sort((a, b) => a.order - b.order);
  }

  if (typeof rawPhotos !== 'object') return [];

  return Object.entries(
    rawPhotos as Record<string, StoredCarouselPhoto | string>
  )
    .map(([id, value], index) => normalizeStoredPhoto(id, value, index))
    .filter((photo): photo is CarouselPhoto => photo !== null)
    .sort((a, b) => a.order - b.order);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('The selected image could not be read.'));
    };

    reader.onerror = () => {
      reject(new Error('The selected image could not be read.'));
    };

    reader.readAsDataURL(file);
  });
}

export function createPhotoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
