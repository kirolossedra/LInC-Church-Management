import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import {
  ar,
  enUS,
} from 'date-fns/locale';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
} from 'lucide-react';

import type {
  PeopleDevelopmentMeetingSchedule,
} from './peopleDevelopment.types';

import {
  formatPeopleDevelopmentMeetingTime,
  getPeopleDevelopmentMeetingOccurrencesForMonth,
} from './peopleDevelopment.utils';
import { getPeopleDevelopmentMeetingColorClass } from './peopleDevelopment.constants';

export interface PeopleDevelopmentMeetingsCalendarProps {
  schedules: PeopleDevelopmentMeetingSchedule[];
  month: Date;
  locale: 'en' | 'ar';
  loading?: boolean;
  compact?: boolean;
  onMonthChange: (month: Date) => void;
  onScheduleSelect?: (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => void;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
}

function buildCalendarDays(month: Date): CalendarDay[] {
  const monthStart = startOfMonth(month);
  const calendarStart = startOfWeek(monthStart, {
    weekStartsOn: 0,
  });

  const calendarEnd = endOfWeek(
    endOfMonth(month),
    {
      weekStartsOn: 0,
    },
  );

  const days: CalendarDay[] = [];

  for (
    let day = calendarStart;
    day <= calendarEnd;
    day = addDays(day, 1)
  ) {
    days.push({
      date: day,
      dateKey: format(day, 'yyyy-MM-dd'),
      inCurrentMonth: isSameMonth(day, month),
    });
  }

  return days;
}

export default function PeopleDevelopmentMeetingsCalendar({
  schedules,
  month,
  locale,
  loading = false,
  compact = false,
  onMonthChange,
  onScheduleSelect,
}: PeopleDevelopmentMeetingsCalendarProps) {
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const days = buildCalendarDays(month);

  const occurrences =
    getPeopleDevelopmentMeetingOccurrencesForMonth(
      schedules,
      month,
      locale,
    );

  const schedulesById = new Map(
    schedules.map(schedule => [
      schedule.id,
      schedule,
    ]),
  );

  const occurrencesByDate = occurrences.reduce<
    Record<
      string,
      typeof occurrences
    >
  >((accumulator, occurrence) => {
    accumulator[occurrence.date] = [
      ...(accumulator[occurrence.date] || []),
      occurrence,
    ];

    return accumulator;
  }, {});

  const weekdayLabels = isArabic
    ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#ead9d0] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#ead9d0] bg-[#fffaf6] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7a1717] text-white">
            <CalendarDays size={22} />
          </div>

          <div>
            <h4 className="text-lg font-black text-[#7a1717]">
              {format(month, 'MMMM yyyy', {
                locale: dateLocale,
              })}
            </h4>

            <p className="text-sm text-[#6b4b4b]">
              {isArabic
                ? `${occurrences.length} اجتماع في هذا الشهر`
                : `${occurrences.length} meeting${occurrences.length === 1 ? '' : 's'} this month`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onMonthChange(
                subMonths(month, 1),
              )
            }
            className="rounded-xl border border-[#d8aaaa] bg-white p-2.5 text-[#7a1717] transition hover:bg-[#f8eeee]"
            title={isArabic ? 'الشهر السابق' : 'Previous month'}
          >
            {isArabic
              ? <ChevronRight size={19} />
              : <ChevronLeft size={19} />}
          </button>

          <button
            type="button"
            onClick={() =>
              onMonthChange(new Date())
            }
            className="rounded-xl border border-[#d8aaaa] bg-white px-4 py-2.5 text-sm font-black text-[#7a1717] transition hover:bg-[#f8eeee]"
          >
            {isArabic ? 'اليوم' : 'Today'}
          </button>

          <button
            type="button"
            onClick={() =>
              onMonthChange(
                addMonths(month, 1),
              )
            }
            className="rounded-xl border border-[#d8aaaa] bg-white p-2.5 text-[#7a1717] transition hover:bg-[#f8eeee]"
            title={isArabic ? 'الشهر التالي' : 'Next month'}
          >
            {isArabic
              ? <ChevronLeft size={19} />
              : <ChevronRight size={19} />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center p-8 text-[#7a1717]">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#7a1717]/25 border-t-[#7a1717]" />
            <p className="font-black">
              {isArabic
                ? 'جار تحميل الاجتماعات...'
                : 'Loading meetings...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-[#ead9d0] bg-stone-50">
            {weekdayLabels.map(label => (
              <div
                key={label}
                className="px-1 py-3 text-center text-[10px] font-black uppercase tracking-wide text-[#7a1717]/70 sm:text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map(day => {
              const dayOccurrences =
                occurrencesByDate[day.dateKey] || [];

              return (
                <div
                  key={day.dateKey}
                  className={`min-w-0 overflow-hidden min-h-[86px] border-b border-e border-[#f0e5df] p-1.5 sm:min-h-[118px] sm:p-2 ${
                    day.inCurrentMonth
                      ? 'bg-white'
                      : 'bg-stone-50/70 text-gray-400'
                  }`}
                >
                  <div className="mb-1 text-xs font-black sm:text-sm">
                    {format(day.date, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayOccurrences.map(occurrence => {
                      const schedule =
                        schedulesById.get(
                          occurrence.scheduleId,
                        );

                      const eventClass = getPeopleDevelopmentMeetingColorClass(
                        occurrence.group,
                        occurrence.audience,
                      );

                      const mobileEventClass = getPeopleDevelopmentMeetingColorClass(
                        occurrence.group,
                        occurrence.audience,
                        'solid',
                      );

                      const content = (
                        <>
                          <span className="block truncate font-black">
                            {compact
                              ? occurrence.audience === 'shared'
                                ? isArabic
                                  ? 'مشترك'
                                  : 'Shared'
                                : isArabic
                                  ? 'المجموعة'
                                  : 'Group'
                              : occurrence.title}
                          </span>

                          <span className="mt-0.5 flex items-center gap-1 opacity-80">
                            <Clock size={10} />
                            {formatPeopleDevelopmentMeetingTime(
                              occurrence.startTime,
                              locale,
                            )}–{formatPeopleDevelopmentMeetingTime(
                              occurrence.endTime,
                              locale,
                            )}
                          </span>
                        </>
                      );

                      if (
                        schedule &&
                        onScheduleSelect
                      ) {
                        return (
                          <button
                            key={occurrence.scheduleId}
                            type="button"
                            onClick={() =>
                              onScheduleSelect(schedule)
                            }
                            className={`pastor-group-calendar-ribbon block h-2 w-full overflow-hidden rounded-full border p-0 text-start transition hover:shadow-sm sm:h-auto sm:rounded-lg sm:px-2 sm:py-1 sm:hover:-translate-y-0.5 ${eventClass}`}
                            title={occurrence.title}
                            aria-label={`${occurrence.title}, ${formatPeopleDevelopmentMeetingTime(occurrence.startTime, locale)} to ${formatPeopleDevelopmentMeetingTime(occurrence.endTime, locale)}`}
                          >
                            <span className={`block h-full w-full sm:hidden ${mobileEventClass}`} aria-hidden="true" />
                            <span className="hidden sm:block">{content}</span>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={occurrence.scheduleId}
                          className={`pastor-group-calendar-ribbon h-2 w-full overflow-hidden rounded-full border p-0 sm:h-auto sm:rounded-lg sm:px-2 sm:py-1 ${eventClass}`}
                          title={occurrence.title}
                          aria-label={`${occurrence.title}, ${formatPeopleDevelopmentMeetingTime(occurrence.startTime, locale)} to ${formatPeopleDevelopmentMeetingTime(occurrence.endTime, locale)}`}
                        >
                          <span className={`block h-full w-full sm:hidden ${mobileEventClass}`} aria-hidden="true" />
                          <span className="hidden sm:block">{content}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {occurrences.length === 0 && (
            <div className="flex items-center justify-center gap-3 border-t border-[#ead9d0] bg-[#fffdf9] p-5 text-sm text-[#6b4b4b]">
              <Users size={18} className="text-[#7a1717]" />
              <span>
                {isArabic
                  ? 'لا توجد اجتماعات مجدولة لهذا الشهر.'
                  : 'No meetings are scheduled for this month.'}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
