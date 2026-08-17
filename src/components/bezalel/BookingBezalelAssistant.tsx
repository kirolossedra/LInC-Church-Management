import { useRef, useState } from 'react';

import {
  chatWithBookingBezalel,
  type BezalelMessage,
} from '../../services/bezalel';
import { createPublicBooking } from '../../services/booking';
import BezalelChat, {
  type BezalelActivity,
  type BezalelTravelRequest,
} from './BezalelChat';

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
    timestamp: new Date().toISOString(),
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
        targetSelector: `[data-booking-date="${date}"]`,
        ariaLabel: locale === 'ar'
          ? `بصلئيل يستعرض ${date}`
          : `Bezalel is reviewing ${date}`,
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
      const result = await chatWithBookingBezalel(nextMessages, locale);
      setMessages(current => [...current, { role: 'assistant', content: result.reply, timestamp: new Date().toISOString() }]);
      const hasJourney = beginCalendarJourney([
        result.focusDate,
        ...result.suggestions.map(suggestion => suggestion.date),
        result.booking.date,
      ]);
      if (result.stage === 'ready_to_book') {
        setActivity('acting');
        await createPublicBooking({ ...result.booking, requesterLocale: locale });
        onBooked();
        setMessages(current => [...current, {
          role: 'assistant',
          content: locale === 'ar'
            ? 'تم إرسال طلب الحجز إلى الراعي للمراجعة.'
            : 'Your booking request was sent to the Pastor for review.',
          timestamp: new Date().toISOString(),
        }]);
        setActivity('success');
        if (!hasJourney) window.setTimeout(() => setActivity('idle'), 1400);
      } else if (hasJourney) {
        setActivity('acting');
      } else {
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
      subtitle="Appointment guide"
      messages={messages}
      activity={activity}
      onSend={send}
      participant="Booking visitor"
      participantRole="Visitor"
      travelRequest={travelRequest}
      onPrepareTravelTarget={target => onFocusDate(target.date)}
      onTravelComplete={finishCalendarJourney}
      quickPrompts={locale === 'ar'
        ? ['ما هو أقرب موعد متاح؟', 'اعرض كل المواعيد المتاحة']
        : ['What is the next available day?', 'Survey all available dates', 'Help me book the first opening']}
    />
  );
}
