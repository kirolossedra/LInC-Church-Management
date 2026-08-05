import type { PeopleDevelopmentMeetingSchedule } from '../components/pastor/people-development/peopleDevelopment.types';
import type { GroupAssignment, MemberProfile } from '../components/congregation-group-notes/congregationGroupNotes.types';

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'https://linc-backend.linc-ministry.workers.dev').replace(/\/+$/, '');

interface PortalResponse {
  success: boolean;
  data?: {
    profile: MemberProfile;
    assignments: GroupAssignment[];
    schedules: PeopleDevelopmentMeetingSchedule[];
  };
  error?: { message?: string };
}

export async function getCongregationGroupAccess(identifier: string, signal?: AbortSignal) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/people-development/portal`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
    signal,
  });
  const body = await response.json().catch(() => null) as PortalResponse | null;
  if (!response.ok || body?.success !== true || !body.data) {
    throw new Error(body?.error?.message || 'The group access request failed.');
  }
  return body.data;
}
