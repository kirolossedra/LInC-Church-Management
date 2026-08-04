export interface PublicBookingScheduleBlock {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PublicBookingSchedule {
  availability: PublicBookingScheduleBlock[];
  busy: PublicBookingScheduleBlock[];
}

export interface CreatePublicBookingRequest {
  name: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  requesterLocale: 'en' | 'ar';
  website?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

export class BookingApiError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(
    message: string,
    code: string | null,
    status: number,
  ) {
    super(message);
    this.name = 'BookingApiError';
    this.code = code;
    this.status = status;
  }
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function getPublicBookingSchedule(
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<PublicBookingSchedule> {
  const query = new URLSearchParams({ start, end });
  return requestBooking<PublicBookingSchedule>(
    `/schedule?${query.toString()}`,
    { method: 'GET', signal },
  );
}

export async function createPublicBooking(
  request: CreatePublicBookingRequest,
): Promise<{ id: string; status: 'pending' }> {
  return requestBooking('/requests', {
    method: 'POST',
    body: JSON.stringify({
      ...request,
      website: request.website || '',
    }),
  });
}

async function requestBooking<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(
      `${BACKEND_BASE_URL}/api/v1/booking${path}`,
      {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw error;
    }

    throw new BookingApiError(
      'The booking service could not be reached.',
      'BOOKING_NETWORK_ERROR',
      0,
    );
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || body?.success !== true || !body.data) {
    throw new BookingApiError(
      body?.error?.message || 'The booking request failed.',
      body?.error?.code || null,
      response.status,
    );
  }

  return body.data;
}
