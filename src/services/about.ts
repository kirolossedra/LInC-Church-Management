const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export interface AboutPersonInput {
  photoUrl: string;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface AboutPerson extends AboutPersonInput {
  id: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface AboutProfilePolish {
  roleEn: string;
  roleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export async function getPublicAboutPeople(signal?: AbortSignal): Promise<AboutPerson[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/about/people`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    data?: { people?: AboutPerson[] };
    error?: { message?: string };
  } | null;
  if (!response.ok || body?.success !== true || !Array.isArray(body.data?.people)) {
    throw new Error(body?.error?.message || 'The About Us directory could not be loaded.');
  }
  return body.data.people;
}
