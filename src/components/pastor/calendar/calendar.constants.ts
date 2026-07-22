import { buildTimeOptions } from './calendar.utils';

export const SLOT_BLOCK_START = 9;
export const SLOT_BLOCK_END = 20;
export const SLOT_BLOCK_DURATION = 0.5;

export const MEETING_TIME_OPTIONS = buildTimeOptions(0, 23.5);

export const BOOKING_WINDOW_TIME_OPTIONS = buildTimeOptions(
  SLOT_BLOCK_START,
  SLOT_BLOCK_END,
);

export const FULL_DAY_TIME_OPTIONS = buildTimeOptions(0, 23.5);
