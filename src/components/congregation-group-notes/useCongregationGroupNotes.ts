import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '../../firebase';
import { useI18n } from '../../i18n';
import {
  getNextPeopleDevelopmentMeetingOccurrence,
  getPeopleDevelopmentMeetingSchedulesForGroup,
  subscribeToPeopleDevelopmentMeetingSchedules,
  type PeopleDevelopmentMeetingSchedule,
} from '../pastor/people-development';
import {
  PEOPLE_DEVELOPMENT_ROOT,
  SAVED_IDENTIFIER_STORAGE_KEY,
  getGroupConfig,
  getGroupDescription,
  getGroupLabel,
} from './congregationGroupNotes.config';
import type {
  GroupAssignment,
  GroupAssignmentAttachment,
  LoginStatus,
  MemberProfile,
  NextMeetingSummary,
  PeopleDevelopmentGroupId,
} from './congregationGroupNotes.types';
import {
  createDecodedAttachmentUrl,
  getMeetingOccurrenceTimestamp,
  normalizeAssignment,
} from './congregationGroupNotes.utils';
import { findProfileByIdentifier } from './congregationGroupNotes.repository';

export default function useCongregationGroupNotes() {
  const { dir, locale } = useI18n();
  const rawLocale = String(locale || '').toLowerCase();
  const isAr = rawLocale === 'ar' || rawLocale.startsWith('ar-') || rawLocale.startsWith('arabic') || dir === 'rtl';
  const displayLocale: 'en' | 'ar' = isAr ? 'ar' : 'en';
  const [identifierInput, setIdentifierInput] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : window.localStorage.getItem(SAVED_IDENTIFIER_STORAGE_KEY) || '',
  );
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [loginMessage, setLoginMessage] = useState('');
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<GroupAssignment | null>(null);
  const [meetingSchedules, setMeetingSchedules] = useState<PeopleDevelopmentMeetingSchedule[]>([]);
  const [meetingSchedulesLoading, setMeetingSchedulesLoading] = useState(false);
  const [meetingCalendarMonth, setMeetingCalendarMonth] = useState(new Date());
  const [isMeetingCalendarExpanded, setIsMeetingCalendarExpanded] = useState(false);

  const groupConfig = getGroupConfig(profile?.group || '');
  const groupLabel = profile?.group ? getGroupLabel(profile.group, displayLocale) : '';
  const groupDescription = profile?.group ? getGroupDescription(profile.group, displayLocale) : '';

  useEffect(() => {
    const groupId = profile?.group;

    if (!groupId) {
      return undefined;
    }

    const assignmentsRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`);

    const unsubscribe = onValue(
      assignmentsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setAssignments([]);
          setAssignmentsLoading(false);
          return;
        }

        const parsed = Object.entries(data)
          .map(([id, value]) => normalizeAssignment(id, value, displayLocale))
          .filter((assignment): assignment is GroupAssignment => Boolean(assignment && assignment.groups.includes(groupId)))
          .sort((a, b) => b.createdAt - a.createdAt);

        setAssignments(parsed);
        setAssignmentsLoading(false);
      },
      (error) => {
        console.error('Failed to load group assignments:', error);
        setAssignments([]);
        setAssignmentsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [profile?.group, displayLocale]);

  useEffect(() => {
    if (!profile?.group) {
      return undefined;
    }

    return subscribeToPeopleDevelopmentMeetingSchedules(
      schedules => {
        setMeetingSchedules(
          getPeopleDevelopmentMeetingSchedulesForGroup(
            schedules,
            profile.group as PeopleDevelopmentGroupId,
          ).filter(schedule => schedule.active),
        );
        setMeetingSchedulesLoading(false);
      },
      error => {
        console.error('Failed to load group meeting schedules:', error);
        setMeetingSchedules([]);
        setMeetingSchedulesLoading(false);
      },
    );
  }, [profile?.group]);

  const filteredAssignments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return assignments;

    return assignments.filter(assignment =>
      assignment.text.toLowerCase().includes(search) ||
      assignment.date.toLowerCase().includes(search) ||
      assignment.createdAtISO.toLowerCase().includes(search) ||
      assignment.attachments.some(attachment => attachment.name.toLowerCase().includes(search)),
    );
  }, [assignments, searchTerm]);

  const latestAssignment = assignments[0] || null;

  const nextMeetingSummaries = useMemo<NextMeetingSummary[]>(() => {
    const now = new Date();

    return meetingSchedules
      .map(schedule => {
        const occurrence = getNextPeopleDevelopmentMeetingOccurrence(
          schedule,
          now,
          displayLocale,
        );

        return occurrence
          ? { schedule, occurrence }
          : null;
      })
      .filter((summary): summary is NextMeetingSummary => Boolean(summary))
      .sort(
        (first, second) =>
          getMeetingOccurrenceTimestamp(first.occurrence) -
          getMeetingOccurrenceTimestamp(second.occurrence),
      );
  }, [meetingSchedules, displayLocale]);

  const nextGroupMeeting = nextMeetingSummaries.find(
    summary => summary.schedule.audience === 'group',
  ) || null;

  const nextSharedMeeting = nextMeetingSummaries.find(
    summary => summary.schedule.audience === 'shared',
  ) || null;

  const openAttachment = (attachment: GroupAssignmentAttachment) => {
    try {
      const attachmentUrl = createDecodedAttachmentUrl(attachment);
      const openedWindow = window.open(attachmentUrl, '_blank', 'noopener,noreferrer');

      if (!openedWindow) {
        window.alert(isAr ? 'تم منع فتح الملف من المتصفح. جرّب زر التحميل.' : 'The browser blocked opening the file. Try the download button.');
      }

      window.setTimeout(() => window.URL.revokeObjectURL(attachmentUrl), 60_000);
    } catch (error) {
      console.error('Failed to open assignment attachment:', error);
      window.alert(isAr ? 'تعذر فتح ملف PDF.' : 'Could not open the PDF file.');
    }
  };

  const downloadAttachment = (attachment: GroupAssignmentAttachment) => {
    try {
      const attachmentUrl = createDecodedAttachmentUrl(attachment);
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.download = attachment.name || 'assignment.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(attachmentUrl), 10_000);
    } catch (error) {
      console.error('Failed to download assignment attachment:', error);
      window.alert(isAr ? 'تعذر تحميل ملف PDF.' : 'Could not download the PDF file.');
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const identifier = identifierInput.trim();

    if (!identifier) {
      setLoginStatus('error');
      setLoginMessage(isAr ? 'اكتب رمز العبور الشخصي أولاً.' : 'Enter your personal identifier first.');
      return;
    }

    setLoginStatus('loading');
    setLoginMessage('');
    setProfile(null);
    setAssignments([]);

    try {
      const foundProfile = await findProfileByIdentifier(identifier, displayLocale);

      if (!foundProfile) {
        setLoginStatus('error');
        setLoginMessage(isAr ? 'لم يتم العثور على هذا الرمز. تأكد من كتابته كما وصلك.' : 'Identifier not found. Make sure you entered it exactly as received.');
        return;
      }

      setProfile(foundProfile);
      setAssignmentsLoading(Boolean(foundProfile.group));
      setMeetingSchedulesLoading(Boolean(foundProfile.group));
      setLoginStatus('success');
      setLoginMessage('');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SAVED_IDENTIFIER_STORAGE_KEY, identifier);
      }
    } catch (error) {
      console.error('Identifier login failed:', error);
      setLoginStatus('error');
      setLoginMessage(isAr ? 'تعذر تسجيل الدخول الآن. حاول مرة أخرى.' : 'Could not log in right now. Please try again.');
    }
  };

  const handleLogout = () => {
    setProfile(null);
    setAssignments([]);
    setAssignmentsLoading(false);
    setMeetingSchedules([]);
    setMeetingSchedulesLoading(false);
    setMeetingCalendarMonth(new Date());
    setIsMeetingCalendarExpanded(false);
    setSearchTerm('');
    setSelectedAssignment(null);
    setLoginStatus('idle');
    setLoginMessage('');

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SAVED_IDENTIFIER_STORAGE_KEY);
    }
  };

  return {
    dir,
    isAr,
    displayLocale,
    identifierInput,
    setIdentifierInput,
    loginStatus,
    loginMessage,
    profile,
    assignments,
    assignmentsLoading,
    searchTerm,
    setSearchTerm,
    selectedAssignment,
    setSelectedAssignment,
    meetingSchedules,
    meetingSchedulesLoading,
    meetingCalendarMonth,
    setMeetingCalendarMonth,
    isMeetingCalendarExpanded,
    setIsMeetingCalendarExpanded,
    groupConfig,
    groupLabel,
    groupDescription,
    filteredAssignments,
    latestAssignment,
    nextGroupMeeting,
    nextSharedMeeting,
    openAttachment,
    downloadAttachment,
    handleLogin,
    handleLogout,
  };
}

export type CongregationGroupNotesController = ReturnType<typeof useCongregationGroupNotes>;
