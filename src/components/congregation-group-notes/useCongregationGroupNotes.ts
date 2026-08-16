import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '../../firebase';
import { useI18n } from '../../i18n';
import { getCongregationGroupAccess } from '../../services/congregationGroupNotes';
import { getNextPeopleDevelopmentMeetingOccurrence, type PeopleDevelopmentMeetingSchedule } from '../pastor/people-development';
import { getGroupConfig, getGroupDescription, getGroupLabel } from './congregationGroupNotes.config';
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
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeUid, setActiveUid] = useState('');
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

  const clearPortalData = useCallback(() => {
    setActiveUid('');
    setProfile(null);
    setAssignments([]);
    setMeetingSchedules([]);
    setAssignmentsLoading(false);
    setMeetingSchedulesLoading(false);
  }, []);

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) {
      clearPortalData();
      return;
    }
    setAssignmentsLoading(true);
    setMeetingSchedulesLoading(true);
    void getCongregationGroupAccess()
      .then(data => {
        applyPortalData(data);
        setActiveUid(user.uid);
        setEmailInput(user.email || '');
        setLoginStatus('success');
      })
      .catch(error => {
        console.error('Failed to restore People Notes access:', error);
        clearPortalData();
      });
  }), [applyPortalData, clearPortalData]);

  useEffect(() => {
    if (!activeUid) return undefined;
    const timer = window.setInterval(() => {
      void getCongregationGroupAccess()
        .then(applyPortalData)
        .catch(error => console.error('Failed to refresh People Notes access:', error));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [activeUid, applyPortalData]);

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
      if (!openedWindow) window.alert(isAr ? 'حظر المتصفح فتح الملف. جرّب زر التنزيل.' : 'The browser blocked opening the file. Try the download button.');
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
      window.alert(isAr ? 'تعذر تنزيل ملف PDF.' : 'Could not download the PDF file.');
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !passwordInput) {
      setLoginStatus('error');
      setLoginMessage(isAr ? 'أدخل البريد الإلكتروني وكلمة المرور.' : 'Enter your email and password.');
      return;
    }
    setLoginStatus('loading');
    setLoginMessage('');
    setAssignmentsLoading(true);
    setMeetingSchedulesLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, passwordInput);
      const data = await getCongregationGroupAccess();
      applyPortalData(data);
      setActiveUid(credential.user.uid);
      setPasswordInput('');
      setLoginStatus('success');
    } catch (error) {
      console.error('People Notes Firebase login failed:', error);
      clearPortalData();
      setLoginStatus('error');
      setLoginMessage(error instanceof Error ? error.message : 'The email, password, or People Notes linkage is invalid.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth).catch(error => console.error('People Notes logout failed:', error));
    clearPortalData();
    setMeetingCalendarMonth(new Date());
    setIsMeetingCalendarExpanded(false);
    setSearchTerm('');
    setSelectedAssignment(null);
    setLoginStatus('idle');
    setLoginMessage('');
  };

  return {
    dir, isAr, displayLocale, emailInput, setEmailInput, passwordInput, setPasswordInput,
    loginStatus, loginMessage, profile, assignments, assignmentsLoading, searchTerm,
    setSearchTerm, selectedAssignment, setSelectedAssignment, meetingSchedules,
    meetingSchedulesLoading, meetingCalendarMonth, setMeetingCalendarMonth,
    isMeetingCalendarExpanded, setIsMeetingCalendarExpanded, groupConfig, groupLabel,
    groupDescription, filteredAssignments, latestAssignment, nextGroupMeeting,
    nextSharedMeeting, openAttachment, downloadAttachment, handleLogin, handleLogout,
  };
}

export type CongregationGroupNotesController = ReturnType<typeof useCongregationGroupNotes>;
