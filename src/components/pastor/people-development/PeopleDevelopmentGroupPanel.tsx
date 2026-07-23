import type {
  DragEvent,
} from 'react';

import {
  CalendarDays,
  FileText,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import {
  MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
  type PeopleDevelopmentGroupDefinition,
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
  type PeopleDevelopmentParticipant,
} from './peopleDevelopment.selectors';

export interface PeopleDevelopmentGroupPanelProps {
  group: PeopleDevelopmentGroupDefinition;
  participants: PeopleDevelopmentParticipant[];
  groupParticipants: PeopleDevelopmentParticipant[];
  assignments: PeopleDevelopmentEntry[];
  draftText: string;
  selectedFile: File | null;
  fileInputResetKey: number;
  selectedMemberKey: string;
  posting: boolean;
  savingMemberKey: string | null;
  draggedMemberKey: string | null;
  locale: 'en' | 'ar';

  getParticipantGroup: (
    participant: PeopleDevelopmentParticipant,
  ) => PeopleDevelopmentGroupId | '';

  getGroupLabel: (
    groupId: PeopleDevelopmentGroupId,
  ) => string;

  onDropMember: (
    event: DragEvent<HTMLElement>,
    groupId: PeopleDevelopmentGroupId,
  ) => Promise<void> | void;

  onDraftTextChange: (
    groupId: PeopleDevelopmentGroupId,
    value: string,
  ) => void;

  onFileChange: (
    groupId: PeopleDevelopmentGroupId,
    file: File | null,
  ) => void;

  onClearFile: (
    groupId: PeopleDevelopmentGroupId,
  ) => void;

  onPostAssignment: (
    groupId: PeopleDevelopmentGroupId,
  ) => Promise<void> | void;

  onSelectedMemberKeyChange: (
    groupId: PeopleDevelopmentGroupId,
    memberKey: string,
  ) => void;

  onAssignSelectedMember: (
    groupId: PeopleDevelopmentGroupId,
    memberKey: string,
  ) => Promise<void> | void;

  onOpenAssignments: (
    groupId: PeopleDevelopmentGroupId,
  ) => void;
}

function getPostCountLabel(
  count: number,
  locale: 'en' | 'ar',
): string {
  if (locale === 'ar') {
    return `${count} منشور`;
  }

  return `${count} post${
    count === 1 ? '' : 's'
  }`;
}

function getMemberCountLabel(
  count: number,
  locale: 'en' | 'ar',
): string {
  if (locale === 'ar') {
    return `${count} عضو`;
  }

  return `${count} member${
    count === 1 ? '' : 's'
  }`;
}

export default function PeopleDevelopmentGroupPanel({
  group,
  participants,
  groupParticipants,
  assignments,
  draftText,
  selectedFile,
  fileInputResetKey,
  selectedMemberKey,
  posting,
  savingMemberKey,
  draggedMemberKey,
  locale,
  getParticipantGroup,
  getGroupLabel,
  onDropMember,
  onDraftTextChange,
  onFileChange,
  onClearFile,
  onPostAssignment,
  onSelectedMemberKeyChange,
  onAssignSelectedMember,
  onOpenAssignments,
}: PeopleDevelopmentGroupPanelProps) {
  const isArabic =
    locale === 'ar';

  const latestAssignment =
    assignments[0] || null;

  const selectedParticipant =
    participants.find(
      participant =>
        participant.memberKey ===
        selectedMemberKey,
    ) || null;

  const selectedParticipantSaving =
    Boolean(
      selectedParticipant &&
        savingMemberKey ===
          selectedParticipant.memberKey,
    );

  return (
    <article
      onDragOver={event =>
        event.preventDefault()
      }
      onDrop={event =>
        void onDropMember(
          event,
          group.id,
        )
      }
      className="space-y-5"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className={`rounded-2xl border px-4 py-3 ${group.cardClass}`}
        >
          <div className="text-xs font-black uppercase tracking-widest opacity-65">
            {isArabic
              ? 'الأعضاء'
              : 'Members'}
          </div>

          <div className="mt-1 text-lg font-black">
            {getMemberCountLabel(
              groupParticipants.length,
              locale,
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 ${group.cardClass}`}
        >
          <div className="text-xs font-black uppercase tracking-widest opacity-65">
            {isArabic
              ? 'المنشورات'
              : 'Posts'}
          </div>

          <div className="mt-1 text-lg font-black">
            {getPostCountLabel(
              assignments.length,
              locale,
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onOpenAssignments(
              group.id,
            )
          }
          className={`rounded-2xl border px-4 py-3 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${group.cardClass}`}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-65">
            <CalendarDays size={14} />

            {isArabic
              ? 'السجل'
              : 'History'}
          </div>

          <div className="mt-1 text-lg font-black">
            {isArabic
              ? 'عرض كل المنشورات'
              : 'View all posts'}
          </div>
        </button>
      </div>

      {draggedMemberKey && (
        <div
          className={`rounded-2xl border-2 border-dashed px-4 py-4 text-center text-sm font-black ${group.cardClass}`}
        >
          {isArabic
            ? 'أفلت الشخص في أي مكان داخل هذه النافذة لإضافته إلى المجموعة.'
            : 'Drop the person anywhere inside this window to add them to the group.'}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-5">
          <section
            className={`rounded-3xl border-2 p-4 sm:p-5 ${group.softClass}`}
          >
            <div className="mb-4 flex items-center gap-2">
              <Send size={17} />

              <h5 className="text-base font-black">
                {isArabic
                  ? 'إضافة ملاحظة أو تكليف'
                  : 'Add note or assignment'}
              </h5>
            </div>

            <div className="space-y-3">
              <textarea
                value={draftText}
                onChange={event =>
                  onDraftTextChange(
                    group.id,
                    event.target.value,
                  )
                }
                disabled={posting}
                placeholder={
                  isArabic
                    ? 'اكتب ملاحظة أو تكليف لهذه المجموعة...'
                    : 'Write a note or assignment for this group...'
                }
                className="min-h-[120px] w-full resize-y rounded-2xl border border-white/80 bg-white px-4 py-3 text-[#242424] outline-none transition focus:ring-2 focus:ring-[#7a1717]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <label className="block rounded-2xl border border-dashed border-white/90 bg-white/75 p-3 text-sm font-black text-[#242424]">
                <span className="flex items-center gap-2 opacity-75">
                  <FileText size={16} />

                  {isArabic
                    ? 'إرفاق ملف PDF اختياري'
                    : 'Optional PDF attachment'}
                </span>

                <span className="mt-1 block text-xs font-bold opacity-60">
                  {isArabic
                    ? `الحد الأقصى ${formatFileSize(
                        MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
                      )} — سيتم حفظ الملف كـ Base64 في Realtime Database.`
                    : `Max ${formatFileSize(
                        MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
                      )} — saved as Base64 in Realtime Database.`}
                </span>

                <input
                  key={`${group.id}-assignment-file-${fileInputResetKey}`}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={posting}
                  onChange={event =>
                    onFileChange(
                      group.id,
                      event.target.files?.[0] ||
                        null,
                    )
                  }
                  className="mt-3 block w-full text-sm font-bold text-[#242424] file:me-3 file:rounded-xl file:border-0 file:bg-[#f8eeee] file:px-3 file:py-2 file:font-black file:text-[#7a1717] hover:file:bg-[#efd8d8] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {selectedFile && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white px-3 py-2 text-sm font-black text-[#242424]">
                  <div className="min-w-0">
                    <div className="truncate">
                      {selectedFile.name}
                    </div>

                    <div className="text-xs opacity-60">
                      {formatFileSize(
                        selectedFile.size,
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onClearFile(
                        group.id,
                      )
                    }
                    disabled={posting}
                    className="shrink-0 rounded-full bg-[#f8eeee] p-1.5 text-[#7a1717] transition-colors hover:bg-[#efd8d8] disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      isArabic
                        ? 'إزالة الملف'
                        : 'Remove file'
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  void onPostAssignment(
                    group.id,
                  )
                }
                disabled={posting}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${group.buttonClass}`}
              >
                <Send size={16} />

                {posting
                  ? isArabic
                    ? 'جارٍ الحفظ والإرسال...'
                    : 'Posting and emailing...'
                  : isArabic
                    ? 'نشر وإرسال للمجموعة'
                    : 'Post and email group'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-stone-50 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-gray-900">
              <UserPlus size={17} />

              <h5 className="text-base font-black">
                {isArabic
                  ? 'إضافة شخص إلى المجموعة'
                  : 'Add person to group'}
              </h5>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedMemberKey}
                onChange={event =>
                  onSelectedMemberKeyChange(
                    group.id,
                    event.target.value,
                  )
                }
                disabled={
                  posting ||
                  selectedParticipantSaving
                }
                className="min-w-0 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-[#242424] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {isArabic
                    ? 'اختر شخصاً'
                    : 'Select person'}
                </option>

                {participants.map(
                  participant => {
                    const currentGroup =
                      getParticipantGroup(
                        participant,
                      );

                    return (
                      <option
                        key={`${group.id}-${participant.memberKey}`}
                        value={
                          participant.memberKey
                        }
                      >
                        {participant.name}
                        {currentGroup
                          ? ` — ${getGroupLabel(
                              currentGroup,
                            )}`
                          : ''}
                      </option>
                    );
                  },
                )}
              </select>

              <button
                type="button"
                disabled={
                  !selectedMemberKey ||
                  posting ||
                  selectedParticipantSaving
                }
                onClick={() =>
                  void onAssignSelectedMember(
                    group.id,
                    selectedMemberKey,
                  )
                }
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-5 py-3 font-black text-white transition-colors hover:bg-[#5f1111] disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  isArabic
                    ? 'إضافة الشخص إلى المجموعة'
                    : 'Add person to group'
                }
              >
                <UserPlus size={16} />

                {selectedParticipantSaving
                  ? '...'
                  : isArabic
                    ? 'إضافة'
                    : 'Add'}
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-900">
                <Users size={17} />

                <h5 className="text-base font-black">
                  {isArabic
                    ? 'أعضاء المجموعة'
                    : 'Group members'}
                </h5>
              </div>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-black ${group.badgeClass}`}
              >
                {groupParticipants.length}
              </span>
            </div>

            {groupParticipants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-stone-50 px-4 py-8 text-center text-sm text-gray-500">
                {isArabic
                  ? 'لا يوجد أشخاص في هذه المجموعة بعد.'
                  : 'No people are assigned to this group yet.'}
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
                {groupParticipants.map(
                  participant => (
                    <div
                      key={`${group.id}-member-${participant.memberKey}`}
                      className="rounded-2xl border border-gray-100 bg-stone-50 px-3 py-2.5"
                      title={
                        participant.identifier ||
                        participant.email
                      }
                    >
                      <div className="break-words text-sm font-black text-gray-900">
                        {participant.name}
                      </div>

                      {(participant.identifier ||
                        participant.email) && (
                        <div className="mt-0.5 break-all text-xs font-bold text-gray-500">
                          {participant.identifier ||
                            participant.email}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-900">
                <CalendarDays size={17} />

                <h5 className="text-base font-black">
                  {isArabic
                    ? 'آخر منشور'
                    : 'Latest post'}
                </h5>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenAssignments(
                    group.id,
                  )
                }
                className="text-xs font-black text-[#7a1717] hover:underline"
              >
                {isArabic
                  ? `عرض الكل (${assignments.length})`
                  : `View all (${assignments.length})`}
              </button>
            </div>

            {latestAssignment ? (
              <div
                className={`rounded-2xl border p-4 ${group.softClass}`}
              >
                <div className="text-xs font-bold opacity-55">
                  {getPeopleAssignmentDateKey(
                    latestAssignment,
                  )}
                </div>

                {latestAssignment.text && (
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#242424]">
                    {latestAssignment.text}
                  </p>
                )}

                {latestAssignment.attachments.length >
                  0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold opacity-65">
                    <FileText size={13} />

                    {
                      latestAssignment
                        .attachments.length
                    }

                    {isArabic
                      ? ' ملف'
                      : latestAssignment
                            .attachments.length ===
                          1
                        ? ' file'
                        : ' files'}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-stone-50 px-4 py-8 text-center text-sm text-gray-500">
                {isArabic
                  ? 'لا توجد منشورات لهذه المجموعة بعد.'
                  : 'No posts have been added for this group yet.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
