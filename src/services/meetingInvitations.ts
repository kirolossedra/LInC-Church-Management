import { auth } from '../firebase';

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
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error(
      'Meeting invitations require an authenticated Firebase user.',
    );

    return false;
  }

  let firebaseIdToken: string;

  try {
    firebaseIdToken = await currentUser.getIdToken();
  } catch (error) {
    console.error(
      'Unable to obtain the Firebase authentication token:',
      error,
    );

    return false;
  }

  let response: Response;

  try {
    response = await fetch(
      `${BACKEND_BASE_URL}/api/v1/meeting-invitations`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseIdToken}`,
        },
        body: JSON.stringify(request),
      },
    );
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
