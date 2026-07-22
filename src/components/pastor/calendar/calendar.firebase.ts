import {
  onValue,
  push,
  ref,
  remove,
  update,
  type Unsubscribe,
} from 'firebase/database';

import { database } from '../../../firebase';

import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

import type {
  Availability,
  Unavailability,
} from './calendar.types';

type FirebaseErrorHandler = (error: Error) => void;

function removeId<T extends { id?: string }>(
  value: T,
): Omit<T, 'id'> {
  const { id: _id, ...data } = value;

  return data;
}

export function subscribeToMeetings(
  onData: (meetings: Meeting[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const meetingsRef = ref(database, 'meetings/');

  return onValue(
    meetingsRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const meetings = Object.entries(data)
        .map(([id, value]) => ({
          id,
          ...(value as Omit<Meeting, 'id'>),
        }))
        .sort((first, second) => {
          if (!first.date) {
            return 1;
          }

          if (!second.date) {
            return -1;
          }

          return first.date.localeCompare(second.date);
        });

      onData(meetings);
    },
    error => {
      console.error('Failed to load meetings:', error);
      onError?.(error);
    },
  );
}

export function subscribeToMeetingRequests(
  onData: (requests: MeetingRequest[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const requestsRef = ref(database, 'meetingRequests/');

  return onValue(
    requestsRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const requests = Object.entries(data)
        .map(([id, value]) => ({
          id,
          ...(value as Omit<MeetingRequest, 'id'>),
        }))
        .sort(
          (first, second) =>
            Number(first.createdAt || 0) -
            Number(second.createdAt || 0),
        );

      onData(requests);
    },
    error => {
      console.error('Failed to load meeting requests:', error);
      onError?.(error);
    },
  );
}

export function subscribeToAvailability(
  onData: (availability: Availability[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const availabilityRef = ref(database, 'availability/');

  return onValue(
    availabilityRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const availability = Object.entries(data)
        .map(([id, value]: [string, any]) => ({
          id,
          date: String(value?.date || ''),
          startTime: value?.startTime
            ? String(value.startTime)
            : undefined,
          endTime: value?.endTime
            ? String(value.endTime)
            : undefined,
          reason: value?.reason
            ? String(value.reason)
            : '',
          allDay: Boolean(value?.allDay),
        }))
        .sort((first, second) =>
          first.date.localeCompare(second.date),
        );

      onData(availability);
    },
    error => {
      console.error('Failed to load availability:', error);
      onError?.(error);
    },
  );
}

export function subscribeToUnavailability(
  onData: (unavailability: Unavailability[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const unavailabilityRef = ref(
    database,
    'unavailability/',
  );

  return onValue(
    unavailabilityRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const unavailability = Object.entries(data)
        .map(([id, value]: [string, any]) => ({
          id,
          date: String(value?.date || ''),
          startTime: value?.startTime
            ? String(value.startTime)
            : undefined,
          endTime: value?.endTime
            ? String(value.endTime)
            : undefined,
          reason: value?.reason
            ? String(value.reason)
            : '',
          allDay: Boolean(value?.allDay),
        }))
        .sort((first, second) =>
          first.date.localeCompare(second.date),
        );

      onData(unavailability);
    },
    error => {
      console.error('Failed to load unavailability:', error);
      onError?.(error);
    },
  );
}

export async function createMeeting(
  meeting: Omit<Meeting, 'id'>,
): Promise<string> {
  const meetingRef = await push(
    ref(database, 'meetings/'),
    meeting,
  );

  return meetingRef.key || '';
}

export async function updateMeeting(
  meetingId: string,
  changes: Partial<Omit<Meeting, 'id'>>,
): Promise<void> {
  await update(
    ref(database, `meetings/${meetingId}`),
    changes,
  );
}

export async function saveMeeting(
  meeting: Meeting,
): Promise<void> {
  const meetingId = meeting.id;

  if (!meetingId) {
    throw new Error(
      'Cannot save a meeting without an ID.',
    );
  }

  await update(
    ref(database, `meetings/${meetingId}`),
    removeId(meeting),
  );
}

export async function deleteMeeting(
  meetingId: string,
): Promise<void> {
  await remove(
    ref(database, `meetings/${meetingId}`),
  );
}

export async function updateMeetingRequest(
  requestId: string,
  changes: Partial<Omit<MeetingRequest, 'id'>>,
): Promise<void> {
  await update(
    ref(database, `meetingRequests/${requestId}`),
    changes,
  );
}

export async function deleteMeetingRequest(
  requestId: string,
): Promise<void> {
  await remove(
    ref(database, `meetingRequests/${requestId}`),
  );
}

export async function createAvailability(
  availability: Omit<Availability, 'id'>,
): Promise<string> {
  const availabilityRef = await push(
    ref(database, 'availability/'),
    availability,
  );

  return availabilityRef.key || '';
}

export async function updateAvailability(
  availabilityId: string,
  changes: Partial<Omit<Availability, 'id'>>,
): Promise<void> {
  await update(
    ref(database, `availability/${availabilityId}`),
    changes,
  );
}

export async function saveAvailability(
  availability: Availability,
): Promise<void> {
  await update(
    ref(database, `availability/${availability.id}`),
    removeId(availability),
  );
}

export async function deleteAvailability(
  availabilityId: string,
): Promise<void> {
  await remove(
    ref(database, `availability/${availabilityId}`),
  );
}

export async function createUnavailability(
  unavailability: Omit<Unavailability, 'id'>,
): Promise<string> {
  const unavailabilityRef = await push(
    ref(database, 'unavailability/'),
    unavailability,
  );

  return unavailabilityRef.key || '';
}

export async function updateUnavailability(
  unavailabilityId: string,
  changes: Partial<Omit<Unavailability, 'id'>>,
): Promise<void> {
  await update(
    ref(
      database,
      `unavailability/${unavailabilityId}`,
    ),
    changes,
  );
}

export async function saveUnavailability(
  unavailability: Unavailability,
): Promise<void> {
  await update(
    ref(
      database,
      `unavailability/${unavailability.id}`,
    ),
    removeId(unavailability),
  );
}

export async function deleteUnavailability(
  unavailabilityId: string,
): Promise<void> {
  await remove(
    ref(
      database,
      `unavailability/${unavailabilityId}`,
    ),
  );
}
