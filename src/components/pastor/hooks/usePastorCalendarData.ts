import { useCallback, useEffect, useState } from 'react';

import {
  getPastorCalendarSnapshot,
  type PastorCalendarSnapshot,
} from '../../../services/pastorCalendar';

const EMPTY_SNAPSHOT: PastorCalendarSnapshot = {
  meetings: [],
  meetingRequests: [],
  availability: [],
  unavailability: [],
};

export default function usePastorCalendarData() {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCalendar = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setSnapshot(await getPastorCalendarSnapshot());
      setError(null);
    } catch (refreshError) {
      console.error('Failed to load Pastor Calendar:', refreshError);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'The Pastor Calendar could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCalendar(true);
    const timer = window.setInterval(() => {
      void refreshCalendar();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshCalendar]);

  return {
    ...snapshot,
    calendarLoading: loading,
    calendarError: error,
    refreshCalendar,
  };
}
