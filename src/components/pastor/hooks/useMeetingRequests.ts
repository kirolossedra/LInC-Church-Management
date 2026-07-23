import {
  useEffect,
  useState,
} from 'react';

import type {
  MeetingRequest,
} from '../../../types';

import {
  subscribeToMeetingRequests,
} from '../calendar';

import {
  findMeetingRequest,
  processMeetingRequestDecision,
  type MeetingRequestDecision,
} from '../meeting-requests';

export interface UseMeetingRequestsParams {
  translate: (
    key: string,
  ) => string;
}

export default function useMeetingRequests({
  translate,
}: UseMeetingRequestsParams) {
  const [
    meetingRequests,
    setMeetingRequests,
  ] = useState<MeetingRequest[]>([]);

  const [
    showRequests,
    setShowRequests,
  ] = useState(false);

  const [
    requestDecisionLoading,
    setRequestDecisionLoading,
  ] = useState(false);

  useEffect(
    () =>
      subscribeToMeetingRequests(
        setMeetingRequests,
      ),
    [],
  );

  const toggleRequests = () => {
    setShowRequests(
      previous => !previous,
    );
  };

  const handleRequestStatus = async (
    requestId: string,
    decision: MeetingRequestDecision,
  ) => {
    if (requestDecisionLoading) {
      return;
    }

    setRequestDecisionLoading(true);

    try {
      const request =
        findMeetingRequest(
          meetingRequests,
          requestId,
        );

      if (!request) {
        window.alert(
          translate(
            'booking.statusFailed',
          ),
        );

        return;
      }

      await processMeetingRequestDecision({
        request,
        decision,
        meetingTitle:
          translate(
            'calendar.meetingWithPastor',
          ),
      });
    } catch (error) {
      console.error(
        'Failed to process meeting request:',
        error,
      );

      window.alert(
        translate(
          'booking.statusFailed',
        ),
      );
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

export type UseMeetingRequestsResult =
  ReturnType<
    typeof useMeetingRequests
  >;
