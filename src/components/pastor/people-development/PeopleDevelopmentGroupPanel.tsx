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
  const isArabic = locale === 'ar';

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
      className={`space-y-4 rounded-3xl border-2 p-4 ${group.softClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xl font-black">
            {isArabic
              ? group.labelAr
              : group.labelEn}
          </h4>

          <p className="mt-1 text-sm opacity-80">
            {isArabic
              ? 'ملاحظات وتكليفات هذه المجموعة'
              : 'Notes and assignments for this group'}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-sm font-black ${group.badgeClass}`}
        >
          {groupParticipants.length}
        </span>
      </div>

      {draggedMemberKey && (
        <div className="rounded-2xl border border-dashed border-white/90 bg-white/60 px-4 py-3 text-center text-sm font-black">
          {isArabic
            ? 'أفلت الشخص هنا لإضافته إلى المجموعة'
            : 'Drop the person here to add them to this group'}
        </div>
      )}

      <div className="space-y-2">
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
          className="min-h-[96px] w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <label className="block rounded-2xl border border-dashed border-white/80 bg-white/70 p-3 text-sm font-black text-[#242424]">
          <span className="flex items-center gap-2 opacity-75">
            <FileText size={16} />

            {isArabic
              ? 'إرفاق ملف PDF صغير اختياري'
              : 'Optional small PDF attachment'}
          </span>

          <span className="mt-1 block text-xs font-bold opacity-60">
            {isArabic
              ? `الحد الأقصى ${formatFileSize(
                  MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
                )} — سيتم حفظه كـ Base64 في Realtime Database.`
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
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2 text-sm font-black text-[#242424]">
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
                onClearFile(group.id)
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

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
          className="min-w-0 rounded-2xl border border-white/70 bg-white px-3 py-3 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {isArabic
              ? 'اختر شخصاً'
              : 'Select person'}
          </option>

          {participants.map(participant => {
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
          })}
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
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-4 py-3 font-black text-white transition-colors hover:bg-[#5f1111] disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="rounded-2xl border border-white/70 bg-white/65 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black">
            <Users size={15} />

            {isArabic
              ? 'أعضاء المجموعة'
              : 'Group members'}
          </div>

          <span className="text-xs font-bold opacity-60">
            {groupParticipants.length}
          </span>
        </div>

        {groupParticipants.length === 0 ? (
          <p className="text-sm opacity-65">
            {isArabic
              ? 'لا يوجد أشخاص في هذه المجموعة بعد.'
              : 'No people are assigned to this group yet.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groupParticipants.map(
              participant => (
                <span
                  key={`${group.id}-member-${participant.memberKey}`}
                  className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-black text-[#242424]"
                  title={
                    participant.identifier ||
                    participant.email
                  }
                >
                  {participant.name}
                </span>
              ),
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/65 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black">
            <CalendarDays size={15} />

            {isArabic
              ? 'آخر منشور'
              : 'Latest post'}
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
          <div>
            <div className="text-xs font-bold opacity-55">
              {getPeopleAssignmentDateKey(
                latestAssignment,
              )}
            </div>

            {latestAssignment.text && (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#242424]">
                {latestAssignment.text}
              </p>
            )}

            {latestAssignment.attachments.length >
              0 && (
              <div className="mt-2 flex items-center gap-2 text-xs font-bold opacity-65">
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
          <p className="text-sm opacity-65">
            {isArabic
              ? 'لا توجد منشورات لهذه المجموعة بعد.'
              : 'No posts have been added for this group yet.'}
          </p>
        )}
      </div>
    </article>
  );
}
