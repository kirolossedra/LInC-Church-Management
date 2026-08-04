export type MeetingInvitationLocale = 'en' | 'ar';

export interface MeetingInvitationRecipient {
  email: string;
  name: string;
}

export interface MeetingInvitationDetails {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetLink: string;
}

export interface SendMeetingInvitationsRequest {
  locale: MeetingInvitationLocale;
  recipients: MeetingInvitationRecipient[];
  meeting: MeetingInvitationDetails;
}

interface MeetingInvitationApiResponse {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  data?: {
    requestedCount?: number;
    sentCount?: number;
    failedCount?: number;
  };
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

export async function sendMeetingInvitationsViaBackend(
  request: SendMeetingInvitationsRequest,
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    console.error('Pastor login is required to send meeting invitations.');
    return false;
  }

  const send = async (forceRefresh: boolean) =>
    fetch(
      `${BACKEND_BASE_URL}/api/v1/meeting-invitations`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
        },
        body: JSON.stringify(request),
      },
    );

  let response: Response;

  try {
    response = await send(false);
    if (response.status === 401) response = await send(true);
  } catch (error) {
    console.error(
      'Unable to reach the LinC backend:',
      error,
    );

    return false;
  }

  let responseBody: MeetingInvitationApiResponse | null = null;

  try {
    responseBody =
      (await response.json()) as MeetingInvitationApiResponse;
  } catch {
    responseBody = null;
  }

  if (!response.ok || responseBody?.success !== true) {
    console.error(
      'The LinC backend could not send the meeting invitations:',
      {
        status: response.status,
        response: responseBody,
      },
    );

    return false;
  }

  return true;
}
import { auth } from '../firebase';
