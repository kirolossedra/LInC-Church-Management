import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

import {
  createMeeting,
  sendMeetingConfirmationViaEmailJs,
  sendMeetingStatusEmailViaEmailJs,
  updateMeetingRequest,
} from '../calendar';

import type {
  MeetingRequestDecision,
  MeetingRequestDecisionResult,
} from './meetingRequests.types';

import {
  buildMeetingFromRequest,
  getMeetingRequestDerivedDetails,
  getMeetingRequestId,
} from './meetingRequests.utils';

export interface ProcessMeetingRequestDecisionParams {
  request: MeetingRequest;
  decision: MeetingRequestDecision;
  meetingTitle: string;
}

async function rejectMeetingRequest(
  request: MeetingRequest,
): Promise<MeetingRequestDecisionResult> {
  const requestId =
    getMeetingRequestId(request);

  if (!requestId) {
    throw new Error(
      'Meeting request ID is missing.',
    );
  }

  const details =
    getMeetingRequestDerivedDetails(
      request,
    );

  let notificationSent = false;

  if (details.requesterEmail) {
    await sendMeetingStatusEmailViaEmailJs({
      kind: 'rejection',
      recipientEmail:
        details.requesterEmail,
      name: details.requesterName,
      date: details.meetingDate,
      startTime: details.startTime,
      endTime: details.endTime,
      location: '',
      requesterLocale:
        details.requesterLocale,
      sourceId: requestId,
    });

    notificationSent = true;
  }

  const updatedAt = Date.now();

  await updateMeetingRequest(
    requestId,
    {
      status: 'rejected',
      rejectionEmailSent:
        notificationSent,
      rejectionEmailSentUsing:
        notificationSent
          ? 'EmailJS'
          : null,
      rejectionEmailSentAt:
        notificationSent
          ? updatedAt
          : null,
      updatedAt,
    } as Partial<
      Omit<MeetingRequest, 'id'>
    >,
  );

  return {
    request,
    decision: 'rejected',
    notificationSent,
  };
}

async function acceptMeetingRequest(
  request: MeetingRequest,
  meetingTitle: string,
): Promise<MeetingRequestDecisionResult> {
  const requestId =
    getMeetingRequestId(request);

  if (!requestId) {
    throw new Error(
      'Meeting request ID is missing.',
    );
  }

  const confirmationTimestamp =
    Date.now();

  const meetingData =
    buildMeetingFromRequest({
      request,
      requestId,
      meetingTitle,
      timestamp:
        confirmationTimestamp,
    });

  await sendMeetingConfirmationViaEmailJs(
    meetingData as Meeting,
    meetingTitle,
  );

  const createdMeetingId =
    await createMeeting(meetingData);

  const updatedAt = Date.now();

  await updateMeetingRequest(
    requestId,
    {
      status: 'accepted',
      confirmationSent: true,
      confirmationSentUsing:
        'EmailJS',
      confirmationSentAt:
        confirmationTimestamp,
      createdMeetingId,
      updatedAt,
    } as Partial<
      Omit<MeetingRequest, 'id'>
    >,
  );

  const createdMeeting: Meeting = {
    id: createdMeetingId,
    ...meetingData,
  } as Meeting;

  return {
    request,
    decision: 'accepted',
    createdMeeting,
    notificationSent: true,
  };
}

export async function processMeetingRequestDecision(
  params: ProcessMeetingRequestDecisionParams,
): Promise<MeetingRequestDecisionResult> {
  if (params.decision === 'rejected') {
    return rejectMeetingRequest(
      params.request,
    );
  }

  return acceptMeetingRequest(
    params.request,
    params.meetingTitle,
  );
}
