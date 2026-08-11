import type { User } from 'firebase/auth';

import { auth } from '../firebase';
import type { Meeting, MeetingRequest } from '../types';
import type {
  Availability,
  Unavailability,
} from '../components/pastor/calendar/calendar.types';
import type { PeopleDevelopmentMeetingSchedule } from '../components/pastor/people-development/peopleDevelopment.types';

export interface PastorCalendarSnapshot {
  meetings: Meeting[];
  meetingRequests: MeetingRequest[];
  availability: Availability[];
  unavailability: Unavailability[];
  groupMeetingSchedules?: PeopleDevelopmentMeetingSchedule[];
  timeZone?: string;
}

export interface PastorMeetingInput {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetLink: string;
  type: Meeting['type'];
  participantIds: string[];
}

export interface PastorCalendarBlockInput {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function getPastorCalendarSnapshot(
  signal?: AbortSignal,
): Promise<PastorCalendarSnapshot> {
  return requestPastorCalendar('', { method: 'GET', signal });
}

export async function createPastorMeeting(
  meeting: PastorMeetingInput,
) {
  return requestPastorCalendar<{ id: string }>('/meetings', {
    method: 'POST',
    body: JSON.stringify(meeting),
  });
}

export async function updatePastorMeeting(
  meetingId: string,
  meeting: PastorMeetingInput,
) {
  return requestPastorCalendar<{ updated: true }>(
    `/meetings/${encodeURIComponent(meetingId)}`,
    { method: 'PATCH', body: JSON.stringify(meeting) },
  );
}

export async function deletePastorMeeting(meetingId: string) {
  return requestPastorCalendar<{
    deleted: true;
    notificationSent: boolean;
  }>(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: 'DELETE',
  });
}

export async function createPastorCalendarBlock(
  resource: 'availability' | 'unavailability',
  block: PastorCalendarBlockInput,
) {
  return requestPastorCalendar<{ id: string }>(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(block),
  });
}

export async function updatePastorCalendarBlock(
  resource: 'availability' | 'unavailability',
  blockId: string,
  block: PastorCalendarBlockInput,
) {
  return requestPastorCalendar<{ updated: true }>(
    `/${resource}/${encodeURIComponent(blockId)}`,
    { method: 'PATCH', body: JSON.stringify(block) },
  );
}

export async function deletePastorCalendarBlock(
  resource: 'availability' | 'unavailability',
  blockId: string,
) {
  return requestPastorCalendar<{ deleted: true }>(
    `/${resource}/${encodeURIComponent(blockId)}`,
    { method: 'DELETE' },
  );
}

export async function decidePastorMeetingRequest(
  requestId: string,
  decision: 'accepted' | 'rejected',
  meetingTitle: string,
) {
  return requestPastorCalendar<{
    decision: 'accepted' | 'rejected';
    meetingId?: string;
    notificationSent: boolean;
  }>(
    `/meeting-requests/${encodeURIComponent(requestId)}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({ decision, meetingTitle }),
    },
  );
}

export async function downloadPastorCalendarExport(
  start: string,
  end: string,
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Pastor login is required.');

  const send = async (forceRefresh: boolean) =>
    fetch(
      `${BACKEND_BASE_URL}/api/v1/pastor-calendar/export.ics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      {
        headers: {
          Accept: 'text/calendar',
          Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
        },
      },
    );

  let response = await send(false);
  if (response.status === 401) response = await send(true);
  if (!response.ok) {
    throw new Error('The calendar export could not be created.');
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `linc-pastor-calendar-${start}-${end}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

async function requestPastorCalendar<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Pastor login is required.');

  const send = async (forceRefresh: boolean) =>
    fetch(`${BACKEND_BASE_URL}/api/v1/pastor-calendar${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...init.headers,
        Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
      },
    });

  let response = await send(false);
  if (response.status === 401) response = await send(true);

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || body?.success !== true || !body.data) {
    throw new Error(
      body?.error?.message || 'The Pastor Calendar request failed.',
    );
  }

  return body.data;
}

export async function pastorAuthorizationHeader(
  user: User,
  forceRefresh = false,
) {
  return `Bearer ${await user.getIdToken(forceRefresh)}`;
}
