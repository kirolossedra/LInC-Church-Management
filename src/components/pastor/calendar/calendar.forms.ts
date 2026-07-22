import {
  eachDayOfInterval,
  format,
  parseISO,
} from 'date-fns';

import type {
  AvailabilityForm,
  UnavailabilityForm,
} from './calendar.types';

export function createInitialAvailabilityForm(
  referenceDate = new Date(),
): AvailabilityForm {
  const today = format(
    referenceDate,
    'yyyy-MM-dd',
  );

  return {
    mode: 'single',
    date: today,
    startDate: today,
    endDate: today,
    selectedWeekdays: [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
    ],
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  };
}

export function createInitialUnavailabilityForm(
  referenceDate = new Date(),
): UnavailabilityForm {
  return {
    date: format(
      referenceDate,
      'yyyy-MM-dd',
    ),
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  };
}

export function buildAvailabilityDates(
  form: AvailabilityForm,
): string[] {
  if (form.mode === 'single') {
    return form.date
      ? [form.date]
      : [];
  }

  if (
    !form.startDate ||
    !form.endDate
  ) {
    return [];
  }

  const start = parseISO(
    form.startDate,
  );

  const end = parseISO(
    form.endDate,
  );

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return [];
  }

  return eachDayOfInterval({
    start,
    end,
  })
    .filter(day =>
      form.selectedWeekdays.includes(
        day.getDay(),
      ),
    )
    .map(day =>
      format(day, 'yyyy-MM-dd'),
    );
}

export function toggleAvailabilityWeekday(
  selectedWeekdays: number[],
  weekday: number,
): number[] {
  if (
    weekday < 0 ||
    weekday > 6
  ) {
    return selectedWeekdays;
  }

  const alreadySelected =
    selectedWeekdays.includes(
      weekday,
    );

  if (alreadySelected) {
    return selectedWeekdays.filter(
      selectedDay =>
        selectedDay !== weekday,
    );
  }

  return [
    ...selectedWeekdays,
    weekday,
  ].sort(
    (first, second) =>
      first - second,
  );
}

export function isAvailabilityFormValid(
  form: AvailabilityForm,
): boolean {
  const dates =
    buildAvailabilityDates(form);

  if (dates.length === 0) {
    return false;
  }

  if (form.allDay) {
    return true;
  }

  return Boolean(
    form.startTime &&
      form.endTime &&
      form.startTime <
        form.endTime,
  );
}

export function isUnavailabilityFormValid(
  form: UnavailabilityForm,
): boolean {
  if (!form.date) {
    return false;
  }

  if (form.allDay) {
    return true;
  }

  return Boolean(
    form.startTime &&
      form.endTime &&
      form.startTime <
        form.endTime,
  );
}
