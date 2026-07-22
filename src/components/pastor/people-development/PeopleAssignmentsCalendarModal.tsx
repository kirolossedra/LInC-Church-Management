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
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Trash2,
  X,
} from 'lucide-react';

import {
  PEOPLE_DEVELOPMENT_GROUPS,
} from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentEntry,
  PeopleDevelopmentGroupId,
} from './peopleDevelopment.types';

import {
  formatFileSize,
} from './peopleDevelopment.utils';

import {
  getPeopleAssignmentDateKey,
  groupPeopleAssignmentsByDate,
} from './peopleDevelopment.selectors';

export interface PeopleAssignmentsCalendarModalProps {
  open: boolean;
  groupId: PeopleDevelopmentGroupId | null;
  entries: PeopleDevelopmentEntry[];
  month: Date;
  selectedDate: string;
  deletingKey: string | null;
  locale: 'en' | 'ar';

  onMonthChange: (
    month: Date,
  ) => void;

  onSelectedDateChange: (
    date: string,
  ) => void;

  onClose: () => void;

  onDeleteAssignment: (
    entry: PeopleDevelopmentEntry,
  ) => Promise<void> | void;

  onDeleteAttachment: (
    entry: PeopleDevelopmentEntry,
    attachmentIndex: number,
  ) => Promise<void> | void;
}

function downloadBase64Attachment(
  base64: string,
  fileName: string,
  mimeType: string,
): void {
  const normalizedBase64 =
    String(base64 || '').trim();

  if (!normalizedBase64) {
    return;
  }

  const anchor =
    document.createElement('a');

  anchor.href =
    `data:${mimeType || 'application/octet-stream'};base64,${normalizedBase64}`;

  anchor.download =
    fileName || 'attachment';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function PeopleAssignmentsCalendarModal({
  open,
  groupId,
  entries,
  month,
  selectedDate,
  deletingKey,
  locale,
  onMonthChange,
  onSelectedDateChange,
  onClose,
  onDeleteAssignment,
  onDeleteAttachment,
}: PeopleAssignmentsCalendarModalProps) {
  if (!open || !groupId) {
    return null;
  }

  const isArabic =
    locale === 'ar';

  const dateLocale =
    isArabic ? ar : enUS;

  const groupConfig =
    PEOPLE_DEVELOPMENT_GROUPS.find(
      group => group.id === groupId,
    ) || null;

  const groupLabel =
    groupConfig
      ? isArabic
        ? groupConfig.labelAr
        : groupConfig.labelEn
      : groupId;

  const monthDays =
    eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });

  const monthStartPadding =
    startOfMonth(month).getDay();

  const entriesByDate =
    groupPeopleAssignmentsByDate(
      entries,
    );

  const selectedEntries =
    selectedDate
      ? entriesByDate[selectedDate] || []
      : [];

  const monthLabel =
    format(
      month,
      'MMMM yyyy',
      {
        locale: dateLocale,
      },
    );

  const selectedDateLabel =
    selectedDate
      ? format(
          new Date(
            `${selectedDate}T12:00:00`,
          ),
          'EEEE, MMMM d, yyyy',
          {
            locale: dateLocale,
          },
        )
      : '';

  const weekdayLabels =
    isArabic
      ? [
          'الأحد',
          'الإثنين',
          'الثلاثاء',
          'الأربعاء',
          'الخميس',
          'الجمعة',
          'السبت',
        ]
      : [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
        ];

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-3 sm:p-5"
      role="presentation"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-assignments-calendar-title"
        dir={isArabic ? 'rtl' : 'ltr'}
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-[#fffaf6] shadow-2xl"
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
        <header className="shrink-0 bg-[#7a1717] px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
                <CalendarIcon size={16} />

                {isArabic
                  ? 'تقويم منشورات المجموعة'
                  : 'Group Posts Calendar'}
              </div>

              <h2
                id="people-assignments-calendar-title"
                className="break-words text-2xl font-black leading-tight sm:text-3xl"
              >
                {groupLabel}
              </h2>

              <p className="mt-1 text-sm text-white/75">
                {isArabic
                  ? 'راجع الملاحظات والتكليفات والملفات المنشورة حسب التاريخ.'
                  : 'Review notes, assignments, and files by date.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
              title={
                isArabic
                  ? 'إغلاق'
                  : 'Close'
              }
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-3xl border-2 border-[#ead9d0] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onMonthChange(
                      subMonths(
                        month,
                        1,
                      ),
                    )
                  }
                  className="rounded-2xl border border-[#ead9d0] bg-[#fff9f4] p-3 text-[#7a1717] transition-colors hover:bg-[#f8eeee]"
                  title={
                    isArabic
                      ? 'الشهر السابق'
                      : 'Previous month'
                  }
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                  <div className="text-xl font-black text-[#7a1717]">
                    {monthLabel}
                  </div>

                  <div className="text-xs font-bold uppercase tracking-widest text-[#7a1717]/60">
                    {isArabic
                      ? 'النقاط تعني وجود منشورات'
                      : 'Dots indicate posts'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onMonthChange(
                      addMonths(
                        month,
                        1,
                      ),
                    )
                  }
                  className="rounded-2xl border border-[#ead9d0] bg-[#fff9f4] p-3 text-[#7a1717] transition-colors hover:bg-[#f8eeee]"
                  title={
                    isArabic
                      ? 'الشهر التالي'
                      : 'Next month'
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-wider text-[#7a1717]/65 sm:text-xs">
                {weekdayLabels.map(
                  dayLabel => (
                    <div
                      key={dayLabel}
                      className="py-2"
                    >
                      {dayLabel}
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({
                  length:
                    monthStartPadding,
                }).map(
                  (_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[54px] rounded-2xl bg-stone-50/70 sm:min-h-[68px]"
                    />
                  ),
                )}

                {monthDays.map(day => {
                  const dateKey =
                    format(
                      day,
                      'yyyy-MM-dd',
                    );

                  const postsForDay =
                    entriesByDate[
                      dateKey
                    ] || [];

                  const hasPosts =
                    postsForDay.length > 0;

                  const isSelected =
                    selectedDate ===
                    dateKey;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() =>
                        onSelectedDateChange(
                          dateKey,
                        )
                      }
                      className={`relative min-h-[54px] rounded-2xl border p-2 text-sm font-black transition sm:min-h-[68px] ${
                        isSelected
                          ? 'border-[#7a1717] bg-[#7a1717] text-white shadow-md'
                          : hasPosts
                            ? 'border-[#d9b6a5] bg-[#fff3ea] text-[#7a1717] hover:bg-[#f8e4d7]'
                            : 'border-gray-100 bg-stone-50 text-gray-500 hover:border-[#ead9d0] hover:bg-[#fff9f4]'
                      }`}
                    >
                      {format(
                        day,
                        'd',
                      )}

                      {hasPosts && (
                        <span
                          className={`absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : 'bg-[#7a1717]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border-2 border-[#ead9d0] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h3 className="text-xl font-black text-[#7a1717]">
                  {selectedDateLabel ||
                    (
                      isArabic
                        ? 'اختر يوماً من التقويم'
                        : 'Select a calendar day'
                    )}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedDate
                    ? isArabic
                      ? `${selectedEntries.length} منشور`
                      : `${selectedEntries.length} post${selectedEntries.length === 1 ? '' : 's'}`
                    : isArabic
                      ? 'ستظهر منشورات اليوم المحدد هنا.'
                      : 'Posts for the selected day will appear here.'}
                </p>
              </div>

              {!selectedDate ? (
                <div className="rounded-2xl border border-dashed border-[#d9b6a5] bg-[#fff9f4] px-5 py-12 text-center text-sm text-gray-500">
                  {isArabic
                    ? 'اختر تاريخاً لعرض المنشورات.'
                    : 'Choose a date to view its posts.'}
                </div>
              ) : selectedEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9b6a5] bg-[#fff9f4] px-5 py-12 text-center text-sm text-gray-500">
                  {isArabic
                    ? 'لا توجد منشورات في هذا اليوم.'
                    : 'There are no posts on this day.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedEntries.map(
                    entry => {
                      const assignmentDeleteKey =
                        `assignment-${entry.id}`;

                      const deletingAssignment =
                        deletingKey ===
                        assignmentDeleteKey;

                      return (
                        <article
                          key={entry.id}
                          className="rounded-2xl border border-[#ead9d0] bg-[#fffdfb] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black uppercase tracking-wider text-[#7a1717]/60">
                                {getPeopleAssignmentDateKey(
                                  entry,
                                )}
                              </div>

                              {entry.text && (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                                  {entry.text}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={Boolean(
                                deletingKey,
                              )}
                              onClick={() =>
                                void onDeleteAssignment(
                                  entry,
                                )
                              }
                              className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title={
                                isArabic
                                  ? 'حذف المنشور'
                                  : 'Delete post'
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {entry.attachments.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {entry.attachments.map(
                                (
                                  attachment,
                                  attachmentIndex,
                                ) => {
                                  const attachmentDeleteKey =
                                    `attachment-${entry.id}-${attachmentIndex}`;

                                  const deletingAttachment =
                                    deletingKey ===
                                    attachmentDeleteKey;

                                  return (
                                    <div
                                      key={`${entry.id}-${attachment.name}-${attachmentIndex}`}
                                      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="rounded-xl bg-[#f8eeee] p-2 text-[#7a1717]">
                                          <FileText size={18} />
                                        </div>

                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-black text-gray-800">
                                            {attachment.name}
                                          </div>

                                          <div className="text-xs text-gray-400">
                                            {formatFileSize(
                                              attachment.size,
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadBase64Attachment(
                                              attachment.base64,
                                              attachment.name,
                                              attachment.type,
                                            )
                                          }
                                          className="flex items-center justify-center gap-2 rounded-xl border border-[#d9b6a5] bg-[#fff9f4] px-3 py-2 text-xs font-black text-[#7a1717] transition hover:bg-[#f8eeee]"
                                        >
                                          <Download size={14} />

                                          {isArabic
                                            ? 'تنزيل'
                                            : 'Download'}
                                        </button>

                                        <button
                                          type="button"
                                          disabled={Boolean(
                                            deletingKey,
                                          )}
                                          onClick={() =>
                                            void onDeleteAttachment(
                                              entry,
                                              attachmentIndex,
                                            )
                                          }
                                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                          title={
                                            isArabic
                                              ? 'إزالة الملف'
                                              : 'Remove file'
                                          }
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>

                                      {(deletingAssignment ||
                                        deletingAttachment) && (
                                        <div className="text-xs font-bold text-red-600">
                                          {isArabic
                                            ? 'جارٍ الحذف...'
                                            : 'Deleting...'}
                                        </div>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
