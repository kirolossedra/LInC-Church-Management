import { useCallback, useEffect, useRef, useState } from 'react';

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
  const snapshotSignatureRef = useRef('');
  const activelyScrollingRef = useRef(false);

  const refreshCalendar = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const nextSnapshot = await getPastorCalendarSnapshot();
      const nextSignature = JSON.stringify(nextSnapshot);
      if (nextSignature !== snapshotSignatureRef.current) {
        snapshotSignatureRef.current = nextSignature;
        setSnapshot(nextSnapshot);
      }
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

    let scrollIdleTimer: number | null = null;
    const handleScroll = () => {
      activelyScrollingRef.current = true;
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        activelyScrollingRef.current = false;
      }, 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const timer = window.setInterval(() => {
      if (!document.hidden && !activelyScrollingRef.current) {
        void refreshCalendar();
      }
    }, 30_000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
    };
  }, [refreshCalendar]);

  return {
    ...snapshot,
    calendarLoading: loading,
    calendarError: error,
    refreshCalendar,
  };
}
