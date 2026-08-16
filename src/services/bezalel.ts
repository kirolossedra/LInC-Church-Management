import { auth } from '../firebase';
import type { CreatePublicBookingRequest } from './booking';

export type BezalelMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PastorBezalelAction =
  | 'none'
  | 'open_availability'
  | 'block_time'
  | 'delete_availability'
  | 'delete_unavailability'
  | 'accept_request'
  | 'reject_request'
  | 'create_group_schedule'
  | 'update_group_schedule'
  | 'set_group_schedule_active'
  | 'delete_group_schedule';

export interface PastorBezalelCalendarAction {
  action: Exclude<PastorBezalelAction, 'none'>;
  date: string;
  startTime: string;
  endTime: string;
  targetId: string;
  reason: string;
  meetingTitle: string;
  audience: 'group' | 'shared';
  group: string;
  ordinal: 1 | 2 | 3 | 4 | 'last';
  weekday: number;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface PastorBezalelResult {
  reply: string;
  focusDates: string[];
  actions: PastorBezalelCalendarAction[];
}

export interface BookingBezalelResult {
  reply: string;
  stage: 'answer' | 'collect' | 'ready_to_book';
  focusDate: string;
  suggestions: Array<{ date: string; startTime: string; endTime: string }>;
  booking: Omit<CreatePublicBookingRequest, 'requesterLocale'>;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function chatWithPastorBezalel(
  messages: BezalelMessage[],
  locale: 'en' | 'ar',
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Pastor login is required.');
  const send = async (refresh: boolean) => fetch(`${BACKEND_BASE_URL}/api/v1/bezalel/pastor/chat`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken(refresh)}`,
    },
    body: JSON.stringify({ messages: messages.slice(-12), locale }),
  });
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  return parseResponse<PastorBezalelResult>(response);
}

export async function chatWithBookingBezalel(
  messages: BezalelMessage[],
  locale: 'en' | 'ar',
) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/bezalel/booking/chat`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.slice(-12), locale }),
  });
  return parseResponse<BookingBezalelResult>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.error?.message || 'Bezalel is temporarily unavailable.');
  }
  return body.data;
}
