import type {
  DragEvent,
} from 'react';

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  MessageSquare,
  Search,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';

import {
  PEOPLE_DEVELOPMENT_GROUPS,
} from './peopleDevelopment.constants';

import PeopleDevelopmentGroupPanel from './PeopleDevelopmentGroupPanel';

import type {
  PeopleDevelopmentEntry,
  PeopleDevelopmentGroupId,
  PeoplePersonalNote,
  PeoplePersonalNoteType,
} from './peopleDevelopment.types';

import {
  getParticipantPeopleDevelopmentGroup,
  getPeopleDevelopmentGroupAssignments,
  getPeopleDevelopmentGroupLabel,
  getPeopleDevelopmentGroupParticipants,
  getPeoplePersonalNotesForParticipant,
  searchPeopleDevelopmentParticipants,
  type PeopleDevelopmentParticipant,
  type PeopleDevelopmentMembersByKey,
} from './peopleDevelopment.selectors';

export interface PeopleDevelopmentSectionProps {
  expanded: boolean;
  locale: 'en' | 'ar';

  participants: PeopleDevelopmentParticipant[];
  members: PeopleDevelopmentMembersByKey;
  assignments: PeopleDevelopmentEntry[];
  personalNotes: PeoplePersonalNote[];

  searchTerm: string;
  draggedMemberKey: string | null;
  savingMemberKey: string | null;
  postingGroup: PeopleDevelopmentGroupId | null;

  assignmentDrafts: Record<
    PeopleDevelopmentGroupId,
    string
  >;

  assignmentFiles: Record<
    PeopleDevelopmentGroupId,
    File | null
  >;

  assignmentFileInputResetKeys: Record<
    PeopleDevelopmentGroupId,
    number
  >;

  groupSelectDrafts: Record<
    PeopleDevelopmentGroupId,
    string
  >;

  onToggleExpanded: () => void;

  onSearchTermChange: (
    value: string,
  ) => void;

  onDraggedMemberKeyChange: (
    memberKey: string | null,
  ) => void;

  onDropMember: (
    event: DragEvent<HTMLElement>,
    groupId: PeopleDevelopmentGroupId,
  ) => Promise<void> | void;

  onAssignPerson: (
    participant: PeopleDevelopmentParticipant,
    groupId: PeopleDevelopmentGroupId | '',
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

  onGroupSelectDraftChange: (
    groupId: PeopleDevelopmentGroupId,
    memberKey: string,
  ) => void;

  onOpenAssignments: (
    groupId: PeopleDevelopmentGroupId,
  ) => void;

  onOpenPersonalNote: (
    participant: PeopleDevelopmentParticipant,
    noteType: PeoplePersonalNoteType,
  ) => void;
}

function getParticipantDisplayName(
  participant: PeopleDevelopmentParticipant,
  locale: 'en' | 'ar',
): string {
  if (
    participant.name &&
    participant.name !== 'N/A'
  ) {
    return participant.name;
  }

  return locale === 'ar'
    ? 'عضو'
    : 'Member';
}

function getPersonalNoteCountLabel(
  count: number,
  locale: 'en' | 'ar',
): string {
  if (locale === 'ar') {
    return `${count} ملاحظة`;
  }

  return `${count} note${
    count === 1 ? '' : 's'
  }`;
}

export default function PeopleDevelopmentSection({
  expanded,
  locale,
  participants,
  members,
  assignments,
  personalNotes,
  searchTerm,
  draggedMemberKey,
  savingMemberKey,
  postingGroup,
  assignmentDrafts,
  assignmentFiles,
  assignmentFileInputResetKeys,
  groupSelectDrafts,
  onToggleExpanded,
  onSearchTermChange,
  onDraggedMemberKeyChange,
  onDropMember,
  onAssignPerson,
  onDraftTextChange,
  onFileChange,
  onClearFile,
  onPostAssignment,
  onGroupSelectDraftChange,
  onOpenAssignments,
  onOpenPersonalNote,
}: PeopleDevelopmentSectionProps) {
  const isArabic =
    locale === 'ar';

  const visibleParticipants =
    searchPeopleDevelopmentParticipants(
      participants,
      searchTerm,
    );

  const assignedCount =
    participants.filter(
      participant =>
        Boolean(
          getParticipantPeopleDevelopmentGroup(
            participant,
            members,
          ),
        ),
    ).length;

  const unassignedCount =
    participants.length -
    assignedCount;

  const getParticipantGroup = (
    participant: PeopleDevelopmentParticipant,
  ): PeopleDevelopmentGroupId | '' =>
    getParticipantPeopleDevelopmentGroup(
      participant,
      members,
    );

  const getGroupLabel = (
    groupId: PeopleDevelopmentGroupId,
  ): string =>
    getPeopleDevelopmentGroupLabel(
      groupId,
      locale,
    );

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    participant: PeopleDevelopmentParticipant,
  ) => {
    event.dataTransfer.effectAllowed =
      'move';

    event.dataTransfer.setData(
      'text/plain',
      participant.memberKey,
    );

    onDraggedMemberKeyChange(
      participant.memberKey,
    );
  };

  const handleAssignSelectedMember = async (
    groupId: PeopleDevelopmentGroupId,
    memberKey: string,
  ) => {
    const participant =
      participants.find(
        item =>
          item.memberKey ===
          memberKey,
      );

    if (!participant) {
      return;
    }

    await onAssignPerson(
      participant,
      groupId,
    );

    onGroupSelectDraftChange(
      groupId,
      '',
    );
  };

  return (
    <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full flex-col gap-4 text-start sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-black text-violet-800">
            <Users size={19} />

            {isArabic
              ? 'نمو الأشخاص'
              : 'People Development'}

            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-800">
              {participants.length}
            </span>
          </h3>

          <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
            {isArabic
              ? 'توزيع الأشخاص على مجموعات الخدمة وإضافة الملاحظات والتكليفات'
              : 'Assign people to ministry groups and manage notes and assignments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700">
            {isArabic
              ? `المعيّنون: ${assignedCount}`
              : `Assigned: ${assignedCount}`}
          </span>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            {isArabic
              ? `غير المعيّنين: ${unassignedCount}`
              : `Unassigned: ${unassignedCount}`}
          </span>

          {expanded ? (
            <ChevronUp
              size={18}
              className="text-gray-500"
            />
          ) : (
            <ChevronDown
              size={18}
              className="text-gray-500"
            />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-gray-100 bg-stone-50 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-black text-gray-900">
                  {isArabic
                    ? 'الأشخاص'
                    : 'People'}
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  {isArabic
                    ? 'اسحب الشخص إلى مجموعة أو استخدم قائمة الإضافة داخل المجموعة.'
                    : 'Drag a person into a group or use the add-person selector inside each group.'}
                </p>
              </div>

              <label className="relative block w-full sm:max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={event =>
                    onSearchTermChange(
                      event.target.value,
                    )
                  }
                  placeholder={
                    isArabic
                      ? 'ابحث بالاسم أو البريد أو المعرّف...'
                      : 'Search by name, email, or identifier...'
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pe-4 ps-11 text-sm outline-none transition focus:border-violet-400"
                />
              </label>
            </div>

            {participants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
                {isArabic
                  ? 'لا يوجد أشخاص متاحون حتى الآن.'
                  : 'No people are available yet.'}
              </div>
            ) : visibleParticipants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
                {isArabic
                  ? 'لا توجد نتائج مطابقة للبحث.'
                  : 'No people match the current search.'}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleParticipants.map(
                  participant => {
                    const currentGroup =
                      getParticipantGroup(
                        participant,
                      );

                    const participantNotes =
                      getPeoplePersonalNotesForParticipant(
                        personalNotes,
                        participant,
                      );

                    const strengthCount =
                      participantNotes.filter(
                        note =>
                          note.type ===
                          'strength',
                      ).length;

                    const weaknessCount =
                      participantNotes.filter(
                        note =>
                          note.type ===
                          'weakness',
                      ).length;

                    const saving =
                      savingMemberKey ===
                      participant.memberKey;

                    return (
                      <article
                        key={
                          participant.memberKey
                        }
                        draggable={!saving}
                        onDragStart={event =>
                          handleDragStart(
                            event,
                            participant,
                          )
                        }
                        onDragEnd={() =>
                          onDraggedMemberKeyChange(
                            null,
                          )
                        }
                        className={`rounded-2xl border bg-white p-4 transition ${
                          draggedMemberKey ===
                          participant.memberKey
                            ? 'border-violet-400 opacity-60 shadow-lg'
                            : 'border-gray-100 hover:border-violet-200 hover:shadow-sm'
                        } ${
                          saving
                            ? 'cursor-wait opacity-60'
                            : 'cursor-grab active:cursor-grabbing'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0 rounded-xl bg-violet-50 p-2 text-violet-700">
                            <GripVertical
                              size={17}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5 className="break-words text-sm font-black text-gray-900">
                              {getParticipantDisplayName(
                                participant,
                                locale,
                              )}
                            </h5>

                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                              {participant.identifier && (
                                <div className="break-all">
                                  {
                                    participant.identifier
                                  }
                                </div>
                              )}

                              {participant.email &&
                                participant.email !==
                                  'N/A' && (
                                  <div className="break-all">
                                    {
                                      participant.email
                                    }
                                  </div>
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                                  currentGroup
                                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                {currentGroup
                                  ? getGroupLabel(
                                      currentGroup,
                                    )
                                  : isArabic
                                    ? 'غير معيّن'
                                    : 'Unassigned'}
                              </span>

                              <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600">
                                <MessageSquare
                                  size={11}
                                />

                                {getPersonalNoteCountLabel(
                                  participantNotes.length,
                                  locale,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPersonalNote(
                                participant,
                                'strength',
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"
                          >
                            <ThumbsUp
                              size={14}
                            />

                            {isArabic
                              ? `قوة (${strengthCount})`
                              : `Strength (${strengthCount})`}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onOpenPersonalNote(
                                participant,
                                'weakness',
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100"
                          >
                            <ThumbsDown
                              size={14}
                            />

                            {isArabic
                              ? `نمو (${weaknessCount})`
                              : `Growth (${weaknessCount})`}
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h4 className="text-base font-black text-gray-900">
                {isArabic
                  ? 'مجموعات نمو الأشخاص'
                  : 'People Development Groups'}
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                {isArabic
                  ? 'كل مجموعة لها أعضاء وملاحظات وتكليفات وسجل منشورات مستقل.'
                  : 'Each group has its own members, notes, assignments, and post history.'}
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {PEOPLE_DEVELOPMENT_GROUPS.map(
                group => (
                  <PeopleDevelopmentGroupPanel
                    key={group.id}
                    group={group}
                    participants={
                      participants
                    }
                    groupParticipants={getPeopleDevelopmentGroupParticipants(
                      participants,
                      members,
                      group.id,
                    )}
                    assignments={getPeopleDevelopmentGroupAssignments(
                      assignments,
                      group.id,
                    )}
                    draftText={
                      assignmentDrafts[
                        group.id
                      ] || ''
                    }
                    selectedFile={
                      assignmentFiles[
                        group.id
                      ] || null
                    }
                    fileInputResetKey={
                      assignmentFileInputResetKeys[
                        group.id
                      ] || 0
                    }
                    selectedMemberKey={
                      groupSelectDrafts[
                        group.id
                      ] || ''
                    }
                    posting={
                      postingGroup ===
                      group.id
                    }
                    savingMemberKey={
                      savingMemberKey
                    }
                    draggedMemberKey={
                      draggedMemberKey
                    }
                    locale={locale}
                    getParticipantGroup={
                      getParticipantGroup
                    }
                    getGroupLabel={
                      getGroupLabel
                    }
                    onDropMember={
                      onDropMember
                    }
                    onDraftTextChange={
                      onDraftTextChange
                    }
                    onFileChange={
                      onFileChange
                    }
                    onClearFile={
                      onClearFile
                    }
                    onPostAssignment={
                      onPostAssignment
                    }
                    onSelectedMemberKeyChange={
                      onGroupSelectDraftChange
                    }
                    onAssignSelectedMember={
                      handleAssignSelectedMember
                    }
                    onOpenAssignments={
                      onOpenAssignments
                    }
                  />
                ),
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
