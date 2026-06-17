import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, push } from 'firebase/database';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfDay, isBefore } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, User, Mail, MessageSquare, Bot, X } from 'lucide-react';
import AIBookingAssistant from '../components/AIBookingAssistant';
import { sendEmailViaEmailJS } from '../services/gmail';

const BUSINESS_START = 9;
const BUSINESS_END = 20; // don't change this
const SLOT_DURATION = 0.5;

function timeToHour(t: string): number {
  const [hours, minutes] = t.split(':').map(Number);
  return hours + minutes / 60;
}

function hourToLabel(h: number, locale: 'en' | 'ar'): string {
  const isAr = locale === 'ar';

  const hour = Math.floor(h);
  const minutes = Math.round((h - hour) * 60);

  const period = hour >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function hourToTime(h: number): string {
  const hour = Math.floor(h);
  const minutes = Math.round((h - hour) * 60);

  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface ScheduleBlock {
  date: string;
  startHour: number;
  endHour: number;
  title: string;
  type: 'meeting' | 'available' | 'unavailable';
}

export default function BookingCalendar() {
  const { t, dir, locale } = useI18n();
  const dateLocale = locale === 'ar' ? ar : enUS;
  const displayLocale = locale as 'en' | 'ar';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showBookingFormPopup, setShowBookingFormPopup] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPastDay, setIsPastDay] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [pastors, setPastors] = useState<string[]>([]);

  useEffect(() => {
    const availabilityRef = ref(database, 'availability/');

    const unsubscribeAvailability = onValue(availabilityRef, (availabilitySnapshot) => {
      const availabilityData = availabilitySnapshot.val();
      const blocks: ScheduleBlock[] = [];

      if (availabilityData) {
        Object.values(availabilityData).forEach((val: any) => {
          if (val.date) {
            const startTime = val.startTime || '09:00';
            const endTime = val.endTime || '20:00';

            blocks.push({
              date: val.date,
              startHour: timeToHour(startTime),
              endHour: timeToHour(endTime),
              title: val.reason || t('booking.slotAvailable'),
              type: 'available',
            });
          }
        });
      }

      const meetingsRef = ref(database, 'meetings/');
      onValue(meetingsRef, (meetingsSnapshot) => {
        const meetingsData = meetingsSnapshot.val();
        const blocksWithMeetings = [...blocks];

        if (meetingsData) {
          Object.values(meetingsData).forEach((val: any) => {
            if (val.date && val.startTime && val.endTime) {
              blocksWithMeetings.push({
                date: val.date,
                startHour: timeToHour(val.startTime),
                endHour: timeToHour(val.endTime),
                title: t('booking.booked'),
                type: 'meeting',
              });
            }
          });
        }

        const unavailabilityRef = ref(database, 'unavailability/');
        onValue(unavailabilityRef, (unavailabilitySnapshot) => {
          const unavailabilityData = unavailabilitySnapshot.val();
          const finalBlocks = [...blocksWithMeetings];

          if (unavailabilityData) {
            Object.values(unavailabilityData).forEach((val: any) => {
              if (val.date) {
                const startTime = val.startTime || '00:00';
                const endTime = val.endTime || '23:59';

                finalBlocks.push({
                  date: val.date,
                  startHour: timeToHour(startTime),
                  endHour: timeToHour(endTime),
                  title: t('booking.booked'),
                  type: 'unavailable',
                });
              }
            });
          }

          setScheduleBlocks(finalBlocks);
        });
      });
    });

    return () => unsubscribeAvailability();
  }, [t]);

  useEffect(() => {
    const adminsRef = ref(database, 'admins/');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emails: string[] = [];
        Object.keys(data).forEach(k => {
          emails.push(k.replace(/,/g, '.').toLowerCase().trim());
        });
        setPastors(emails);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDay && isBefore(startOfDay(selectedDay), startOfDay(new Date()))) {
      setIsPastDay(true);
      setShowDayPopup(false);
      setShowBookingFormPopup(false);
    } else {
      setIsPastDay(false);
    }
  }, [selectedDay]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const isSlotInsideAvailability = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'available' &&
      hour >= b.startHour &&
      hour + SLOT_DURATION <= b.endHour
    );
  };

  const isSlotUnavailable = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotEnd = hour + SLOT_DURATION;

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'unavailable' &&
      hour < b.endHour &&
      slotEnd > b.startHour
    );
  };

  const isSlotBooked = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotEnd = hour + SLOT_DURATION;

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'meeting' &&
      hour < b.endHour &&
      slotEnd > b.startHour
    );
  };

  const isSlotInfeasible = (day: Date, hour: number): boolean => {
    if (hour < BUSINESS_START || hour + SLOT_DURATION > BUSINESS_END) return true;

    if (!isSlotInsideAvailability(day, hour)) return true;

    if (isSlotUnavailable(day, hour)) return true;

    const dayStr = format(day, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (dayStr === todayStr) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;

      if (hour <= currentHour) return true;
    }

    if (isBefore(startOfDay(day), startOfDay(new Date()))) return true;

    return false;
  };

  const slotStatus = (day: Date, hour: number): 'booked' | 'infeasible' | 'available' => {
    if (isSlotBooked(day, hour)) return 'booked';
    if (isSlotInfeasible(day, hour)) return 'infeasible';
    return 'available';
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return;

    setSelectedDay(day);
    setSelectedSlot(null);
    setSuccess(false);
    setShowDayPopup(true);
  };

  const handleSlotClick = (hour: number) => {
    if (!selectedDay || isSlotBooked(selectedDay, hour) || isSlotInfeasible(selectedDay, hour)) return;

    setSelectedSlot(hour);
    setSuccess(false);
  };

  const handlePopupSlotClick = (hour: number) => {
    handleSlotClick(hour);
    setShowDayPopup(false);
    setShowBookingFormPopup(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || selectedSlot === null) return;

    if (isSlotBooked(selectedDay, selectedSlot) || isSlotInfeasible(selectedDay, selectedSlot)) return;

    setLoading(true);

    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      const request = {
        name,
        email,
        date: dateStr,
        startTime: hourToTime(selectedSlot),
        endTime: hourToTime(selectedSlot + SLOT_DURATION),
        reason,
        requesterLocale: displayLocale,
        requesterLanguage: displayLocale === 'ar' ? 'Arabic' : 'English',
        status: 'pending',
        createdAt: Date.now(),
      };

      await push(ref(database, 'meetingRequests/'), request);

      for (const pastorEmail of pastors) {
        try {
          await sendEmailViaEmailJS(pastorEmail, {
            subject: `${t('booking.newMeetingRequestSubject')} ${name}`,
            fullReport: `${t('booking.newMeetingRequestBody')}\n\n${t('booking.name')}: ${name}\n${t('booking.emailLabel')}: ${email}\n${t('booking.date')}: ${dateStr}\n${t('booking.timeLabel')}: ${hourToLabel(selectedSlot, displayLocale)} - ${hourToLabel(selectedSlot + SLOT_DURATION, displayLocale)}\n${t('booking.reason')}: ${reason}\n\n${t('booking.adminInstructions')}`,
          });
        } catch (err) {
          console.error(`Failed to notify pastor ${pastorEmail}:`, err);
        }
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setReason('');
      setSelectedSlot(null);
      setShowDayPopup(false);
      setShowBookingFormPopup(true);
    } catch (err) {
      console.error(err);
      alert(t('booking.failed'));
    } finally {
      setLoading(false);
    }
  };

  const numberOfSlots = Math.floor((BUSINESS_END - BUSINESS_START) / SLOT_DURATION);

  const slotHours = Array.from({ length: numberOfSlots }).map((_, i) => BUSINESS_START + i * SLOT_DURATION);

  const availableSlotHours = selectedDay
    ? slotHours.filter(hour => slotStatus(selectedDay, hour) === 'available')
    : [];

  const selectedDayTitle = selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale }) : '';
  const availableLabel = t('booking.legendAvailable');
  const unavailableLabel = t('booking.unavailable');
  const availableShortLabel = displayLocale === 'ar' ? availableLabel : 'Avail.';
  const unavailableShortLabel = displayLocale === 'ar' ? unavailableLabel : 'Unavail.';

  const dayPopup = (
    <AnimatePresence>
      {selectedDay && !isPastDay && showDayPopup && (
        <motion.div
          key="booking-day-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-md px-4 py-6"
          onClick={() => setShowDayPopup(false)}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
        >
          <motion.div
            key="booking-day-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-[#fffdf9] shadow-2xl border border-[#ead9d0] font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#7a1717] px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setShowDayPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25 text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Clock size={24} />
                </div>

                <div>
                  <h3 className="text-2xl font-bold">
                    {availableLabel} {t('booking.timeLabel')}
                  </h3>
                  <p className="mt-1 text-base text-white/90">
                    {selectedDayTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-6">
              {availableSlotHours.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlotHours.map(hour => {
                    const isSel = selectedSlot === hour;

                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => handlePopupSlotClick(hour)}
                        className={`rounded-2xl border-2 p-5 text-base font-bold transition-all ${
                          isSel
                            ? 'scale-[1.02] border-[#7a1717] bg-[#7a1717] text-white shadow-lg'
                            : 'border-[#8ad0a1] bg-[#e8faee] text-[#165d30] hover:-translate-y-0.5 hover:border-[#62b77c] hover:bg-[#dcf7e5] hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={15} />
                          <span>{hourToLabel(hour, displayLocale)}</span>
                        </div>

                        <div className={`mt-2 text-base font-bold ${isSel ? 'text-white/90' : 'text-[#1e7a3a]'}`}>
                          {availableLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1]">
                    <AlertCircle size={30} className="text-[#b32626]" />
                  </div>

                  <p className="font-bold text-[#7a1717]">
                    {t('booking.noAvailabilityOpenedForDay')}
                  </p>

                  <p className="mt-2 text-base text-[#6b4b4b] font-bold">
                    {unavailableLabel}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const bookingFormPopup = (
    <AnimatePresence>
      {selectedDay && !isPastDay && showBookingFormPopup && selectedSlot !== null && (
        <motion.div
          key="booking-form-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 backdrop-blur-md px-4 py-6"
          onClick={() => {
            if (!loading) setShowBookingFormPopup(false);
          }}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
        >
          <motion.div
            key="booking-form-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-[#fffdf9] shadow-2xl border border-[#ead9d0] font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#7a1717] px-6 py-5 text-white">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowBookingFormPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <CheckCircle size={24} />
                </div>

                <div>
                  <h3 className="text-2xl font-bold">
                    {t('booking.bookFor')} {hourToLabel(selectedSlot, displayLocale)}
                  </h3>
                  <p className="mt-1 text-base text-white/90">
                    {selectedDayTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {success ? (
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-[#7a1717] mb-2">{t('booking.successTitle')}</h4>
                  <p className="text-[#6b4b4b] text-base">{t('booking.successDesc')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingFormPopup(false);
                      setSuccess(false);
                    }}
                    className="mt-6 px-6 py-3 rounded-xl bg-[#7a1717] text-white font-bold text-base hover:bg-[#5e1010] transition-colors"
                  >
                    {t('booking.close')}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest font-bold flex items-center gap-1 mb-1">
                      <User size={12} /> {t('booking.name')}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-[#fffdf9] border-2 border-[#ead9d0] rounded-xl focus:ring-2 focus:ring-[#7a1717]/25 focus:border-[#7a1717] outline-none text-base font-bold text-[#2b1717] placeholder:text-[#9b7b7b]"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('booking.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest font-bold flex items-center gap-1 mb-1">
                      <Mail size={12} /> {t('booking.email')}
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-3 bg-[#fffdf9] border-2 border-[#ead9d0] rounded-xl focus:ring-2 focus:ring-[#7a1717]/25 focus:border-[#7a1717] outline-none text-base font-bold text-[#2b1717] placeholder:text-[#9b7b7b]"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('booking.emailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest font-bold flex items-center gap-1 mb-1">
                      <MessageSquare size={12} /> {t('booking.reason')}
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-[#fffdf9] border-2 border-[#ead9d0] rounded-xl focus:ring-2 focus:ring-[#7a1717]/25 focus:border-[#7a1717] outline-none text-base font-bold text-[#2b1717] placeholder:text-[#9b7b7b] resize-none"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={t('booking.reasonPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setShowBookingFormPopup(false);
                        setShowDayPopup(true);
                      }}
                      className="py-3 bg-[#f4e8e2] text-[#7a1717] rounded-xl font-bold hover:bg-[#ead9d0] transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t('booking.close')}
                    </button>

                    <button
                      disabled={loading}
                      type="submit"
                      className="py-3 bg-[#7a1717] text-white rounded-xl font-bold shadow hover:bg-[#5e1010] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle size={14} /> {t('booking.submit')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="min-h-screen w-full space-y-6 sm:space-y-8 max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 bg-[#fbf7f2] text-[#2b1717] font-bold" dir={dir} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#7a1717] flex items-center gap-2 leading-tight">
              <CalendarIcon size={22} />
              {t('booking.pageTitle')}
            </h1>
            <p className="text-[#6b4b4b] text-base mt-2 font-bold">{t('booking.pageDesc')}</p>
          </div>
          <button
            onClick={() => setShowAi(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-[#f8eeee] hover:bg-[#efd8d8] text-[#7a1717] px-5 py-3 rounded-xl font-bold transition-colors text-base border border-[#d8aaaa] shadow-sm"
          >
            <Bot size={16} />
            {t('booking.aiAssistant')}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-base font-bold text-[#3a2424]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#dcf7e5] border-2 border-[#87c99c]"></div>
            {availableLabel}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#fff1f1] border-2 border-[#d89292]"></div>
            {unavailableLabel}
          </div>
        </div>

        <div className="bg-[#fffdf9] rounded-3xl shadow-md border border-[#ead9d0] p-3 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 hover:bg-[#f4e8e2] rounded-full transition-colors text-[#7a1717]"><ChevronLeft size={20} /></button>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2b1717]">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</h2>
              <p className="text-base text-[#7a1717]/70 uppercase tracking-widest font-bold mt-1">{t('calendar.schedule')}</p>
            </div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 hover:bg-[#f4e8e2] rounded-full transition-colors text-[#7a1717]"><ChevronRight size={20} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3">
            {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
              <div key={d} className="text-center text-sm sm:text-base uppercase tracking-widest text-[#6f4a4a] font-bold">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-x-1 gap-y-5 sm:gap-3">
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);
              const hasAvailableSlots = !isPast && slotHours.some(hour => slotStatus(day, hour) === 'available');

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`min-h-[86px] sm:min-h-[112px] rounded-2xl transition-all text-center px-0.5 py-1.5 sm:p-3 flex flex-col items-center justify-start gap-1.5 sm:gap-2 font-bold ${
                    isPast
                      ? 'text-[#a07c7c] cursor-not-allowed opacity-70'
                      : isSelected
                      ? 'text-[#7a1717]'
                      : hasAvailableSlots
                      ? 'text-[#165d30]'
                      : today
                      ? 'text-[#7a1717]'
                      : 'text-[#7a1717]'
                  }`}
                >
                  <div
                    className={`w-11 h-11 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all ${
                      isPast
                        ? 'bg-[#f5eeee] border-[#e2caca] text-[#a07c7c]'
                        : isSelected
                        ? 'bg-[#7a1717] border-[#7a1717] text-white shadow-lg'
                        : hasAvailableSlots
                        ? 'bg-[#e8faee] border-[#8ad0a1] text-[#165d30] shadow-sm'
                        : today
                        ? 'bg-[#fff1f1] border-[#d89292] text-[#7a1717] shadow-sm'
                        : 'bg-[#fff1f1] border-[#e0b5b5] text-[#7a1717]'
                    }`}
                  >
                    <span className="text-lg sm:text-2xl font-bold leading-none">
                      {format(day, 'd', { locale: dateLocale })}
                    </span>

                    {isPast && (
                      <span className="text-base sm:text-xl font-bold leading-none mt-1">✕</span>
                    )}
                  </div>

                  {!isPast && (
                    <div
                      className={`w-full min-h-[28px] sm:min-h-[24px] px-0.5 text-center font-bold leading-tight ${
                        isSelected
                          ? 'text-[#7a1717]'
                          : hasAvailableSlots
                          ? 'text-[#1e7a3a]'
                          : 'text-[#9a1c1c]'
                      }`}
                    >
                      <span className="block text-[11px] sm:hidden tracking-tight">
                        {hasAvailableSlots ? availableShortLabel : unavailableShortLabel}
                      </span>
                      <span className="hidden sm:block text-base">
                        {hasAvailableSlots ? availableLabel : unavailableLabel}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AIBookingAssistant isOpen={showAi} onClose={() => setShowAi(false)} />
      </div>

      {dayPopup}
      {bookingFormPopup}
    </>
  );
}
