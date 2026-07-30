import {
  useEffect,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';

import {
  sendPeopleDevelopmentNotificationViaBackend,
  type PeopleDevelopmentNotificationResult,
} from '../../../services/peopleDevelopmentNotifications';

import {
  MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
  PEOPLE_DEVELOPMENT_GROUPS,
  PEOPLE_DEVELOPMENT_ROOT,
  assignPersonToPeopleDevelopmentGroup,
  formatFileSize,
  getParticipantPeopleDevelopmentGroup,
  getPeopleAssignmentDateKey,
  getPeopleAssignmentsInMonth,
  getPeopleDevelopmentEmailRecipients,
  getPeopleDevelopmentGroupAssignments,
  getPeopleDevelopmentGroupLabel,
  postPeopleDevelopmentAssignment,
  readFileAsBase64,
  removePeopleDevelopmentAssignment,
  savePeoplePersonalNote,
  subscribeToPeopleDevelopmentAssignments,
  subscribeToPeopleDevelopmentMembers,
  subscribeToPeoplePersonalNotes,
  updatePeopleDevelopmentRecords,
  type PeopleDevelopmentAttachment,
  type PeopleDevelopmentEntry,
  type PeopleDevelopmentGroupId,
  type PeopleDevelopmentMember,
  type PeopleDevelopmentParticipant,
  type PeoplePersonalNote,
  type PeoplePersonalNoteType,
} from '../people-development';

type DisplayLocale = 'en' | 'ar';

export interface UsePeopleDevelopmentParams {
  participants: PeopleDevelopmentParticipant[];
  locale: DisplayLocale;
}

interface PeopleDevelopmentNotificationParams {
  assignmentId: string;
  groupIds: PeopleDevelopmentGroupId[];
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
}

function createGroupRecord<T>(
  createValue: (
    groupId: PeopleDevelopmentGroupId,
  ) => T,
): Record<PeopleDevelopmentGroupId, T> {
  return Object.fromEntries(
    PEOPLE_DEVELOPMENT_GROUPS.map(group => [
      group.id,
      createValue(group.id),
    ]),
  ) as Record<PeopleDevelopmentGroupId, T>;
}

export default function usePeopleDevelopment({
  participants,
  locale,
}: UsePeopleDevelopmentParams) {
  const [
    showPeopleDevelopment,
    setShowPeopleDevelopment,
  ] = useState(false);

  const [
    peopleDevelopmentMembers,
    setPeopleDevelopmentMembers,
  ] = useState<
    Record<string, PeopleDevelopmentMember>
  >({});

  const [
    peopleDevelopmentEntries,
    setPeopleDevelopmentEntries,
  ] = useState<PeopleDevelopmentEntry[]>([]);

  const [
    peoplePersonalNotes,
    setPeoplePersonalNotes,
  ] = useState<PeoplePersonalNote[]>([]);

  const [
    peopleSearchTerm,
    setPeopleSearchTerm,
  ] = useState('');

  const [
    draggedPeopleMemberKey,
    setDraggedPeopleMemberKey,
  ] = useState<string | null>(null);

  const [
    peopleDevelopmentSavingKey,
    setPeopleDevelopmentSavingKey,
  ] = useState<string | null>(null);

  const [
    peopleDevelopmentPostingGroup,
    setPeopleDevelopmentPostingGroup,
  ] = useState<PeopleDevelopmentGroupId | null>(
    null,
  );

  const [
    peopleDevelopmentPostingCombined,
    setPeopleDevelopmentPostingCombined,
  ] = useState(false);

  const [
    peopleDevelopmentDeletingKey,
    setPeopleDevelopmentDeletingKey,
  ] = useState<string | null>(null);

  const [
    peopleAssignmentsPopupGroup,
    setPeopleAssignmentsPopupGroup,
  ] = useState<PeopleDevelopmentGroupId | null>(
    null,
  );

  const [
    peopleAssignmentsPopupMonth,
    setPeopleAssignmentsPopupMonth,
  ] = useState(new Date());

  const [
    peopleAssignmentsPopupSelectedDate,
    setPeopleAssignmentsPopupSelectedDate,
  ] = useState('');

  const [
    peopleAssignmentDrafts,
    setPeopleAssignmentDrafts,
  ] = useState<
    Record<PeopleDevelopmentGroupId, string>
  >(() => createGroupRecord(() => ''));

  const [
    peopleAssignmentFiles,
    setPeopleAssignmentFiles,
  ] = useState<
    Record<
      PeopleDevelopmentGroupId,
      File | null
    >
  >(() => createGroupRecord(() => null));

  const [
    peopleAssignmentFileInputResetKeys,
    setPeopleAssignmentFileInputResetKeys,
  ] = useState<
    Record<PeopleDevelopmentGroupId, number>
  >(() => createGroupRecord(() => 0));

  const [
    peopleGroupSelectDrafts,
    setPeopleGroupSelectDrafts,
  ] = useState<
    Record<PeopleDevelopmentGroupId, string>
  >(() => createGroupRecord(() => ''));

  const [
    peopleCombinedAssignmentGroups,
    setPeopleCombinedAssignmentGroups,
  ] = useState<PeopleDevelopmentGroupId[]>([]);

  const [
    peopleCombinedAssignmentDraft,
    setPeopleCombinedAssignmentDraft,
  ] = useState('');

  const [
    peopleCombinedAssignmentFile,
    setPeopleCombinedAssignmentFile,
  ] = useState<File | null>(null);

  const [
    peopleCombinedAssignmentFileInputResetKey,
    setPeopleCombinedAssignmentFileInputResetKey,
  ] = useState(0);

  const [
    showPeopleNotePopup,
    setShowPeopleNotePopup,
  ] = useState(false);

  const [
    selectedPeopleNotePerson,
    setSelectedPeopleNotePerson,
  ] = useState<
    PeopleDevelopmentParticipant | null
  >(null);

  const [
    peopleNoteType,
    setPeopleNoteType,
  ] = useState<PeoplePersonalNoteType>(
    'strength',
  );

  const [
    peopleNoteText,
    setPeopleNoteText,
  ] = useState('');

  const [
    peopleNoteSaving,
    setPeopleNoteSaving,
  ] = useState(false);

  useEffect(
    () =>
      subscribeToPeopleDevelopmentMembers(
        setPeopleDevelopmentMembers,
      ),
    [],
  );

  useEffect(
    () =>
      subscribeToPeopleDevelopmentAssignments(
        setPeopleDevelopmentEntries,
      ),
    [],
  );

  useEffect(
    () =>
      subscribeToPeoplePersonalNotes(
        setPeoplePersonalNotes,
      ),
    [],
  );

  const getGroupDisplayLabel = (
    groupId: PeopleDevelopmentGroupId,
  ): string =>
    getPeopleDevelopmentGroupLabel(
      groupId,
      locale,
    );

  const getPersonGroup = (
    person: PeopleDevelopmentParticipant,
  ): PeopleDevelopmentGroupId | '' =>
    getParticipantPeopleDevelopmentGroup(
      person,
      peopleDevelopmentMembers,
    );

  const getGroupAssignments = (
    groupId: PeopleDevelopmentGroupId,
  ): PeopleDevelopmentEntry[] =>
    getPeopleDevelopmentGroupAssignments(
      peopleDevelopmentEntries,
      groupId,
    );

  const setAssignmentDraft = (
    groupId: PeopleDevelopmentGroupId,
    value: string,
  ) => {
    setPeopleAssignmentDrafts(previous => ({
      ...previous,
      [groupId]: value,
    }));
  };

  const setGroupSelectDraft = (
    groupId: PeopleDevelopmentGroupId,
    memberKey: string,
  ) => {
    setPeopleGroupSelectDrafts(previous => ({
      ...previous,
      [groupId]: memberKey,
    }));
  };

  const openAssignmentsPopup = (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    const monthDate = new Date();

    const monthEntries =
      getPeopleAssignmentsInMonth(
        getGroupAssignments(groupId),
        monthDate,
      );

    const firstMonthEntry =
      monthEntries[0] || null;

    setPeopleAssignmentsPopupGroup(
      groupId,
    );

    setPeopleAssignmentsPopupMonth(
      monthDate,
    );

    setPeopleAssignmentsPopupSelectedDate(
      firstMonthEntry
        ? getPeopleAssignmentDateKey(
            firstMonthEntry,
          )
        : '',
    );
  };

  const closeAssignmentsPopup = () => {
    setPeopleAssignmentsPopupGroup(null);
    setPeopleAssignmentsPopupSelectedDate('');
  };

  const changeAssignmentsPopupMonth = (
    nextMonth: Date,
  ) => {
    const monthEntries =
      peopleAssignmentsPopupGroup
        ? getPeopleAssignmentsInMonth(
            getGroupAssignments(
              peopleAssignmentsPopupGroup,
            ),
            nextMonth,
          )
        : [];

    const firstMonthEntry =
      monthEntries[0] || null;

    setPeopleAssignmentsPopupMonth(
      nextMonth,
    );

    setPeopleAssignmentsPopupSelectedDate(
      firstMonthEntry
        ? getPeopleAssignmentDateKey(
            firstMonthEntry,
          )
        : '',
    );
  };

  const openPeopleNotePopup = (
    person: PeopleDevelopmentParticipant,
    type: PeoplePersonalNoteType =
      'strength',
  ) => {
    setSelectedPeopleNotePerson(person);
    setPeopleNoteType(type);
    setPeopleNoteText('');
    setShowPeopleNotePopup(true);
  };

  const closePeopleNotePopup = () => {
    if (peopleNoteSaving) {
      return;
    }

    setShowPeopleNotePopup(false);
    setSelectedPeopleNotePerson(null);
    setPeopleNoteType('strength');
    setPeopleNoteText('');
  };

  const submitPeoplePersonalNote = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedPeopleNotePerson) {
      return;
    }

    const text =
      peopleNoteText.trim();

    if (!text) {
      window.alert(
        locale === 'ar'
          ? 'اكتب نص الملاحظة أولاً.'
          : 'Write the note text first.',
      );

      return;
    }

    setPeopleNoteSaving(true);

    try {
      const assignedGroup =
        getPersonGroup(
          selectedPeopleNotePerson,
        );

      const groupLabel =
        assignedGroup
          ? getGroupDisplayLabel(
              assignedGroup,
            )
          : '';

      await savePeoplePersonalNote({
        person: {
          memberKey:
            selectedPeopleNotePerson.memberKey,
          identifier:
            selectedPeopleNotePerson.identifier,
          fullName:
            selectedPeopleNotePerson.name,
          email:
            selectedPeopleNotePerson.email,
          primaryGift:
            selectedPeopleNotePerson.primaryGift,
          sourcePath:
            selectedPeopleNotePerson.sourcePath,
          sourceKeys:
            selectedPeopleNotePerson.sourceKeys,
        },
        group: assignedGroup,
        groupLabel,
        type: peopleNoteType,
        text,
        source: 'pastorCalendar',
      });

      setPeopleNoteText('');
      setShowPeopleNotePopup(false);
      setSelectedPeopleNotePerson(null);
      setPeopleNoteType('strength');
    } catch (error) {
      console.error(
        'Failed to save personal people note:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل حفظ الملاحظة الشخصية.'
          : 'Failed to save the personal note.',
      );
    } finally {
      setPeopleNoteSaving(false);
    }
  };

  const assignPersonToGroup = async (
    person: PeopleDevelopmentParticipant,
    group: PeopleDevelopmentGroupId | '',
  ) => {
    const currentGroup =
      getPersonGroup(person);

    if (currentGroup === group) {
      return;
    }

    setPeopleDevelopmentSavingKey(
      person.memberKey,
    );

    try {
      await assignPersonToPeopleDevelopmentGroup({
        person: {
          memberKey:
            person.memberKey,
          identifier:
            person.identifier,
          fullName:
            person.name,
          email:
            person.email,
          primaryGift:
            person.primaryGift,
          sourcePath:
            person.sourcePath,
          sourceKeys:
            person.sourceKeys,
        },
        group,
        groupLabel: group
          ? getGroupDisplayLabel(group)
          : '',
      });
    } catch (error) {
      console.error(
        'Failed to update people development group:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل تحديث مجموعة الشخص.'
          : 'Failed to update the person group.',
      );
    } finally {
      setPeopleDevelopmentSavingKey(null);
      setDraggedPeopleMemberKey(null);
    }
  };

  const dropPersonOnGroup = async (
    event: DragEvent<HTMLElement>,
    groupId: PeopleDevelopmentGroupId,
  ) => {
    event.preventDefault();

    const memberKey =
      event.dataTransfer.getData(
        'text/plain',
      ) ||
      draggedPeopleMemberKey;

    const person =
      participants.find(
        item =>
          item.memberKey ===
          memberKey,
      );

    if (person) {
      await assignPersonToGroup(
        person,
        groupId,
      );
    }
  };

  const resetAssignmentFileInput = (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    setPeopleAssignmentFileInputResetKeys(
      previous => ({
        ...previous,
        [groupId]:
          (previous[groupId] || 0) + 1,
      }),
    );
  };

  const resetCombinedAssignmentFileInput = () => {
    setPeopleCombinedAssignmentFileInputResetKey(
      previous => previous + 1,
    );
  };

  const clearAssignmentFile = (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: null,
    }));

    resetAssignmentFileInput(groupId);
  };

  const clearCombinedAssignmentFile = () => {
    setPeopleCombinedAssignmentFile(null);
    resetCombinedAssignmentFileInput();
  };

  const validateAssignmentFile = (
    file: File,
  ): boolean => {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      window.alert(
        locale === 'ar'
          ? 'يمكن رفع ملفات PDF فقط حالياً.'
          : 'Only PDF files can be attached for now.',
      );

      return false;
    }

    if (
      file.size >
      MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES
    ) {
      window.alert(
        locale === 'ar'
          ? `حجم ملف PDF يجب ألا يتجاوز ${formatFileSize(
              MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
            )}.`
          : `PDF file size must be ${formatFileSize(
              MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
            )} or less.`,
      );

      return false;
    }

    return true;
  };

  const changeAssignmentFile = (
    groupId: PeopleDevelopmentGroupId,
    file: File | null,
  ) => {
    if (!file) {
      setPeopleAssignmentFiles(previous => ({
        ...previous,
        [groupId]: null,
      }));

      return;
    }

    if (!validateAssignmentFile(file)) {
      setPeopleAssignmentFiles(previous => ({
        ...previous,
        [groupId]: null,
      }));

      resetAssignmentFileInput(groupId);
      return;
    }

    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: file,
    }));
  };

  const changeCombinedAssignmentFile = (
    file: File | null,
  ) => {
    if (!file) {
      setPeopleCombinedAssignmentFile(null);
      return;
    }

    if (!validateAssignmentFile(file)) {
      setPeopleCombinedAssignmentFile(null);
      resetCombinedAssignmentFileInput();
      return;
    }

    setPeopleCombinedAssignmentFile(file);
  };

  const toggleCombinedAssignmentGroup = (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    setPeopleCombinedAssignmentGroups(
      previous =>
        previous.includes(groupId)
          ? previous.filter(
              selectedGroupId =>
                selectedGroupId !== groupId,
            )
          : [...previous, groupId],
    );
  };

  const selectAllCombinedAssignmentGroups = () => {
    setPeopleCombinedAssignmentGroups(
      PEOPLE_DEVELOPMENT_GROUPS.map(
        group => group.id,
      ),
    );
  };

  const clearCombinedAssignmentGroups = () => {
    setPeopleCombinedAssignmentGroups([]);
  };

  const createAssignmentAttachments = async (
    selectedFile: File | null,
  ): Promise<PeopleDevelopmentAttachment[]> => {
    if (!selectedFile) {
      return [];
    }

    const uploadedAt = Date.now();
    const uploadedAtISO =
      new Date(uploadedAt).toISOString();
    const base64 =
      await readFileAsBase64(selectedFile);

    return [
      {
        name: selectedFile.name,
        type:
          selectedFile.type ||
          'application/pdf',
        size: selectedFile.size,
        encoding: 'base64',
        storage: 'realtimeDatabase',
        base64,
        uploadedAt,
        uploadedAtISO,
      },
    ];
  };

  const sendAssignmentNotificationEmails =
    async (
      params: PeopleDevelopmentNotificationParams,
    ): Promise<PeopleDevelopmentNotificationResult> => {
      const recipients =
        getPeopleDevelopmentEmailRecipients(
          participants,
          peopleDevelopmentMembers,
          params.groupIds,
        );

      if (recipients.length === 0) {
        return {
          success: true,
          requestedCount: 0,
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          apiRequestCount: 0,
          deliveryMode: 'bcc',
        };
      }

      const appUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : '';

      const postedAtLabel =
        params.createdAt
          ? new Date(
              params.createdAt,
            ).toLocaleString(
              'en-CA',
              {
                timeZone:
                  'America/Toronto',
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              },
            )
          : params.createdAtISO ||
            params.date;

      return sendPeopleDevelopmentNotificationViaBackend(
        {
          assignmentId: params.assignmentId,
          groups: params.groupIds,
          recipients: recipients.map(
            recipient => ({
              email: recipient.email,
              name:
                recipient.name &&
                recipient.name !== 'N/A'
                  ? recipient.name
                  : recipient.firstName ||
                    'Participant',
            }),
          ),
          post: {
            text: params.text,
            postedAtLabel,
            appUrl,
            attachments:
              params.attachments.map(
                attachment => ({
                  name: attachment.name,
                  size: attachment.size,
                }),
              ),
          },
        },
      );
    };

  const showAssignmentNotificationResult = (
    notificationResult: PeopleDevelopmentNotificationResult,
    groupCount: number,
  ) => {
    if (
      notificationResult.requestedCount === 0
    ) {
      window.alert(
        locale === 'ar'
          ? 'تم حفظ المنشور، لكن لا يوجد أعضاء في المجموعات المحددة لديهم بريد إلكتروني صالح.'
          : 'Post saved, but no members in the selected group(s) have valid email addresses.',
      );

      return;
    }

    if (
      !notificationResult.success ||
      notificationResult.failedCount > 0
    ) {
      const diagnostic = [
        notificationResult.errorMessage,
        notificationResult.errorCode,
        notificationResult.httpStatus
          ? `HTTP ${notificationResult.httpStatus}`
          : '',
      ].filter(Boolean).join(' — ');

      window.alert(
        locale === 'ar'
          ? `تم حفظ المنشور. تم إرسال ${notificationResult.sentCount} إشعار، وفشل إرسال ${notificationResult.failedCount}.${diagnostic ? `\n\nالسبب: ${diagnostic}` : ''}`
          : `Post saved. ${notificationResult.sentCount} notification(s) sent, ${notificationResult.failedCount} failed.${diagnostic ? `\n\nReason: ${diagnostic}` : ''}`,
      );

      return;
    }

    window.alert(
      locale === 'ar'
        ? `تم حفظ المنشور في ${groupCount} مجموعة وإرسال إشعار إلى ${notificationResult.sentCount} عضو/أعضاء باستخدام طلب بريد واحد بنسخة مخفية.`
        : `Post saved to ${groupCount} group(s), and ${notificationResult.sentCount} member(s) were notified using one BCC email request.`,
    );
  };

  const postAssignmentToGroups = async (
    groupIds: PeopleDevelopmentGroupId[],
    textValue: string,
    selectedFile: File | null,
  ) => {
    const groups = Array.from(
      new Set(groupIds),
    );
    const text = textValue.trim();

    if (groups.length === 0) {
      window.alert(
        locale === 'ar'
          ? 'اختر مجموعة واحدة على الأقل.'
          : 'Select at least one group.',
      );

      return false;
    }

    if (!text && !selectedFile) {
      window.alert(
        locale === 'ar'
          ? 'اكتب نص الملاحظة أو أرفق ملف PDF أولاً.'
          : 'Write a note or attach a PDF first.',
      );

      return false;
    }

    const attachments =
      await createAssignmentAttachments(
        selectedFile,
      );

    const postedAssignment =
      await postPeopleDevelopmentAssignment({
        groups,
        groupLabel: groups
          .map(getGroupDisplayLabel)
          .join(', '),
        text,
        attachments,
        source: 'pastorCalendar',
      });

    const notificationResult =
      await sendAssignmentNotificationEmails({
        assignmentId:
          postedAssignment.assignmentId,
        groupIds:
          postedAssignment.groups,
        text: postedAssignment.text,
        date: postedAssignment.date,
        createdAt:
          postedAssignment.createdAt,
        createdAtISO:
          postedAssignment.createdAtISO,
        attachments:
          postedAssignment.attachments,
      });

    showAssignmentNotificationResult(
      notificationResult,
      groups.length,
    );

    return true;
  };

  const postAssignment = async (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    setPeopleDevelopmentPostingGroup(
      groupId,
    );

    try {
      const posted =
        await postAssignmentToGroups(
          [groupId],
          peopleAssignmentDrafts[groupId] || '',
          peopleAssignmentFiles[groupId],
        );

      if (posted) {
        setAssignmentDraft(groupId, '');
        clearAssignmentFile(groupId);
      }
    } catch (error) {
      console.error(
        'Failed to post People Development assignment:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل حفظ الملاحظة أو التكليف.'
          : 'Failed to save the note or assignment.',
      );
    } finally {
      setPeopleDevelopmentPostingGroup(null);
    }
  };

  const postCombinedAssignment = async () => {
    setPeopleDevelopmentPostingCombined(true);

    try {
      const posted =
        await postAssignmentToGroups(
          peopleCombinedAssignmentGroups,
          peopleCombinedAssignmentDraft,
          peopleCombinedAssignmentFile,
        );

      if (posted) {
        setPeopleCombinedAssignmentDraft('');
        setPeopleCombinedAssignmentGroups([]);
        clearCombinedAssignmentFile();
      }
    } catch (error) {
      console.error(
        'Failed to post combined People Development assignment:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل حفظ المنشور المشترك.'
          : 'Failed to save the combined post.',
      );
    } finally {
      setPeopleDevelopmentPostingCombined(false);
    }
  };

  const deleteAssignment = async (
    entry: PeopleDevelopmentEntry,
  ) => {
    const isCombinedPost =
      entry.groups.length > 1;

    const confirmed =
      window.confirm(
        locale === 'ar'
          ? isCombinedPost
            ? 'سيتم حذف هذا المنشور المشترك من جميع المجموعات المحددة مع جميع ملفاته. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟'
            : 'هل أنت متأكد أنك تريد حذف هذا المنشور بالكامل مع جميع ملفاته؟ لا يمكن التراجع عن هذا الإجراء.'
          : isCombinedPost
            ? 'This combined post will be deleted from every selected group with all of its files. This action cannot be undone. Continue?'
            : 'Delete this entire post and all of its files? This action cannot be undone.',
      );

    if (!confirmed) {
      return;
    }

    const deletingKey =
      `assignment-${entry.id}`;

    setPeopleDevelopmentDeletingKey(
      deletingKey,
    );

    try {
      await removePeopleDevelopmentAssignment(
        entry.id,
      );

      window.alert(
        locale === 'ar'
          ? 'تم حذف المنشور.'
          : 'Post deleted.',
      );
    } catch (error) {
      console.error(
        'Failed to delete People Development post:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل حذف المنشور.'
          : 'Failed to delete the post.',
      );
    } finally {
      setPeopleDevelopmentDeletingKey(
        null,
      );
    }
  };

  const deleteAssignmentAttachment =
    async (
      entry: PeopleDevelopmentEntry,
      attachmentIndex: number,
    ) => {
      const attachment =
        entry.attachments[
          attachmentIndex
        ];

      if (!attachment) {
        return;
      }

      const confirmed =
        window.confirm(
          locale === 'ar'
            ? `هل تريد إزالة الملف "${attachment.name}" من هذا المنشور؟`
            : `Remove the file "${attachment.name}" from this post?`,
        );

      if (!confirmed) {
        return;
      }

      const deletingKey =
        `attachment-${entry.id}-${attachmentIndex}`;

      setPeopleDevelopmentDeletingKey(
        deletingKey,
      );

      try {
        const remainingAttachments =
          entry.attachments.filter(
            (_, index) =>
              index !==
              attachmentIndex,
          );

        if (
          !entry.text.trim() &&
          remainingAttachments.length ===
            0
        ) {
          await removePeopleDevelopmentAssignment(
            entry.id,
          );
        } else {
          const updatedAt =
            Date.now();

          await updatePeopleDevelopmentRecords(
            {
              [`${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}/attachments`]:
                remainingAttachments,
              [`${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}/hasAttachments`]:
                remainingAttachments.length >
                0,
              [`${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}/updatedAt`]:
                updatedAt,
              [`${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}/updatedAtISO`]:
                new Date(
                  updatedAt,
                ).toISOString(),
            },
          );
        }

        window.alert(
          locale === 'ar'
            ? 'تمت إزالة الملف.'
            : 'File removed.',
        );
      } catch (error) {
        console.error(
          'Failed to remove People Development attachment:',
          error,
        );

        window.alert(
          locale === 'ar'
            ? 'فشل إزالة الملف.'
            : 'Failed to remove the file.',
        );
      } finally {
        setPeopleDevelopmentDeletingKey(
          null,
        );
      }
    };

  const activeAssignmentsPopupEntries =
    peopleAssignmentsPopupGroup
      ? getGroupAssignments(
          peopleAssignmentsPopupGroup,
        )
      : [];

  const selectedPeopleNoteAssignedGroup =
    selectedPeopleNotePerson
      ? getPersonGroup(
          selectedPeopleNotePerson,
        )
      : '';

  const selectedPeopleNoteGroupLabel =
    selectedPeopleNoteAssignedGroup
      ? getGroupDisplayLabel(
          selectedPeopleNoteAssignedGroup,
        )
      : '';

  const peopleNotesTitle =
    locale === 'ar'
      ? 'نمو الأشخاص'
      : 'People Development';

  const peopleNotesSubtitle =
    locale === 'ar'
      ? 'مجموعات الخدمة، التكليفات، وتوزيع الأشخاص'
      : 'Service groups, assignments, and people placement';

  return {
    showPeopleDevelopment,
    setShowPeopleDevelopment,

    peopleDevelopmentMembers,
    peopleDevelopmentEntries,
    peoplePersonalNotes,

    peopleSearchTerm,
    setPeopleSearchTerm,

    draggedPeopleMemberKey,
    setDraggedPeopleMemberKey,

    peopleDevelopmentSavingKey,
    peopleDevelopmentPostingGroup,
    peopleDevelopmentPostingCombined,
    peopleDevelopmentDeletingKey,

    peopleAssignmentsPopupGroup,
    peopleAssignmentsPopupMonth,
    peopleAssignmentsPopupSelectedDate,
    setPeopleAssignmentsPopupSelectedDate,

    peopleAssignmentDrafts,
    peopleAssignmentFiles,
    peopleAssignmentFileInputResetKeys,
    peopleGroupSelectDrafts,

    peopleCombinedAssignmentGroups,
    peopleCombinedAssignmentDraft,
    setPeopleCombinedAssignmentDraft,
    peopleCombinedAssignmentFile,
    peopleCombinedAssignmentFileInputResetKey,

    showPeopleNotePopup,
    selectedPeopleNotePerson,
    peopleNoteType,
    setPeopleNoteType,
    peopleNoteText,
    setPeopleNoteText,
    peopleNoteSaving,

    peopleNotesTitle,
    peopleNotesSubtitle,

    activeAssignmentsPopupEntries,
    selectedPeopleNoteAssignedGroup,
    selectedPeopleNoteGroupLabel,

    getGroupDisplayLabel,
    getPersonGroup,
    getGroupAssignments,

    setAssignmentDraft,
    setGroupSelectDraft,

    openAssignmentsPopup,
    closeAssignmentsPopup,
    changeAssignmentsPopupMonth,

    openPeopleNotePopup,
    closePeopleNotePopup,
    submitPeoplePersonalNote,

    assignPersonToGroup,
    dropPersonOnGroup,

    changeAssignmentFile,
    clearAssignmentFile,
    postAssignment,

    toggleCombinedAssignmentGroup,
    selectAllCombinedAssignmentGroups,
    clearCombinedAssignmentGroups,
    changeCombinedAssignmentFile,
    clearCombinedAssignmentFile,
    postCombinedAssignment,

    deleteAssignment,
    deleteAssignmentAttachment,
  };
}

export type UsePeopleDevelopmentResult =
  ReturnType<
    typeof usePeopleDevelopment
  >;
