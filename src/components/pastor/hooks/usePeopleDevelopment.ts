import {
  useEffect,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';

import emailjs from '@emailjs/browser';
import {
  push,
  ref,
} from 'firebase/database';

import { database } from '../../../firebase';

import {
  MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
  PEOPLE_DEVELOPMENT_GROUPS,
  PEOPLE_DEVELOPMENT_ROOT,
  assignPersonToPeopleDevelopmentGroup,
  buildPeopleDevelopmentAssignmentNotificationEmailHtml,
  formatFileSize,
  getParticipantPeopleDevelopmentGroup,
  getPeopleAssignmentDateKey,
  getPeopleAssignmentsInMonth,
  getPeopleDevelopmentEmailRecipients,
  getPeopleDevelopmentGroupAssignments,
  getPeopleDevelopmentGroupLabel,
  getPeopleDevelopmentStaticGroupLabel,
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

const EMAILJS_SERVICE_ID = 'service_v47g6or';
const EMAILJS_TEMPLATE_ID = 'template_a0iy1xy';
const EMAILJS_PUBLIC_KEY = 'x_Xx3UHe3-yE1I13_';

type DisplayLocale = 'en' | 'ar';

export interface UsePeopleDevelopmentParams {
  participants: PeopleDevelopmentParticipant[];
  locale: DisplayLocale;
}

interface PeopleDevelopmentNotificationParams {
  assignmentId: string;
  groupId: PeopleDevelopmentGroupId;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
}

interface PeopleDevelopmentNotificationResult {
  totalCount: number;
  sentCount: number;
  failedCount: number;
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

  const clearAssignmentFile = (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: null,
    }));

    resetAssignmentFileInput(groupId);
  };

  const changeAssignmentFile = (
    groupId: PeopleDevelopmentGroupId,
    file: File | null,
  ) => {
    if (!file) {
      setPeopleAssignmentFiles(
        previous => ({
          ...previous,
          [groupId]: null,
        }),
      );

      return;
    }

    const isPdf =
      file.type ===
        'application/pdf' ||
      file.name
        .toLowerCase()
        .endsWith('.pdf');

    if (!isPdf) {
      window.alert(
        locale === 'ar'
          ? 'يمكن رفع ملفات PDF فقط حالياً.'
          : 'Only PDF files can be attached for now.',
      );

      setPeopleAssignmentFiles(
        previous => ({
          ...previous,
          [groupId]: null,
        }),
      );

      resetAssignmentFileInput(
        groupId,
      );

      return;
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

      setPeopleAssignmentFiles(
        previous => ({
          ...previous,
          [groupId]: null,
        }),
      );

      resetAssignmentFileInput(
        groupId,
      );

      return;
    }

    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: file,
    }));
  };

  const sendAssignmentNotificationEmails =
    async (
      params: PeopleDevelopmentNotificationParams,
    ): Promise<PeopleDevelopmentNotificationResult> => {
      const recipients =
        getPeopleDevelopmentEmailRecipients(
          participants,
          peopleDevelopmentMembers,
          params.groupId,
        );

      const groupLabelEn =
        getPeopleDevelopmentStaticGroupLabel(
          params.groupId,
          'en',
        );

      const groupLabelAr =
        getPeopleDevelopmentStaticGroupLabel(
          params.groupId,
          'ar',
        );

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

      let sentCount = 0;
      let failedCount = 0;

      for (
        const recipient of recipients
      ) {
        const recipientEmail =
          String(
            recipient.email || '',
          ).trim();

        const recipientName =
          recipient.name &&
          recipient.name !== 'N/A'
            ? recipient.name
            : recipient.firstName ||
              'Friend';

        const subject =
          `LinC People Development Update - ${groupLabelEn} / تحديث نمو الأشخاص - ${groupLabelAr}`;

        const htmlBody =
          buildPeopleDevelopmentAssignmentNotificationEmailHtml(
            {
              recipientName,
              groupLabelEn,
              groupLabelAr,
              noteText:
                params.text,
              attachments:
                params.attachments,
              postedAtLabel,
              appUrl,
            },
          );

        try {
          const response =
            await emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID,
              {
                to_email:
                  recipientEmail,
                subject,
                fullName:
                  recipientName,
                message_html:
                  htmlBody,
                reply_to: '',
              },
              EMAILJS_PUBLIC_KEY,
            );

          sentCount += 1;

          try {
            await push(
              ref(
                database,
                'emailJsSendLogs/',
              ),
              {
                recipientEmail,
                subject,
                fullName:
                  recipientName,
                sentUsing:
                  'EmailJS',
                serviceId:
                  EMAILJS_SERVICE_ID,
                templateId:
                  EMAILJS_TEMPLATE_ID,
                source:
                  'peopleDevelopmentAssignmentNotification',
                assignmentId:
                  params.assignmentId,
                group:
                  params.groupId,
                groupLabelEn,
                groupLabelAr,
                attachmentNames:
                  params.attachments.map(
                    attachment =>
                      attachment.name,
                  ),
                sentAt:
                  Date.now(),
                sentAtISO:
                  new Date().toISOString(),
                emailJsResponse: {
                  status:
                    response.status,
                  text:
                    response.text,
                },
              },
            );
          } catch (logError) {
            console.error(
              'Failed to log People Development notification success:',
              logError,
            );
          }
        } catch (error) {
          failedCount += 1;

          console.error(
            `Failed to send People Development assignment notification to ${recipientEmail}:`,
            error,
          );

          try {
            await push(
              ref(
                database,
                'emailJsSendLogs/',
              ),
              {
                recipientEmail,
                subject,
                fullName:
                  recipientName,
                sentUsing:
                  'EmailJS',
                serviceId:
                  EMAILJS_SERVICE_ID,
                templateId:
                  EMAILJS_TEMPLATE_ID,
                source:
                  'peopleDevelopmentAssignmentNotification',
                assignmentId:
                  params.assignmentId,
                group:
                  params.groupId,
                groupLabelEn,
                groupLabelAr,
                failed: true,
                errorMessage:
                  error instanceof Error
                    ? error.message
                    : String(error),
                attemptedAt:
                  Date.now(),
                attemptedAtISO:
                  new Date().toISOString(),
              },
            );
          } catch (logError) {
            console.error(
              'Failed to log People Development notification failure:',
              logError,
            );
          }
        }
      }

      return {
        totalCount:
          recipients.length,
        sentCount,
        failedCount,
      };
    };

  const postAssignment = async (
    groupId: PeopleDevelopmentGroupId,
  ) => {
    const text =
      (
        peopleAssignmentDrafts[
          groupId
        ] || ''
      ).trim();

    const selectedFile =
      peopleAssignmentFiles[
        groupId
      ];

    if (
      !text &&
      !selectedFile
    ) {
      window.alert(
        locale === 'ar'
          ? 'اكتب نص الملاحظة أو أرفق ملف PDF أولاً.'
          : 'Write a note or attach a PDF first.',
      );

      return;
    }

    setPeopleDevelopmentPostingGroup(
      groupId,
    );

    try {
      const attachments:
        PeopleDevelopmentAttachment[] =
        [];

      if (selectedFile) {
        const uploadedAt =
          Date.now();

        const uploadedAtISO =
          new Date(
            uploadedAt,
          ).toISOString();

        const base64 =
          await readFileAsBase64(
            selectedFile,
          );

        attachments.push({
          name:
            selectedFile.name,
          type:
            selectedFile.type ||
            'application/pdf',
          size:
            selectedFile.size,
          encoding: 'base64',
          storage:
            'realtimeDatabase',
          base64,
          uploadedAt,
          uploadedAtISO,
        });
      }

      const postedAssignment =
        await postPeopleDevelopmentAssignment(
          {
            group: groupId,
            groupLabel:
              getGroupDisplayLabel(
                groupId,
              ),
            text,
            attachments,
            source:
              'pastorCalendar',
          },
        );

      const notificationResult =
        await sendAssignmentNotificationEmails(
          {
            assignmentId:
              postedAssignment.assignmentId,
            groupId,
            text:
              postedAssignment.text,
            date:
              postedAssignment.date,
            createdAt:
              postedAssignment.createdAt,
            createdAtISO:
              postedAssignment.createdAtISO,
            attachments:
              postedAssignment.attachments,
          },
        );

      if (
        notificationResult.totalCount ===
        0
      ) {
        window.alert(
          locale === 'ar'
            ? 'تم حفظ الملاحظة / التكليف، لكن لا يوجد أعضاء في هذه المجموعة لديهم بريد إلكتروني صالح.'
            : 'Note / assignment saved, but no group members with valid email addresses were found.',
        );
      } else if (
        notificationResult.failedCount >
        0
      ) {
        window.alert(
          locale === 'ar'
            ? `تم حفظ الملاحظة / التكليف. تم إرسال ${notificationResult.sentCount} بريد، وفشل إرسال ${notificationResult.failedCount}.`
            : `Note / assignment saved. ${notificationResult.sentCount} email(s) sent, ${notificationResult.failedCount} failed.`,
        );
      } else {
        window.alert(
          locale === 'ar'
            ? `تم حفظ الملاحظة / التكليف وإرسال بريد إلى ${notificationResult.sentCount} عضو/أعضاء في المجموعة.`
            : `Note / assignment saved and email notifications sent to ${notificationResult.sentCount} group member(s).`,
        );
      }

      setAssignmentDraft(
        groupId,
        '',
      );

      clearAssignmentFile(
        groupId,
      );
    } catch (error) {
      console.error(
        'Failed to post people development assignment:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل حفظ الملاحظة أو التكليف.'
          : 'Failed to save the note or assignment.',
      );
    } finally {
      setPeopleDevelopmentPostingGroup(
        null,
      );
    }
  };

  const deleteAssignment = async (
    entry: PeopleDevelopmentEntry,
  ) => {
    const confirmed =
      window.confirm(
        locale === 'ar'
          ? 'هل أنت متأكد أنك تريد حذف هذا المنشور بالكامل مع جميع ملفاته؟ لا يمكن التراجع عن هذا الإجراء.'
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
    peopleDevelopmentDeletingKey,

    peopleAssignmentsPopupGroup,
    peopleAssignmentsPopupMonth,
    peopleAssignmentsPopupSelectedDate,
    setPeopleAssignmentsPopupSelectedDate,

    peopleAssignmentDrafts,
    peopleAssignmentFiles,
    peopleAssignmentFileInputResetKeys,
    peopleGroupSelectDrafts,

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

    deleteAssignment,
    deleteAssignmentAttachment,
  };
}

export type UsePeopleDevelopmentResult =
  ReturnType<
    typeof usePeopleDevelopment
  >;
