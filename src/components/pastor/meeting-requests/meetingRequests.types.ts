import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

export type MeetingRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected';

export type MeetingRequestDecision =
  | 'accepted'
  | 'rejected';

export type MeetingRequesterLocale =
  | 'en'
  | 'ar';

export interface MeetingRequestDecisionParams {
  requestId: string;
  decision: MeetingRequestDecision;
}

export interface MeetingRequestDecisionResult {
  request: MeetingRequest;
  decision: MeetingRequestDecision;
  createdMeeting?: Meeting;
  notificationSent: boolean;
}

export interface MeetingRequestStatusUpdate {
  status: MeetingRequestStatus;
  updatedAt: number;
  updatedAtISO: string;
}

export interface MeetingRequestRejectionUpdate
  extends MeetingRequestStatusUpdate {
  status: 'rejected';
  rejectionEmailSent: boolean;
  rejectionEmailSentUsing: 'EmailJS' | null;
  rejectionEmailSentAt: number | null;
  rejectionEmailSentAtISO: string | null;
}

export interface MeetingRequestAcceptanceUpdate
  extends MeetingRequestStatusUpdate {
  status: 'accepted';
  acceptedAt: number;
  acceptedAtISO: string;
  createdMeetingId: string;
  confirmationEmailSent: boolean;
  confirmationEmailSentUsing: 'EmailJS' | null;
  confirmationEmailSentAt: number | null;
  confirmationEmailSentAtISO: string | null;
}

export interface MeetingRequestDerivedDetails {
  requesterLocale: MeetingRequesterLocale;
  requesterName: string;
  requesterEmail: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface MeetingRequestSectionProps {
  meetingRequests: MeetingRequest[];
  expanded: boolean;
  loading: boolean;
  locale: MeetingRequesterLocale;
  onToggleExpanded: () => void;
  onDecision: (
    requestId: string,
    decision: MeetingRequestDecision,
  ) => Promise<void> | void;
}
