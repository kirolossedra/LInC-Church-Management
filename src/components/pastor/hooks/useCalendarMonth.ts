import {
  useMemo,
  useState,
} from 'react';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns';

import {
  ar,
  enUS,
} from 'date-fns/locale';

type DisplayLocale = 'en' | 'ar';

export interface UseCalendarMonthParams {
  locale: DisplayLocale;
}

export default function useCalendarMonth({
  locale,
}: UseCalendarMonthParams) {
  const [
    currentDate,
    setCurrentDate,
  ] = useState(new Date());

  const dateLocale =
    locale === 'ar'
      ? ar
      : enUS;

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start:
          startOfMonth(
            currentDate,
          ),
        end:
          endOfMonth(
            currentDate,
          ),
      }),
    [currentDate],
  );

  const monthLabel =
    useMemo(
      () =>
        format(
          currentDate,
          'MMMM yyyy',
          {
            locale:
              dateLocale,
          },
        ),
      [
        currentDate,
        dateLocale,
      ],
    );

  const monthStartPadding =
    useMemo(
      () =>
        startOfMonth(
          currentDate,
        ).getDay(),
      [currentDate],
    );

  const goToPreviousMonth = () => {
    setCurrentDate(
      previous =>
        subMonths(
          previous,
          1,
        ),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      previous =>
        addMonths(
          previous,
          1,
        ),
    );
  };

  const goToToday = () => {
    setCurrentDate(
      new Date(),
    );
  };

  return {
    currentDate,
    setCurrentDate,
    dateLocale,
    days,
    monthLabel,
    monthStartPadding,

    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  };
}

export type UseCalendarMonthResult =
  ReturnType<
    typeof useCalendarMonth
  >;
