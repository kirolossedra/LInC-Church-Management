import { format } from 'date-fns';

import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

import {
  SLOT_BLOCK_DURATION,
  SLOT_BLOCK_END,
  SLOT_BLOCK_START,
} from './calendar.constants';

import type {
  Availability,
  Unavailability,
} from './calendar.types';

import {
  slotOverlaps,
  timeToHour,
} from './calendar.utils';

export type PastorSlotStatus =
  | 'available'
  | 'blocked'
  | 'booked'
  | 'closed';

export interface TimeRange {
  start: number;
  end: number;
}

export function getDateString(day: Date): string {
  return format(day, 'yyyy-MM-dd');
}

export function getAvailabilityBlocksForDate(
  availability: Availability[],
  date: string,
): Availability[] {
  return availability.filter(
    block => block.date === date,
  );
}

export function getUnavailabilityBlocksForDate(
  unavailability: Unavailability[],
  date: string,
): Unavailability[] {
  return unavailability.filter(
    block => block.date === date,
  );
}

export function getMeetingsForDate(
  meetings: Meeting[],
  date: string,
): Meeting[] {
  return meetings.filter(
    meeting => meeting.date === date,
  );
}

export function getPendingRequestsForDate(
  meetingRequests: MeetingRequest[],
  date: string,
): MeetingRequest[] {
  return meetingRequests.filter(
    request =>
      request.date === date &&
      request.status === 'pending',
  );
}

export function getAvailabilityRange(
  block: Availability,
): TimeRange {
  return {
    start: timeToHour(
      block.startTime || '09:00',
    ),
    end: timeToHour(
      block.endTime || '20:00',
    ),
  };
}

export function getUnavailabilityRange(
  block: Unavailability,
): TimeRange {
  return {
    start: timeToHour(
      block.startTime || '00:00',
    ),
    end: timeToHour(
      block.endTime || '23:59',
    ),
  };
}

export function isPastorSlotInsideAvailability(
  availability: Availability[],
  date: string,
  startHour: number,
  endHour: number,
): boolean {
  return getAvailabilityBlocksForDate(
    availability,
    date,
  ).some(block => {
    const range =
      getAvailabilityRange(block);

    return (
      startHour >= range.start &&
      endHour <= range.end
    );
  });
}

export function getBlockingUnavailabilityForSlot(
  unavailability: Unavailability[],
  date: string,
  startHour: number,
  endHour: number,
): Unavailability | null {
  return (
    getUnavailabilityBlocksForDate(
      unavailability,
      date,
    ).find(block => {
      const range =
        getUnavailabilityRange(block);

      return slotOverlaps(
        startHour,
        endHour,
        range.start,
        range.end,
      );
    }) || null
  );
}

export function isPastorSlotBooked(
  meetings: Meeting[],
  meetingRequests: MeetingRequest[],
  date: string,
  startHour: number,
  endHour: number,
): boolean {
  const meetingBooked =
    getMeetingsForDate(
      meetings,
      date,
    ).some(meeting => {
      if (
        !meeting.startTime ||
        !meeting.endTime
      ) {
        return false;
      }

      return slotOverlaps(
        startHour,
        endHour,
        timeToHour(meeting.startTime),
        timeToHour(meeting.endTime),
      );
    });

  const requestBooked =
    getPendingRequestsForDate(
      meetingRequests,
      date,
    ).some(request => {
      if (
        !request.startTime ||
        !request.endTime
      ) {
        return false;
      }

      return slotOverlaps(
        startHour,
        endHour,
        timeToHour(request.startTime),
        timeToHour(request.endTime),
      );
    });

  return meetingBooked || requestBooked;
}

export function getPastorSlotStatus(params: {
  day: Date;
  startHour: number;
  availability: Availability[];
  unavailability: Unavailability[];
  meetings: Meeting[];
  meetingRequests: MeetingRequest[];
}): PastorSlotStatus {
  const date = getDateString(params.day);

  const endHour =
    params.startHour +
    SLOT_BLOCK_DURATION;

  if (
    isPastorSlotBooked(
      params.meetings,
      params.meetingRequests,
      date,
      params.startHour,
      endHour,
    )
  ) {
    return 'booked';
  }

  if (
    getBlockingUnavailabilityForSlot(
      params.unavailability,
      date,
      params.startHour,
      endHour,
    )
  ) {
    return 'blocked';
  }

  if (
    isPastorSlotInsideAvailability(
      params.availability,
      date,
      params.startHour,
      endHour,
    )
  ) {
    return 'available';
  }

  return 'closed';
}

export function getPastorSlotTranslationKey(
  status: PastorSlotStatus,
): string {
  if (status === 'available') {
    return 'calendar.available';
  }

  if (status === 'blocked') {
    return 'calendar.unavailable';
  }

  if (status === 'booked') {
    return 'booking.booked';
  }

  return 'calendar.noAvailabilityOpened';
}

export function buildSlotBlockHours(): number[] {
  const numberOfSlots = Math.floor(
    (SLOT_BLOCK_END -
      SLOT_BLOCK_START) /
      SLOT_BLOCK_DURATION,
  );

  return Array.from(
    { length: numberOfSlots },
    (_, index) =>
      SLOT_BLOCK_START +
      index * SLOT_BLOCK_DURATION,
  );
}
