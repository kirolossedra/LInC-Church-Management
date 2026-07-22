import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

import type {
  MeetingRequestDerivedDetails,
  MeetingRequesterLocale,
} from './meetingRequests.types';

export function normalizeMeetingRequesterLocale(
  value: unknown,
): MeetingRequesterLocale {
  return String(value || '')
    .trim()
    .toLowerCase() === 'ar'
    ? 'ar'
    : 'en';
}

export function getMeetingRequestId(
  request: MeetingRequest,
): string {
  return String(request.id || '').trim();
}

export function getMeetingRequestDerivedDetails(
  request: MeetingRequest,
): MeetingRequestDerivedDetails {
  const rawRequest = request as MeetingRequest & {
    requesterLocale?: string;
  };

  return {
    requesterLocale:
      normalizeMeetingRequesterLocale(
        rawRequest.requesterLocale,
      ),
    requesterName: String(
      request.name || '',
    ).trim(),
    requesterEmail: String(
      request.email || '',
    ).trim(),
    meetingDate: String(
      request.date || '',
    ).trim(),
    startTime: String(
      request.startTime || '',
    ).trim(),
    endTime: String(
      request.endTime || '',
    ).trim(),
    reason: String(
      request.reason || '',
    ).trim(),
  };
}

export function getPendingMeetingRequests(
  meetingRequests: MeetingRequest[],
): MeetingRequest[] {
  return meetingRequests
    .filter(
      request =>
        String(request.status || '')
          .trim()
          .toLowerCase() === 'pending',
    )
    .sort((first, second) => {
      const firstDate = String(
        first.date || '',
      );

      const secondDate = String(
        second.date || '',
      );

      if (firstDate !== secondDate) {
        return firstDate.localeCompare(
          secondDate,
        );
      }

      return String(
        first.startTime || '',
      ).localeCompare(
        String(second.startTime || ''),
      );
    });
}

export function findMeetingRequest(
  meetingRequests: MeetingRequest[],
  requestId: string,
): MeetingRequest | null {
  return (
    meetingRequests.find(
      request =>
        getMeetingRequestId(request) ===
        requestId,
    ) || null
  );
}

export function buildMeetingFromRequest(params: {
  request: MeetingRequest;
  requestId: string;
  meetingTitle: string;
  timestamp?: number;
}): Omit<Meeting, 'id'> {
  const {
    request,
    requestId,
    meetingTitle,
  } = params;

  const timestamp =
    params.timestamp ?? Date.now();

  const details =
    getMeetingRequestDerivedDetails(
      request,
    );

  const rawRequest =
    request as MeetingRequest & {
      requesterLanguage?: string;
    };

  return {
    title: meetingTitle,
    description: '',
    date: details.meetingDate,
    startTime: details.startTime,
    endTime: details.endTime,
    location: '',
    meetLink: '',
    type: 'counseling',
    participantIds: [],
    requestName:
      details.requesterName,
    requestEmail:
      details.requesterEmail,
    requestReason: details.reason,
    requesterLocale:
      details.requesterLocale,
    requesterLanguage:
      rawRequest.requesterLanguage ||
      (details.requesterLocale === 'ar'
        ? 'Arabic'
        : 'English'),
    sourceRequestId: requestId,
    acknowledged: true,
    acknowledgedAt: timestamp,
    acknowledgedEmail:
      details.requesterEmail,
    confirmationSentUsing:
      'EmailJS',
    updatedAt: timestamp,
  } as Omit<Meeting, 'id'>;
}

export function requestHasUsableEmail(
  request: MeetingRequest,
): boolean {
  const email = String(
    request.email || '',
  ).trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

export function getMeetingRequestCount(
  meetingRequests: MeetingRequest[],
): number {
  return getPendingMeetingRequests(
    meetingRequests,
  ).length;
}
