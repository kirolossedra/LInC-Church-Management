import { useState } from 'react';

import {
  chatWithPastorBezalel,
  type BezalelMessage,
  type PastorBezalelResult,
} from '../../services/bezalel';
import {
  createPastorCalendarBlock,
  decidePastorMeetingRequest,
  deletePastorCalendarBlock,
} from '../../services/pastorCalendar';
import BezalelChat, { type BezalelActivity } from './BezalelChat';

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

  const send = async (content: string) => {
    const nextMessages: BezalelMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setActivity('thinking');
    try {
      const result = await chatWithPastorBezalel(nextMessages, locale);
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
      if (result.focusDate) onFocusDate(result.focusDate);
      if (result.action !== 'none') {
        setActivity('acting');
        await executeAction(result);
        await onCalendarChanged();
        setActivity('success');
        window.setTimeout(() => setActivity('idle'), 1400);
      } else {
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

  return <BezalelChat title="Bezalel" subtitle="Pastor Calendar steward" messages={messages} activity={activity} onSend={send} quickPrompts={locale === 'ar' ? ['لخص هذا الأسبوع', 'ما هو أقرب وقت متاح؟'] : ['Summarize this week', 'What is the next open booking time?', 'Show pending requests']} />;
}

async function executeAction(result: PastorBezalelResult) {
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
