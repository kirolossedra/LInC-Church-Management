import { useRef, useState } from 'react';

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
      : 'I am Bezalel. I can review the calendar, open or close booking times, and help manage pending requests.',
  }]);
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
    const nextMessages: BezalelMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setActivity('thinking');
    try {
      const result = await chatWithPastorBezalel(nextMessages, locale);
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
      const hasJourney = beginCalendarJourney([
        ...result.focusDates,
        ...result.actions.map(action => action.date),
      ]);
      if (hasJourney || result.actions.length > 0) setActivity('acting');
      if (result.actions.length > 0) {
        for (const action of result.actions) await executeAction(action);
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
      travelRequest={travelRequest}
      onPrepareTravelTarget={target => onFocusDate(target.date)}
      onTravelComplete={finishCalendarJourney}
      quickPrompts={locale === 'ar'
        ? ['لخص هذا الأسبوع', 'ما هو أقرب وقت متاح؟']
        : ['Summarize this week', 'What is the next open booking time?', 'Show pending requests']}
    />
  );
}

async function executeAction(result: PastorBezalelCalendarAction) {
  if (result.action === 'open_availability' || result.action === 'block_time') {
    await createPastorCalendarBlock(
      result.action === 'open_availability' ? 'availability' : 'unavailability',
      {
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        reason: result.reason,
        allDay: false,
      },
    );
  } else if (result.action === 'delete_availability' || result.action === 'delete_unavailability') {
    await deletePastorCalendarBlock(
      result.action === 'delete_availability' ? 'availability' : 'unavailability',
      result.targetId,
    );
  } else if (result.action === 'accept_request' || result.action === 'reject_request') {
    await decidePastorMeetingRequest(
      result.targetId,
      result.action === 'accept_request' ? 'accepted' : 'rejected',
      result.meetingTitle || 'Meeting with Pastor',
    );
  }
}
