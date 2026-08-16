import type { PeopleDevelopmentMeetingSchedule } from '../components/pastor/people-development/peopleDevelopment.types';
import type { GroupAssignment, MemberProfile } from '../components/congregation-group-notes/congregationGroupNotes.types';
import { auth } from '../firebase';

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

export async function getCongregationGroupAccess(signal?: AbortSignal) {
  const user = auth.currentUser;
  if (!user) throw new Error('Firebase login is required.');
  const send = async (refresh: boolean) => fetch(`${BACKEND_BASE_URL}/api/v1/people-development/portal`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${await user.getIdToken(refresh)}`,
    },
    signal,
  });
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  const body = await response.json().catch(() => null) as PortalResponse | null;
  if (!response.ok || body?.success !== true || !body.data) {
    throw new Error(body?.error?.message || 'The group access request failed.');
  }
  return body.data;
}
