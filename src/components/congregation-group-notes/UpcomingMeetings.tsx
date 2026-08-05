import { CalendarDays, Users } from 'lucide-react';
import {
  formatPeopleDevelopmentMeetingTime,
  getPeopleDevelopmentMeetingRecurrenceLabel,
} from '../pastor/people-development';
import { formatMeetingOccurrenceDate } from './congregationGroupNotes.utils';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function UpcomingMeetings({ controller }: { controller: CongregationGroupNotesController }) {
  const { isAr, displayLocale, meetingSchedulesLoading, nextGroupMeeting, nextSharedMeeting } = controller;

  return (
                  <section className="overflow-hidden rounded-3xl border-2 border-[#d8aaaa] bg-[#7a1717] text-white shadow-lg shadow-[#7a1717]/10">
                    <div className="flex items-center gap-3 border-b border-white/15 px-5 py-4 sm:px-7">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                        <CalendarDays size={23} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black sm:text-2xl">
                          {isAr ? 'اجتماعاتك القادمة' : 'Your Upcoming Meetings'}
                        </h3>
                        <p className="mt-1 text-sm text-white/80">
                          {isAr
                            ? 'موعد اجتماع مجموعتك القادم، والاجتماع المشترك عند وجوده.'
                            : 'Your next group meeting and the next all-groups meeting, when scheduled.'}
                        </p>
                      </div>
                    </div>

                    {meetingSchedulesLoading ? (
                      <div className="flex items-center gap-3 px-5 py-6 sm:px-7">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>{isAr ? 'جار تحميل الاجتماعات...' : 'Loading upcoming meetings...'}</span>
                      </div>
                    ) : (
                      <div className={`grid gap-3 p-4 sm:p-5 ${nextSharedMeeting ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white/80">
                            <Users size={17} />
                            {isAr ? 'اجتماع مجموعتك القادم' : 'Your Next Group Meeting'}
                          </div>

                          {nextGroupMeeting ? (
                            <>
                              <div className="text-xl font-black">
                                {nextGroupMeeting.occurrence.title}
                              </div>
                              <div className="mt-3 space-y-1 text-sm text-white/90">
                                <div>{formatMeetingOccurrenceDate(nextGroupMeeting.occurrence.dateValue, displayLocale)}</div>
                                <div>{formatPeopleDevelopmentMeetingTime(nextGroupMeeting.occurrence.startTime, displayLocale)}</div>
                                <div className="text-white/70">
                                  {getPeopleDevelopmentMeetingRecurrenceLabel(nextGroupMeeting.schedule, displayLocale)}
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-white/80">
                              {isAr
                                ? 'لا يوجد اجتماع قادم مجدول لمجموعتك حالياً.'
                                : 'No upcoming group meeting is currently scheduled.'}
                            </p>
                          )}
                        </div>

                        {nextSharedMeeting && (
                          <div className="rounded-2xl border border-amber-200/50 bg-amber-50 p-4 text-amber-950">
                            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-800">
                              <Users size={17} />
                              {isAr ? 'الاجتماع المشترك القادم' : 'Next All-Groups Meeting'}
                            </div>
                            <div className="text-xl font-black">
                              {nextSharedMeeting.occurrence.title}
                            </div>
                            <div className="mt-3 space-y-1 text-sm text-amber-900">
                              <div>{formatMeetingOccurrenceDate(nextSharedMeeting.occurrence.dateValue, displayLocale)}</div>
                              <div>{formatPeopleDevelopmentMeetingTime(nextSharedMeeting.occurrence.startTime, displayLocale)}</div>
                              <div className="text-amber-800/80">
                                {getPeopleDevelopmentMeetingRecurrenceLabel(nextSharedMeeting.schedule, displayLocale)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
  );
}
