import type {
  FormEvent,
} from 'react';

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import {
  PEOPLE_DEVELOPMENT_GROUPS,
  PEOPLE_DEVELOPMENT_MEETING_ORDINALS,
  PEOPLE_DEVELOPMENT_MEETING_WEEKDAYS,
} from './peopleDevelopment.constants';

import PeopleDevelopmentMeetingsCalendar from './PeopleDevelopmentMeetingsCalendar';

import type {
  PeopleDevelopmentGroupId,
  PeopleDevelopmentMeetingAudience,
  PeopleDevelopmentMeetingOrdinal,
  PeopleDevelopmentMeetingSchedule,
  PeopleDevelopmentMeetingScheduleDraft,
  PeopleDevelopmentMeetingWeekday,
} from './peopleDevelopment.types';

import {
  formatPeopleDevelopmentMeetingTime,
  getNextPeopleDevelopmentMeetingOccurrence,
  getPeopleDevelopmentMeetingRecurrenceLabel,
  getPeopleDevelopmentMeetingScheduleTitle,
} from './peopleDevelopment.utils';

export interface PeopleDevelopmentMeetingSchedulesSectionProps {
  expanded: boolean;
  locale: 'en' | 'ar';
  schedules: PeopleDevelopmentMeetingSchedule[];
  loading: boolean;
  saving: boolean;
  deletingId: string | null;
  editingId: string | null;
  draft: PeopleDevelopmentMeetingScheduleDraft;
  month: Date;
  onToggleExpanded: () => void;
  onMonthChange: (month: Date) => void;
  onDraftChange: <K extends keyof PeopleDevelopmentMeetingScheduleDraft>(
    field: K,
    value: PeopleDevelopmentMeetingScheduleDraft[K],
  ) => void;
  onStartCreate: () => void;
  onStartEdit: (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => void;
  onCancelEdit: () => void;
  onSave: () => Promise<void> | void;
  onDelete: (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => Promise<void> | void;
  onToggleActive: (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => Promise<void> | void;
}

function formatOccurrenceDate(
  date: Date,
  locale: 'en' | 'ar',
): string {
  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-EG' : 'en-CA',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date);
}

export default function PeopleDevelopmentMeetingSchedulesSection({
  expanded,
  locale,
  schedules,
  loading,
  saving,
  deletingId,
  editingId,
  draft,
  month,
  onToggleExpanded,
  onMonthChange,
  onDraftChange,
  onStartCreate,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggleActive,
}: PeopleDevelopmentMeetingSchedulesSectionProps) {
  const isArabic = locale === 'ar';

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    void onSave();
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#d8aaaa] bg-[#fffdf9] shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between gap-4 bg-[#f8eeee] p-5 text-start transition hover:bg-[#efd8d8] sm:p-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7a1717] text-white">
            <CalendarDays size={24} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-[#7a1717] sm:text-2xl">
                {isArabic
                  ? 'اجتماعات مجموعات التلمذة'
                  : 'Discipleship Group Meetings'}
              </h3>

              <span className="rounded-full border border-[#d8aaaa] bg-white px-2.5 py-1 text-xs font-black text-[#7a1717]">
                {schedules.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-[#6b4b4b]">
              {isArabic
                ? 'إدارة الأنماط الشهرية لاجتماعات المجموعات والاجتماعات المشتركة.'
                : 'Manage monthly recurring group meetings and shared meetings.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-[#d8aaaa] bg-white p-2 text-[#7a1717]">
          {expanded
            ? <ChevronUp size={20} />
            : <ChevronDown size={20} />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xl font-black text-[#7a1717]">
                {editingId
                  ? isArabic
                    ? 'تعديل جدول الاجتماع'
                    : 'Edit Meeting Schedule'
                  : isArabic
                    ? 'إضافة جدول اجتماع'
                    : 'Add Meeting Schedule'}
              </h4>

              <p className="mt-1 text-sm text-[#6b4b4b]">
                {isArabic
                  ? 'يتم إنشاء عنوان الاجتماع تلقائياً حسب الجمهور المحدد.'
                  : 'The meeting title is generated automatically from the selected audience.'}
              </p>
            </div>

            {!editingId && (
              <button
                type="button"
                onClick={onStartCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8aaaa] bg-white px-4 py-2.5 text-sm font-black text-[#7a1717] transition hover:bg-[#f8eeee]"
              >
                <RefreshCw size={16} />
                {isArabic
                  ? 'إعادة ضبط النموذج'
                  : 'Reset Form'}
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-[#ead9d0] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'نوع الاجتماع' : 'Meeting Audience'}
                </span>

                <select
                  value={draft.audience}
                  onChange={event =>
                    onDraftChange(
                      'audience',
                      event.target.value as PeopleDevelopmentMeetingAudience,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                >
                  <option value="group">
                    {isArabic
                      ? 'اجتماع مجموعة'
                      : 'Group Meeting'}
                  </option>
                  <option value="shared">
                    {isArabic
                      ? 'اجتماع مشترك للجميع'
                      : 'Shared Meeting for Everyone'}
                  </option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'المجموعة' : 'Group'}
                </span>

                <select
                  value={draft.group}
                  disabled={draft.audience === 'shared'}
                  required={draft.audience === 'group'}
                  onChange={event =>
                    onDraftChange(
                      'group',
                      event.target.value as PeopleDevelopmentGroupId,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-gray-400"
                >
                  <option value="">
                    {draft.audience === 'shared'
                      ? isArabic
                        ? 'كل المجموعات'
                        : 'All Groups'
                      : isArabic
                        ? 'اختر مجموعة'
                        : 'Select a group'}
                  </option>

                  {PEOPLE_DEVELOPMENT_GROUPS.map(group => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {isArabic
                        ? group.labelAr
                        : group.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'ترتيب الأسبوع' : 'Monthly Ordinal'}
                </span>

                <select
                  value={draft.ordinal}
                  onChange={event => {
                    const value = event.target.value;

                    onDraftChange(
                      'ordinal',
                      (
                        value === 'last'
                          ? 'last'
                          : Number(value)
                      ) as PeopleDevelopmentMeetingOrdinal,
                    );
                  }}
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                >
                  {PEOPLE_DEVELOPMENT_MEETING_ORDINALS.map(item => (
                    <option
                      key={String(item.value)}
                      value={item.value}
                    >
                      {isArabic
                        ? item.labelAr
                        : item.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'يوم الأسبوع' : 'Weekday'}
                </span>

                <select
                  value={draft.weekday}
                  onChange={event =>
                    onDraftChange(
                      'weekday',
                      Number(event.target.value) as PeopleDevelopmentMeetingWeekday,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                >
                  {PEOPLE_DEVELOPMENT_MEETING_WEEKDAYS.map(item => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {isArabic
                        ? item.labelAr
                        : item.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'وقت الاجتماع' : 'Meeting Time'}
                </span>

                <input
                  type="time"
                  required
                  value={draft.startTime}
                  onChange={event =>
                    onDraftChange(
                      'startTime',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'مدة الاجتماع بالدقائق' : 'Duration (minutes)'}
                </span>

                <input
                  type="number"
                  min={30}
                  max={480}
                  step={15}
                  required
                  value={draft.durationMinutes}
                  onChange={event => onDraftChange('durationMinutes', Number(event.target.value))}
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic ? 'يبدأ من' : 'Effective From'}
                </span>

                <input
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={event =>
                    onDraftChange(
                      'startDate',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[#7a1717]">
                  {isArabic
                    ? 'ينتهي في (اختياري)'
                    : 'Ends On (Optional)'}
                </span>

                <input
                  type="date"
                  min={draft.startDate}
                  value={draft.endDate}
                  onChange={event =>
                    onDraftChange(
                      'endDate',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border-2 border-[#ead9d0] bg-white px-3 py-3 text-[#2b1717] outline-none focus:border-[#7a1717]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border-2 border-[#ead9d0] bg-[#fffaf6] px-4 py-3">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={event =>
                    onDraftChange(
                      'active',
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-[#7a1717]"
                />

                <span>
                  <span className="block text-sm font-black text-[#7a1717]">
                    {isArabic ? 'الجدول نشط' : 'Schedule Active'}
                  </span>
                  <span className="block text-xs text-[#6b4b4b]">
                    {isArabic
                      ? 'يظهر في التقويم للمجموعة.'
                      : 'Visible in the group calendar.'}
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-[#d8aaaa] bg-[#f8eeee] p-4 text-[#7a1717]">
              <div className="flex items-start gap-3">
                <CalendarDays
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <div className="font-black">
                    {getPeopleDevelopmentMeetingScheduleTitle(
                      {
                        audience: draft.audience,
                        group: draft.group,
                      },
                      locale,
                    )}
                  </div>

                  <div className="mt-1 text-sm opacity-80">
                    {getPeopleDevelopmentMeetingRecurrenceLabel(
                      {
                        ordinal: draft.ordinal,
                        weekday: draft.weekday,
                      },
                      locale,
                    )}
                    {' · '}
                    {formatPeopleDevelopmentMeetingTime(
                      draft.startTime,
                      locale,
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {editingId && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <X size={17} />
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1717] px-6 py-3 font-black text-white shadow-sm transition hover:bg-[#5e1010] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {isArabic ? 'جار الحفظ...' : 'Saving...'}
                  </>
                ) : editingId ? (
                  <>
                    <Check size={17} />
                    {isArabic
                      ? 'تحديث الاجتماع'
                      : 'Update Meeting'}
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    {isArabic
                      ? 'إنشاء الاجتماع'
                      : 'Create Meeting'}
                  </>
                )}
              </button>
            </div>
          </form>

          <PeopleDevelopmentMeetingsCalendar
            schedules={schedules}
            month={month}
            locale={locale}
            loading={loading}
            onMonthChange={onMonthChange}
            onScheduleSelect={onStartEdit}
          />

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xl font-black text-[#7a1717]">
                  {isArabic
                    ? 'كل جداول الاجتماعات'
                    : 'All Meeting Schedules'}
                </h4>

                <p className="mt-1 text-sm text-[#6b4b4b]">
                  {isArabic
                    ? 'يمكنك قراءة أو تعديل أو إيقاف أو حذف أي جدول.'
                    : 'Read, update, pause, or delete any schedule.'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[#ead9d0] bg-white p-8 text-center text-[#7a1717]">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#7a1717]/25 border-t-[#7a1717]" />
                {isArabic
                  ? 'جار تحميل الجداول...'
                  : 'Loading schedules...'}
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8aaaa] bg-[#fffaf6] p-8 text-center text-[#6b4b4b]">
                <CalendarDays
                  size={34}
                  className="mx-auto mb-3 text-[#7a1717]"
                />
                <h5 className="text-lg font-black text-[#7a1717]">
                  {isArabic
                    ? 'لا توجد اجتماعات مجدولة بعد'
                    : 'No Meeting Schedules Yet'}
                </h5>
                <p className="mt-2 text-sm">
                  {isArabic
                    ? 'استخدم النموذج لإنشاء أول اجتماع متكرر.'
                    : 'Use the form to create the first recurring meeting.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {schedules.map(schedule => {
                  const nextOccurrence =
                    getNextPeopleDevelopmentMeetingOccurrence(
                      schedule,
                      new Date(),
                      locale,
                    );

                  const isDeleting =
                    deletingId === schedule.id;

                  return (
                    <article
                      key={schedule.id}
                      className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                        schedule.active
                          ? 'border-[#ead9d0]'
                          : 'border-gray-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                                schedule.audience === 'shared'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {schedule.audience === 'shared'
                                ? isArabic
                                  ? 'مشترك'
                                  : 'Shared'
                                : isArabic
                                  ? 'مجموعة'
                                  : 'Group'}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                                schedule.active
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-gray-100 text-gray-600'
                              }`}
                            >
                              {schedule.active
                                ? isArabic
                                  ? 'نشط'
                                  : 'Active'
                                : isArabic
                                  ? 'متوقف'
                                  : 'Paused'}
                            </span>
                          </div>

                          <h5 className="text-lg font-black text-[#7a1717]">
                            {getPeopleDevelopmentMeetingScheduleTitle(
                              schedule,
                              locale,
                            )}
                          </h5>

                          <div className="mt-3 space-y-2 text-sm text-[#6b4b4b]">
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                size={15}
                                className="shrink-0 text-[#7a1717]"
                              />
                              {getPeopleDevelopmentMeetingRecurrenceLabel(
                                schedule,
                                locale,
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock
                                size={15}
                                className="shrink-0 text-[#7a1717]"
                              />
                              {formatPeopleDevelopmentMeetingTime(
                                schedule.startTime,
                                locale,
                              )} · {schedule.durationMinutes || 90} {isArabic ? 'دقيقة' : 'minutes'}
                            </div>

                            <div className="flex items-center gap-2">
                              <Users
                                size={15}
                                className="shrink-0 text-[#7a1717]"
                              />
                              {nextOccurrence
                                ? isArabic
                                  ? `الاجتماع التالي: ${formatOccurrenceDate(nextOccurrence.dateValue, locale)}`
                                  : `Next meeting: ${formatOccurrenceDate(nextOccurrence.dateValue, locale)}`
                                : isArabic
                                  ? 'لا يوجد اجتماع قادم ضمن النطاق المحدد.'
                                  : 'No upcoming meeting within the configured range.'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#ead9d0] pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            onStartEdit(schedule)
                          }
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8aaaa] bg-white px-3 py-2 text-xs font-black text-[#7a1717] transition hover:bg-[#f8eeee] disabled:opacity-50"
                        >
                          <Edit3 size={14} />
                          {isArabic ? 'تعديل' : 'Edit'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void onToggleActive(schedule)
                          }
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          {schedule.active
                            ? <X size={14} />
                            : <Check size={14} />}
                          {schedule.active
                            ? isArabic
                              ? 'إيقاف'
                              : 'Pause'
                            : isArabic
                              ? 'تفعيل'
                              : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void onDelete(schedule)
                          }
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-700" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          {isArabic ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
