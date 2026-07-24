import { useEffect, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import type { Meeting } from '../../../types';
import {
  sendMeetingInvitationsViaBackend,
} from '../../../services/meetingInvitations';

import {
  createMeeting,
  deleteMeeting,
  getMeetingRequestEmail,
  sendMeetingStatusEmailViaEmailJs,
  subscribeToMeetings,
  timeToHour,
  updateMeeting,
  updateMeetingRequest,
} from '../calendar';

import {
  isUsableEmail,
  type PeopleDevelopmentParticipant,
} from '../people-development';

type DisplayLocale = 'en' | 'ar';
type TranslateFunction = (key: any) => string;

export interface UseMeetingsParams {
  participants: PeopleDevelopmentParticipant[];
  locale: DisplayLocale;
  translate: TranslateFunction;
}

export interface MeetingInvitationData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetLink: string;
}

function createInitialMeeting(): Partial<Meeting> {
  return {
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    meetLink: '',
    type: 'service',
  };
}

export default function useMeetings({
  participants,
  locale,
  translate,
}: UseMeetingsParams) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>(
    createInitialMeeting,
  );
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => subscribeToMeetings(setMeetings), []);

  const resetMeetingForm = () => {
    setNewMeeting(createInitialMeeting());
  };

  const openNewMeeting = () => {
    setEditingMeeting(null);
    setSelectedParticipants([]);
    setShowParticipantDropdown(false);
    setEmailSent(false);
    resetMeetingForm();
    setIsAddOpen(true);
  };

  const openNewMeetingForDate = (date: string) => {
    setEditingMeeting(null);
    setSelectedParticipants([]);
    setShowParticipantDropdown(false);
    setEmailSent(false);
    setNewMeeting({
      ...createInitialMeeting(),
      date,
    });
    setIsAddOpen(true);
  };

  const openMeetingEditor = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setNewMeeting({ ...meeting });
    setSelectedParticipants(meeting.participantIds || []);
    setShowParticipantDropdown(false);
    setEmailSent(false);
    setIsAddOpen(true);
  };

  const closeMeetingEditor = () => {
    setIsAddOpen(false);
    setEditingMeeting(null);
    setSelectedParticipants([]);
    setShowParticipantDropdown(false);
    setEmailSent(false);
    resetMeetingForm();
  };

  const getMeetingDisplayTitle = (meeting: Meeting): string => {
    const requestName = (meeting as any).requestName;

    if (requestName) {
      return `${translate('calendar.meetingWith')} ${requestName}`;
    }

    return meeting.title || translate('calendar.meeting');
  };

  const getMeetingRequestReason = (meeting: Meeting): string => {
    return String((meeting as any).requestReason || '');
  };

  const getMeetingAcknowledged = (meeting: Meeting): boolean => {
    return Boolean((meeting as any).acknowledged);
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(previous =>
      previous.includes(participantId)
        ? previous.filter(id => id !== participantId)
        : [...previous, participantId],
    );
  };

  const sendMeetingInvitations = async (
    meetingData: MeetingInvitationData,
  ): Promise<boolean> => {
    if (selectedParticipants.length === 0) {
      return true;
    }

    const recipients = participants
      .filter(participant =>
        selectedParticipants.includes(participant.id),
      )
      .filter(participant =>
        isUsableEmail(participant.email),
      )
      .map(participant => ({
        email: participant.email,
        name:
          participant.name ||
          (locale === 'ar' ? 'المشارك' : 'Participant'),
      }));

    if (recipients.length === 0) {
      return true;
    }

    return sendMeetingInvitationsViaBackend({
      locale,
      recipients,
      meeting: {
        title: meetingData.title,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
        meetLink: meetingData.meetLink,
      },
    });
  };

  const handleSaveMeeting = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setMeetingLoading(true);
    setEmailSent(false);

    try {
      const startHour = timeToHour(newMeeting.startTime || '00:00');
      const endHour = timeToHour(newMeeting.endTime || '00:00');

      if (endHour <= startHour) {
        window.alert(
          locale === 'ar'
            ? 'وقت النهاية يجب أن يكون بعد وقت البداية.'
            : 'End time must be after start time.',
        );
        return;
      }

      const meetingData: Record<string, any> = {
        title: newMeeting.title || '',
        date: newMeeting.date || '',
        startTime: newMeeting.startTime || '',
        endTime: newMeeting.endTime || '',
        location: newMeeting.location || '',
        meetLink: newMeeting.meetLink || '',
        type: newMeeting.type || 'service',
        participantIds: selectedParticipants,
        updatedAt: Date.now(),
      };

      if (editingMeeting) {
        const requestFieldsToPreserve = [
          'requestName',
          'requestEmail',
          'requestReason',
          'sourceRequestId',
          'requesterLocale',
          'requesterLanguage',
        ];

        requestFieldsToPreserve.forEach(field => {
          const value = (editingMeeting as any)[field];

          if (value !== undefined && value !== null && value !== '') {
            meetingData[field] = value;
          }
        });

        const finalizedDetailsChanged =
          (editingMeeting.date || '') !== meetingData.date ||
          (editingMeeting.startTime || '') !== meetingData.startTime ||
          (editingMeeting.endTime || '') !== meetingData.endTime ||
          (editingMeeting.meetLink || '') !== meetingData.meetLink ||
          (editingMeeting.location || '') !== meetingData.location;

        if (finalizedDetailsChanged) {
          meetingData.acknowledged = false;
          meetingData.acknowledgedAt = null;
          meetingData.acknowledgedEmail = null;
        } else {
          meetingData.acknowledged = Boolean(
            (editingMeeting as any).acknowledged,
          );

          const acknowledgedAt =
            (editingMeeting as any).acknowledgedAt;

          if (
            acknowledgedAt !== undefined &&
            acknowledgedAt !== null &&
            acknowledgedAt !== ''
          ) {
            meetingData.acknowledgedAt = acknowledgedAt;
          }

          const acknowledgedEmail =
            (editingMeeting as any).acknowledgedEmail;

          if (
            acknowledgedEmail !== undefined &&
            acknowledgedEmail !== null &&
            acknowledgedEmail !== ''
          ) {
            meetingData.acknowledgedEmail = acknowledgedEmail;
          }
        }

        const editingMeetingId = editingMeeting.id;

        if (!editingMeetingId) {
          throw new Error('Cannot update a meeting without an ID.');
        }

        await updateMeeting(editingMeetingId, meetingData);

        const sourceRequestId =
          (editingMeeting as any).sourceRequestId;

        if (sourceRequestId) {
          await updateMeetingRequest(
            sourceRequestId,
            {
              date: meetingData.date,
              startTime: meetingData.startTime,
              endTime: meetingData.endTime,
              updatedAt: Date.now(),
            } as any,
          );
        }
      } else {
        await createMeeting({
          ...meetingData,
          acknowledged: false,
        } as any);
      }

      const emailSuccess = await sendMeetingInvitations({
        title: meetingData.title,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
        meetLink: meetingData.meetLink,
      });

      setEmailSent(emailSuccess);
      setIsAddOpen(false);
      setEditingMeeting(null);
      setSelectedParticipants([]);
      setShowParticipantDropdown(false);
      resetMeetingForm();
    } catch (error) {
      console.error(error);
      window.alert(translate('calendar.failed'));
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm(translate('calendar.confirmDelete'))) {
      return;
    }

    setMeetingLoading(true);

    try {
      const meetingToCancel = meetings.find(
        meeting => meeting.id === meetingId,
      );

      if (
        meetingToCancel &&
        getMeetingRequestEmail(meetingToCancel)
      ) {
        await sendMeetingStatusEmailViaEmailJs({
          kind: 'cancellation',
          recipientEmail: getMeetingRequestEmail(meetingToCancel),
          name: (meetingToCancel as any).requestName || '',
          date: meetingToCancel.date,
          startTime: meetingToCancel.startTime,
          endTime: meetingToCancel.endTime,
          location: meetingToCancel.location || '',
          requesterLocale:
            (meetingToCancel as any).requesterLocale || 'en',
          sourceId: meetingId,
        });
      }

      await deleteMeeting(meetingId);
    } catch (error) {
      console.error(error);
      window.alert(
        locale === 'ar'
          ? 'فشل إرسال بريد الإلغاء أو حذف الاجتماع.'
          : 'Failed to send cancellation email or delete the meeting.',
      );
    } finally {
      setMeetingLoading(false);
    }
  };

  const selectedCount = selectedParticipants.length;

  const selectedNames = participants
    .filter(participant =>
      selectedParticipants.includes(participant.id),
    )
    .map(participant => participant.name);

  return {
    meetings,
    meetingLoading,

    isAddOpen,
    setIsAddOpen,

    editingMeeting,
    setEditingMeeting,

    newMeeting,
    setNewMeeting,

    selectedParticipants,
    setSelectedParticipants,
    selectedCount,
    selectedNames,

    showParticipantDropdown,
    setShowParticipantDropdown,

    emailSent,
    setEmailSent,

    resetMeetingForm,
    openNewMeeting,
    openNewMeetingForDate,
    openMeetingEditor,
    closeMeetingEditor,

    getMeetingDisplayTitle,
    getMeetingRequestReason,
    getMeetingAcknowledged,

    toggleParticipant,
    sendMeetingInvitations,
    handleSaveMeeting,
    handleDeleteMeeting,
  };
}

export type UseMeetingsResult = ReturnType<typeof useMeetings>;
