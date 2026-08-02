import type { User } from 'firebase/auth';

export type MissionMapLocationType =
  | 'church'
  | 'evangelism'
  | 'servant'
  | 'home'
  | 'transit'
  | 'mall'
  | 'other';

export interface MissionMapLocation {
  id: string;
  name: string;
  type: MissionMapLocationType;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
  parking?: string;
  languages: string[];
}

export interface MissionMapConnection {
  from: string;
  to: string;
  minutes?: number;
}

export interface MissionMapData {
  locations: MissionMapLocation[];
  connections: MissionMapConnection[];
}

interface MissionMapApiResponse {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  data?: MissionMapData;
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

async function requestMissionMap(
  idToken: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(
    `${BACKEND_BASE_URL}/api/v1/nextgen/mission-map`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      signal,
    },
  );
}

export async function getNextGenMissionMap(
  user: User,
  signal?: AbortSignal,
): Promise<MissionMapData> {
  let response = await requestMissionMap(
    await user.getIdToken(),
    signal,
  );

  if (response.status === 401) {
    response = await requestMissionMap(
      await user.getIdToken(true),
      signal,
    );
  }

  let responseBody: MissionMapApiResponse | null = null;

  try {
    responseBody =
      (await response.json()) as MissionMapApiResponse;
  } catch {
    responseBody = null;
  }

  if (
    !response.ok ||
    responseBody?.success !== true ||
    !responseBody.data
  ) {
    throw new Error(
      responseBody?.error?.message ||
        'The Montréal Mission Trip map could not be loaded.',
    );
  }

  return responseBody.data;
}
