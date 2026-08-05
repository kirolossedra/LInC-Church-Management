import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PeopleDevelopmentMeetingsCalendar } from '../pastor/people-development';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function MeetingCalendarPanel({ controller }: { controller: CongregationGroupNotesController }) {
  const {
    isAr,
    displayLocale,
    meetingSchedules,
    meetingSchedulesLoading,
    meetingCalendarMonth,
    setMeetingCalendarMonth,
    isMeetingCalendarExpanded,
    setIsMeetingCalendarExpanded,
  } = controller;

  return (
                  <section className="overflow-hidden rounded-3xl border border-[#ead9d0] bg-[#fffdf9] shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsMeetingCalendarExpanded(current => !current)}
                      aria-expanded={isMeetingCalendarExpanded}
                      className="flex w-full flex-col gap-4 p-5 text-start transition-colors hover:bg-[#fffaf6] sm:flex-row sm:items-center sm:justify-between sm:p-7"
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2 text-[#7a1717]">
                          <Clock size={20} />
                          <h3 className="text-2xl font-black">
                            {isAr
                              ? 'تقويم اجتماعات مجموعتك'
                              : 'Your Group Meetings Calendar'}
                          </h3>
                        </div>
                        <p className="text-[#6b4b4b]">
                          {isAr
                            ? 'يعرض اجتماعات مجموعتك والاجتماعات المشتركة لكل المجموعات.'
                            : 'Shows meetings for your assigned group and shared meetings for all groups.'}
                        </p>
                      </div>

                      <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#d8aaaa] bg-[#f8eeee] px-4 py-3 text-sm font-black text-[#7a1717]">
                        {isMeetingCalendarExpanded
                          ? (isAr ? 'إخفاء التقويم' : 'Hide Calendar')
                          : (isAr ? 'عرض التقويم' : 'Show Calendar')}
                        {isMeetingCalendarExpanded
                          ? <ChevronUp size={18} />
                          : <ChevronDown size={18} />}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isMeetingCalendarExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#ead9d0] p-5 sm:p-7">
                            <PeopleDevelopmentMeetingsCalendar
                              schedules={meetingSchedules}
                              month={meetingCalendarMonth}
                              locale={displayLocale}
                              loading={meetingSchedulesLoading}
                              compact
                              onMonthChange={setMeetingCalendarMonth}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
  );
}

