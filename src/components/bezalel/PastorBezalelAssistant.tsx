import { useRef, useState } from 'react';

import { auth } from '../../firebase';
import {
  createPeopleDevelopmentMeetingSchedule,
  deletePeopleDevelopmentMeetingSchedule,
  updatePeopleDevelopmentMeetingSchedule,
} from '../../services/peopleDevelopment';
import type { PeopleDevelopmentGroupId } from '../pastor/people-development/peopleDevelopment.types';
import {
  chatWithPastorBezalel,
  type BezalelMessage,
  type PastorBezalelCalendarAction,
} from '../../services/bezalel';
import {
  createPastorCalendarBlock,
  decidePastorMeetingRequest,
  deletePastorCalendarBlock,
} from '../../services/pastorCalendar';
import BezalelChat, {
  type BezalelActivity,
  type BezalelTravelRequest,
} from './BezalelChat';
import type { BezalelActionRecord } from './bezalelExport';

export default function PastorBezalelAssistant({
  locale,
  onFocusDate,
  onCalendarChanged,
}: {
  locale: 'en' | 'ar';
  onFocusDate: (date: string) => void;
  onCalendarChanged: () => Promise<void> | void;
}) {
  const [messages, setMessages] = useState<BezalelMessage[]>([{
    role: 'assistant',
    content: locale === 'ar'
      ? 'أنا بصلئيل. يمكنني مراجعة التقويم وفتح أو إغلاق أوقات الحجز وإدارة الطلبات المعلقة.'
      : 'I am Bezalel. I can review the calendar, manage booking times and requests, and maintain recurring group meetings.',
    timestamp: new Date().toISOString(),
  }]);
  const [actionLog, setActionLog] = useState<BezalelActionRecord[]>([]);
  const [activity, setActivity] = useState<BezalelActivity>('idle');
  const [travelRequest, setTravelRequest] = useState<BezalelTravelRequest>();
  const travelSequence = useRef(0);

  const beginCalendarJourney = (dates: string[]) => {
    const distinctDates = [...new Set(dates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))];
    if (distinctDates.length === 0) return false;
    travelSequence.current += 1;
    setTravelRequest({
      id: travelSequence.current,
      targets: distinctDates.map(date => ({
        date,
        targetSelector: `[data-calendar-date="${date}"]`,
        ariaLabel: locale === 'ar'
          ? `بصلئيل يعمل على ${date}`
          : `Bezalel is working on ${date}`,
      })),
    });
    return true;
  };

  const finishCalendarJourney = () => {
    setActivity(current => {
      if (current === 'error') return current;
      window.setTimeout(() => setActivity('idle'), 750);
      return 'success';
    });
  };

  const send = async (content: string) => {
    const nextMessages: BezalelMessage[] = [...messages, { role: 'user', content, timestamp: new Date().toISOString() }];
    setMessages(nextMessages);
    setActivity('thinking');
    try {
      const result = await chatWithPastorBezalel(nextMessages, locale);
      setMessages(current => [...current, { role: 'assistant', content: result.reply, timestamp: new Date().toISOString() }]);
      const hasJourney = beginCalendarJourney([
        ...result.focusDates,
        ...result.actions.map(action => action.date),
      ]);
      if (hasJourney || result.actions.length > 0) setActivity('acting');
      if (result.actions.length > 0) {
        for (const action of result.actions) {
          const recordId = createRecordId();
          const requestedAt = new Date().toISOString();
          const record: BezalelActionRecord = {
            id: recordId,
            requestedAt,
            status: 'started',
            action: action.action,
            date: action.date || action.startDate,
            targetId: action.targetId,
            details: { ...action },
          };
          setActionLog(current => [...current, record]);
          try {
            const resultTargetId = await executeAction(action);
            setActionLog(current => current.map(item => item.id === recordId ? {
              ...item,
              status: 'succeeded',
              completedAt: new Date().toISOString(),
              resultTargetId,
            } : item));
          } catch (actionError) {
            setActionLog(current => current.map(item => item.id === recordId ? {
              ...item,
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: actionError instanceof Error ? actionError.message : 'Calendar action failed.',
            } : item));
            throw actionError;
          }
        }
        await onCalendarChanged();
        setActivity('success');
        if (!hasJourney) window.setTimeout(() => setActivity('idle'), 1400);
      } else if (!hasJourney) {
        setActivity('idle');
      }
    } catch (error) {
      setActivity('error');
      setMessages(current => [...current, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I could not complete that request.',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  return (
    <BezalelChat
      title="Bezalel"
      subtitle="Pastor Calendar steward"
      messages={messages}
      activity={activity}
      onSend={send}
      participant={auth.currentUser?.displayName?.trim() || auth.currentUser?.email || 'Signed-in calendar manager'}
      participantRole={auth.currentUser?.email?.toLowerCase() === 'rev.ibrahim@lincministry.com' ? 'Pastor' : 'Administrator'}
      actionLog={actionLog}
      travelRequest={travelRequest}
      onPrepareTravelTarget={target => onFocusDate(target.date)}
      onTravelComplete={finishCalendarJourney}
      quickPrompts={locale === 'ar'
        ? ['لخص هذا الأسبوع', 'ما هو أقرب وقت متاح؟']
        : ['Summarize this week', 'What is the next open booking time?', 'Show pending requests']}
    />
  );
}

async function executeAction(result: PastorBezalelCalendarAction): Promise<string | undefined> {
  if (result.action === 'open_availability' || result.action === 'block_time') {
    const created = await createPastorCalendarBlock(
      result.action === 'open_availability' ? 'availability' : 'unavailability',
      {
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        reason: result.reason,
        allDay: false,
      },
    );
    return created.id;
  } else if (result.action === 'delete_availability' || result.action === 'delete_unavailability') {
    await deletePastorCalendarBlock(
      result.action === 'delete_availability' ? 'availability' : 'unavailability',
      result.targetId,
    );
    return result.targetId;
  } else if (result.action === 'accept_request' || result.action === 'reject_request') {
    const decision = await decidePastorMeetingRequest(
      result.targetId,
      result.action === 'accept_request' ? 'accepted' : 'rejected',
      result.meetingTitle || 'Meeting with Pastor',
    );
    return decision.meetingId || result.targetId;
  } else if (result.action === 'create_group_schedule') {
    return createPeopleDevelopmentMeetingSchedule({
      audience: result.audience,
      group: result.group as PeopleDevelopmentGroupId | '',
      ordinal: result.ordinal,
      weekday: result.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: result.startTime,
      durationMinutes: result.durationMinutes,
      startDate: result.startDate,
      endDate: result.endDate,
      active: result.active,
      createdAt: Date.now(),
      createdAtISO: new Date().toISOString(),
      updatedAt: Date.now(),
      updatedAtISO: new Date().toISOString(),
    });
  } else if (result.action === 'update_group_schedule') {
    await updatePeopleDevelopmentMeetingSchedule(result.targetId, {
      audience: result.audience,
      group: result.group as PeopleDevelopmentGroupId | '',
      ordinal: result.ordinal,
      weekday: result.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: result.startTime,
      durationMinutes: result.durationMinutes,
      startDate: result.startDate,
      endDate: result.endDate,
      active: result.active,
    });
    return result.targetId;
  } else if (result.action === 'set_group_schedule_active') {
    await updatePeopleDevelopmentMeetingSchedule(result.targetId, { active: result.active });
    return result.targetId;
  } else if (result.action === 'delete_group_schedule') {
    await deletePeopleDevelopmentMeetingSchedule(result.targetId);
    return result.targetId;
  }
}

function createRecordId() {
  return globalThis.crypto?.randomUUID?.() || `action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
