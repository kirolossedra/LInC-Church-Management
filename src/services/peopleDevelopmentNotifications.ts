import type {
  PeopleDevelopmentGroupId,
} from '../components/pastor/people-development/peopleDevelopment.types';

export interface PeopleDevelopmentNotificationRecipient {
  email: string;
  name: string;
}

export interface PeopleDevelopmentNotificationAttachment {
  name: string;
  size: number;
}

export interface SendPeopleDevelopmentNotificationRequest {
  assignmentId: string;
  groups: PeopleDevelopmentGroupId[];
  recipients: PeopleDevelopmentNotificationRecipient[];
  post: {
    text: string;
    postedAtLabel: string;
    appUrl: string;
    attachments: PeopleDevelopmentNotificationAttachment[];
  };
}

export interface PeopleDevelopmentNotificationResult {
  success: boolean;
  requestedCount: number;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  apiRequestCount: number;
  deliveryMode: 'bcc';
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

interface PeopleDevelopmentNotificationApiResponse {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  data?: {
    requestedCount?: number;
    recipientCount?: number;
    sentCount?: number;
    failedCount?: number;
    apiRequestCount?: number;
    deliveryMode?: 'bcc';
  };
}

const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL ||
  'https://linc-backend.linc-ministry.workers.dev'
).replace(/\/+$/, '');

function createFailedResult(
  requestedCount: number,
  error: {
    code: string;
    message: string;
    httpStatus?: number;
  },
): PeopleDevelopmentNotificationResult {
  return {
    success: false,
    requestedCount,
    recipientCount: requestedCount,
    sentCount: 0,
    failedCount: requestedCount,
    apiRequestCount: 0,
    deliveryMode: 'bcc',
    errorCode: error.code,
    errorMessage: error.message,
    httpStatus: error.httpStatus,
  };
}

export async function sendPeopleDevelopmentNotificationViaBackend(
  request: SendPeopleDevelopmentNotificationRequest,
): Promise<PeopleDevelopmentNotificationResult> {
  const requestedCount = request.recipients.length;
  let response: Response;

  try {
    response = await fetch(
      `${BACKEND_BASE_URL}/api/v1/people-development/notifications`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );
  } catch (error) {
    console.error(
      'Unable to reach the LinC backend for the People Development notification:',
      error,
    );

    return createFailedResult(requestedCount, {
      code: 'BACKEND_UNREACHABLE',
      message: 'The LinC backend could not be reached.',
    });
  }

  let responseBody: PeopleDevelopmentNotificationApiResponse | null = null;

  try {
    responseBody =
      (await response.json()) as PeopleDevelopmentNotificationApiResponse;
  } catch {
    responseBody = null;
  }

  const data = responseBody?.data;

  if (!response.ok || responseBody?.success !== true) {
    console.error(
      'The LinC backend could not send the People Development notification:',
      {
        status: response.status,
        response: responseBody,
      },
    );

    return {
      success: false,
      requestedCount: data?.requestedCount ?? requestedCount,
      recipientCount: data?.recipientCount ?? requestedCount,
      sentCount: data?.sentCount ?? 0,
      failedCount: data?.failedCount ?? requestedCount,
      apiRequestCount: data?.apiRequestCount ?? 1,
      deliveryMode: 'bcc',
      errorCode:
        responseBody?.error?.code ||
        'PEOPLE_DEVELOPMENT_NOTIFICATION_FAILED',
      errorMessage:
        responseBody?.error?.message ||
        'The People Development notification could not be sent.',
      httpStatus: response.status,
    };
  }

  return {
    success: true,
    requestedCount: data?.requestedCount ?? requestedCount,
    recipientCount: data?.recipientCount ?? requestedCount,
    sentCount: data?.sentCount ?? requestedCount,
    failedCount: data?.failedCount ?? 0,
    apiRequestCount: data?.apiRequestCount ?? 1,
    deliveryMode: 'bcc',
  };
}
