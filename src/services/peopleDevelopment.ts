import { auth } from '../firebase';
import type {
  PeopleDevelopmentAttachment,
  PeopleDevelopmentEntry,
  PeopleDevelopmentGroupId,
  PeopleDevelopmentMeetingSchedule,
  PeopleDevelopmentMember,
  PeoplePersonalNote,
} from '../components/pastor/people-development/peopleDevelopment.types';

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'https://linc-backend.linc-ministry.workers.dev').replace(/\/+$/, '');
const API_ROOT = `${BACKEND_BASE_URL}/api/v1/people-development/pastor`;

export type PeopleDevelopmentMembersByKey = Record<string, PeopleDevelopmentMember>;
export interface CreatePeopleDevelopmentAssignmentInput {
  group: PeopleDevelopmentGroupId;
  groups: PeopleDevelopmentGroupId[];
  groupLabel: string;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
  hasAttachments: boolean;
  source: string;
}
export type CreatePeoplePersonalNoteInput = Omit<PeoplePersonalNote, 'id'>;
export type CreatePeopleDevelopmentMeetingScheduleInput = Omit<PeopleDevelopmentMeetingSchedule, 'id'>;
export type UpdatePeopleDevelopmentMeetingScheduleInput = Partial<Omit<PeopleDevelopmentMeetingSchedule, 'id' | 'createdAt' | 'createdAtISO'>>;

interface Snapshot {
  members: PeopleDevelopmentMembersByKey;
  assignments: PeopleDevelopmentEntry[];
  personalNotes: PeoplePersonalNote[];
  schedules: PeopleDevelopmentMeetingSchedule[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Firebase pastor login is required.');

  const send = async (forceRefresh: boolean) => fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
      Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
    },
  });

  let response = await send(false);
  if (response.status === 401) response = await send(true);
  const body = await response.json()
    .catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.error?.message || 'The People Development request failed.');
  }
  return body.data;
}

type SnapshotListener = { onData: (snapshot: Snapshot) => void; onError?: (error: Error) => void };
const listeners = new Set<SnapshotListener>();
let snapshot: Snapshot | null = null;
let pollTimer: number | null = null;
let inFlight: Promise<void> | null = null;

async function refreshSnapshot() {
  if (inFlight) return inFlight;
  inFlight = request<Snapshot>('/snapshot')
    .then(next => {
      snapshot = next;
      listeners.forEach(listener => listener.onData(next));
    })
    .catch(error => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      listeners.forEach(listener => listener.onError?.(normalized));
      throw normalized;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

function subscribe(onData: (snapshot: Snapshot) => void, onError?: (error: Error) => void) {
  const listener = { onData, onError };
  listeners.add(listener);
  if (snapshot) onData(snapshot);
  void refreshSnapshot().catch(() => undefined);
  if (pollTimer === null) {
    pollTimer = window.setInterval(() => void refreshSnapshot().catch(() => undefined), 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
      snapshot = null;
    }
  };
}

export function subscribeToPeopleDevelopmentMembers(onData: (value: PeopleDevelopmentMembersByKey) => void, onError?: (error: Error) => void) {
  return subscribe(value => onData(value.members), onError);
}
export function subscribeToPeopleDevelopmentAssignments(onData: (value: PeopleDevelopmentEntry[]) => void, onError?: (error: Error) => void) {
  return subscribe(value => onData(value.assignments), onError);
}
export function subscribeToPeoplePersonalNotes(onData: (value: PeoplePersonalNote[]) => void, onError?: (error: Error) => void) {
  return subscribe(value => onData(value.personalNotes), onError);
}
export function subscribeToPeopleDevelopmentMeetingSchedules(onData: (value: PeopleDevelopmentMeetingSchedule[]) => void, onError?: (error: Error) => void) {
  return subscribe(value => onData(value.schedules), onError);
}

async function mutate<T>(path: string, init: RequestInit): Promise<T> {
  const result = await request<T>(path, init);
  if (listeners.size > 0) await refreshSnapshot().catch(() => undefined);
  return result;
}

export async function assignPeopleDevelopmentMember(memberKey: string, input: {
  identifier: string; fullName: string; email: string; primaryGift: string;
  sourcePath: string; sourceKeys: string[]; group: PeopleDevelopmentGroupId | ''; groupLabel: string;
}) {
  await mutate(`/members/${encodeURIComponent(memberKey)}/group`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function createPeopleDevelopmentAssignment(input: CreatePeopleDevelopmentAssignmentInput) {
  const result = await mutate<{ id: string }>('/assignments', {
    method: 'POST', body: JSON.stringify({
      groups: input.groups, groupLabel: input.groupLabel, text: input.text,
      attachments: input.attachments, source: input.source,
    }),
  });
  return result.id;
}
export async function deletePeopleDevelopmentAssignment(id: string) { await mutate(`/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function replacePeopleDevelopmentAssignmentAttachments(id: string, attachments: PeopleDevelopmentAttachment[]) {
  await mutate(`/assignments/${encodeURIComponent(id)}/attachments`, { method: 'PATCH', body: JSON.stringify({ attachments }) });
}
export async function createPeoplePersonalNote(input: CreatePeoplePersonalNoteInput) {
  const result = await mutate<{ id: string }>('/personal-notes', {
    method: 'POST', body: JSON.stringify({
      identifier: input.identifier, memberKey: input.memberKey,
      fullName: input.fullName, email: input.email,
      group: input.group, groupLabel: input.groupLabel,
      type: input.type, text: input.text, source: input.source,
    }),
  });
  return result.id;
}
export async function deletePeoplePersonalNote(id: string) { await mutate(`/personal-notes/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function createPeopleDevelopmentMeetingSchedule(input: CreatePeopleDevelopmentMeetingScheduleInput) {
  const result = await mutate<{ id: string }>('/schedules', {
    method: 'POST', body: JSON.stringify({
      audience: input.audience, group: input.group,
      ordinal: input.ordinal, weekday: input.weekday,
      startTime: input.startTime, startDate: input.startDate,
      endDate: input.endDate, active: input.active,
    }),
  });
  return result.id;
}
export async function updatePeopleDevelopmentMeetingSchedule(id: string, updates: UpdatePeopleDevelopmentMeetingScheduleInput) {
  const allowedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => [
      'audience', 'group', 'ordinal', 'weekday',
      'startTime', 'startDate', 'endDate', 'active',
    ].includes(key)),
  );
  await mutate(`/schedules/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(allowedUpdates) });
}
export async function deletePeopleDevelopmentMeetingSchedule(id: string) { await mutate(`/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
