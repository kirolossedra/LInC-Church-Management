export type AssessmentFormState = 'active' | 'disabled' | 'hidden';

export interface LocalizedText {
  en?: string;
  ar?: string;
}

export interface AssessmentFormDefinition {
  id: string;
  status?: string;
  card?: {
    title?: LocalizedText;
    titleKey?: string;
  };
  page?: {
    title?: LocalizedText;
    titleKey?: string;
  };
}

export interface CarouselPhoto {
  id: string;
  url: string;
  altEn: string;
  altAr: string;
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface StoredCarouselPhoto {
  url?: unknown;
  dataUrl?: unknown;
  altEn?: unknown;
  altAr?: unknown;
  order?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PendingUpload {
  id: string;
  fileName: string;
  dataUrl: string;
  altEn: string;
  altAr: string;
}

export type AdminRole = 'chief' | 'administrator';
export type AdminStatus = 'pending' | 'active' | 'suspended';

export interface AdminAuthority {
  manageAssessmentForms: boolean;
  manageCarousel: boolean;
  manageAttendance: boolean;
  manageArchives: boolean;
  manageNextGenQa: boolean;
}

export interface AdminAccount {
  uid: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  authority: AdminAuthority;
  firstSignedInAt: number;
  lastSignedInAt: number;
  approvedAt?: number;
  approvedByUid?: string;
  updatedAt?: number;
}
