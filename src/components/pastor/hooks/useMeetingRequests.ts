import { useState } from 'react';

import type { MeetingRequest } from '../../../types';
import { decidePastorMeetingRequest } from '../../../services/pastorCalendar';
import type { MeetingRequestDecision } from '../meeting-requests';

export interface UseMeetingRequestsParams {
  translate: (key: string) => string;
  meetingRequests: MeetingRequest[];
  refreshCalendar: () => Promise<void>;
}

export default function useMeetingRequests({
  translate,
  meetingRequests,
  refreshCalendar,
}: UseMeetingRequestsParams) {
  const [showRequests, setShowRequests] = useState(false);
  const [requestDecisionLoading, setRequestDecisionLoading] =
    useState(false);

  const toggleRequests = () => {
    setShowRequests(previous => !previous);
  };

  const handleRequestStatus = async (
    requestId: string,
    decision: MeetingRequestDecision,
  ) => {
    if (requestDecisionLoading) return;
    setRequestDecisionLoading(true);

    try {
      await decidePastorMeetingRequest(
        requestId,
        decision,
        translate('calendar.meetingWithPastor'),
      );
      await refreshCalendar();
    } catch (error) {
      console.error('Failed to process meeting request:', error);
      window.alert(translate('booking.statusFailed'));
    } finally {
      setRequestDecisionLoading(false);
    }
  };

  return {
    meetingRequests,
    showRequests,
    setShowRequests,
    requestDecisionLoading,
    toggleRequests,
    handleRequestStatus,
  };
}

export type UseMeetingRequestsResult = ReturnType<
  typeof useMeetingRequests
>;
