import { useState } from 'react';

import {
  chatWithBookingBezalel,
  type BezalelMessage,
} from '../../services/bezalel';
import { createPublicBooking } from '../../services/booking';
import BezalelChat, { type BezalelActivity } from './BezalelChat';

export default function BookingBezalelAssistant({
  locale,
  onFocusDate,
  onBooked,
}: {
  locale: 'en' | 'ar';
  onFocusDate: (date: string) => void;
  onBooked: () => void;
}) {
  const [messages, setMessages] = useState<BezalelMessage[]>([{
    role: 'assistant',
    content: locale === 'ar'
      ? 'أنا بصلئيل. يمكنني إيجاد أقرب موعد متاح ومساعدتك في إرسال طلب الحجز.'
      : 'I am Bezalel. I can find the next available appointment and help prepare your booking request.',
  }]);
  const [activity, setActivity] = useState<BezalelActivity>('idle');

  const send = async (content: string) => {
    const nextMessages: BezalelMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setActivity('thinking');
    try {
      const result = await chatWithBookingBezalel(nextMessages, locale);
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
      if (result.focusDate) onFocusDate(result.focusDate);
      if (result.stage === 'ready_to_book') {
        setActivity('acting');
        await createPublicBooking({ ...result.booking, requesterLocale: locale });
        onBooked();
        setMessages(current => [...current, {
          role: 'assistant',
          content: locale === 'ar'
            ? 'تم إرسال طلب الحجز إلى الراعي للمراجعة.'
            : 'Your booking request was sent to the Pastor for review.',
        }]);
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

  return <BezalelChat title="Bezalel" subtitle="Appointment guide" messages={messages} activity={activity} onSend={send} quickPrompts={locale === 'ar' ? ['ما هو أقرب موعد متاح؟', 'اعرض كل المواعيد المتاحة'] : ['What is the next available day?', 'Survey all available dates', 'Help me book the first opening']} />;
}
