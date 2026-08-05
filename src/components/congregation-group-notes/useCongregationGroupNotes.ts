import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { getCongregationGroupAccess } from '../../services/congregationGroupNotes';
import { getNextPeopleDevelopmentMeetingOccurrence, type PeopleDevelopmentMeetingSchedule } from '../pastor/people-development';
import {
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
} from './congregationGroupNotes.types';
import { createDecodedAttachmentUrl, getMeetingOccurrenceTimestamp } from './congregationGroupNotes.utils';

export default function useCongregationGroupNotes() {
  const { dir, locale } = useI18n();
  const rawLocale = String(locale || '').toLowerCase();
  const isAr = rawLocale === 'ar' || rawLocale.startsWith('ar-') || rawLocale.startsWith('arabic') || dir === 'rtl';
  const displayLocale: 'en' | 'ar' = isAr ? 'ar' : 'en';
  const [identifierInput, setIdentifierInput] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem(SAVED_IDENTIFIER_STORAGE_KEY) || '',
  );
  const [activeIdentifier, setActiveIdentifier] = useState('');
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

  const applyPortalData = useCallback((data: Awaited<ReturnType<typeof getCongregationGroupAccess>>) => {
    setProfile(data.profile);
    setAssignments(data.assignments);
    setMeetingSchedules(data.schedules);
    setAssignmentsLoading(false);
    setMeetingSchedulesLoading(false);
  }, []);

  useEffect(() => {
    if (!activeIdentifier) return undefined;
    const timer = window.setInterval(() => {
      void getCongregationGroupAccess(activeIdentifier)
        .then(applyPortalData)
        .catch(error => console.error('Failed to refresh group access:', error));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [activeIdentifier, applyPortalData]);

  const groupConfig = getGroupConfig(profile?.group || '');
  const groupLabel = profile?.group ? getGroupLabel(profile.group, displayLocale) : '';
  const groupDescription = profile?.group ? getGroupDescription(profile.group, displayLocale) : '';
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
        const occurrence = getNextPeopleDevelopmentMeetingOccurrence(schedule, now, displayLocale);
        return occurrence ? { schedule, occurrence } : null;
      })
      .filter((summary): summary is NextMeetingSummary => Boolean(summary))
      .sort((first, second) => getMeetingOccurrenceTimestamp(first.occurrence) - getMeetingOccurrenceTimestamp(second.occurrence));
  }, [meetingSchedules, displayLocale]);
  const nextGroupMeeting = nextMeetingSummaries.find(summary => summary.schedule.audience === 'group') || null;
  const nextSharedMeeting = nextMeetingSummaries.find(summary => summary.schedule.audience === 'shared') || null;

  const openAttachment = (attachment: GroupAssignmentAttachment) => {
    try {
      const attachmentUrl = createDecodedAttachmentUrl(attachment);
      const openedWindow = window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) window.alert(isAr ? 'تم منع فتح الملف من المتصفح. جرّب زر التحميل.' : 'The browser blocked opening the file. Try the download button.');
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
    setAssignmentsLoading(true);
    setMeetingSchedulesLoading(true);
    try {
      const data = await getCongregationGroupAccess(identifier);
      applyPortalData(data);
      setActiveIdentifier(identifier);
      setLoginStatus('success');
      window.localStorage.setItem(SAVED_IDENTIFIER_STORAGE_KEY, identifier);
    } catch (error) {
      console.error('Identifier login failed:', error);
      setProfile(null);
      setAssignments([]);
      setMeetingSchedules([]);
      setAssignmentsLoading(false);
      setMeetingSchedulesLoading(false);
      setLoginStatus('error');
      setLoginMessage(isAr ? 'لم يتم العثور على هذا الرمز أو لا توجد مجموعة مخصصة له.' : 'Identifier not found or no group is assigned.');
    }
  };

  const handleLogout = () => {
    setActiveIdentifier('');
    setProfile(null);
    setAssignments([]);
    setMeetingSchedules([]);
    setMeetingCalendarMonth(new Date());
    setIsMeetingCalendarExpanded(false);
    setSearchTerm('');
    setSelectedAssignment(null);
    setLoginStatus('idle');
    setLoginMessage('');
    window.localStorage.removeItem(SAVED_IDENTIFIER_STORAGE_KEY);
  };

  return {
    dir, isAr, displayLocale, identifierInput, setIdentifierInput, loginStatus, loginMessage,
    profile, assignments, assignmentsLoading, searchTerm, setSearchTerm, selectedAssignment,
    setSelectedAssignment, meetingSchedules, meetingSchedulesLoading, meetingCalendarMonth,
    setMeetingCalendarMonth, isMeetingCalendarExpanded, setIsMeetingCalendarExpanded,
    groupConfig, groupLabel, groupDescription, filteredAssignments, latestAssignment,
    nextGroupMeeting, nextSharedMeeting, openAttachment, downloadAttachment, handleLogin, handleLogout,
  };
}

export type CongregationGroupNotesController = ReturnType<typeof useCongregationGroupNotes>;
