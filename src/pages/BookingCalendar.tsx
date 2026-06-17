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

const APP_FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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

  const getDayBlocks = (day: Date): ScheduleBlock[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return scheduleBlocks.filter(b => b.date === dayStr);
  };

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

  const dayPopup = (
    <AnimatePresence>
      {selectedDay && !isPastDay && showDayPopup && (
        <motion.div
          key="booking-day-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2a0f0f]/55 backdrop-blur-md px-4 py-6"
          onClick={() => setShowDayPopup(false)}
          dir={dir}
          style={{ fontFamily: APP_FONT }}
        >
          <motion.div
            key="booking-day-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2rem] bg-[#fffdfb] shadow-[0_28px_90px_rgba(70,16,16,0.32)] border border-[#ead7d7]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-[#8b1e1e] via-[#741818] to-[#4f1010] px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setShowDayPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-[#fffdfb]/15 p-2 text-white transition-colors hover:bg-[#fffdfb]/25 ring-1 ring-white/20"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fffdfb]/15 ring-1 ring-white/20">
                  <Clock size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">
                    {t('booking.legendAvailable')} {t('booking.timeLabel')}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-white/85">
                    {selectedDayTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto bg-[#fffdfb] p-6">
              {availableSlotHours.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlotHours.map(hour => {
                    const isSel = selectedSlot === hour;

                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => handlePopupSlotClick(hour)}
                        className={`rounded-2xl border p-4 text-sm font-extrabold transition-all ${
                          isSel
                            ? 'scale-[1.02] border-[#7f1d1d] bg-gradient-to-br from-[#8b1e1e] to-[#5f1414] text-white shadow-lg'
                            : 'border-[#bde9c8] bg-[#f2fbf4] text-[#206a38] hover:-translate-y-0.5 hover:border-[#8b1e1e]/35 hover:bg-[#fffdfb] hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={15} />
                          <span>{hourToLabel(hour, displayLocale)}</span>
                        </div>

                        <div className={`mt-1 text-[10px] ${isSel ? 'text-white/80' : 'text-[#2f8f4e]'}`}>
                          {t('booking.slotAvailable')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1]">
                    <AlertCircle size={30} className="text-[#b91c1c]" />
                  </div>

                  <p className="font-extrabold text-[#7f1d1d]">
                    {t('booking.noAvailabilityOpenedForDay')}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#6b5f5f]">
                    {t('booking.legendInfeasible')}
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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#2a0f0f]/55 backdrop-blur-md px-4 py-6"
          onClick={() => {
            if (!loading) setShowBookingFormPopup(false);
          }}
          dir={dir}
          style={{ fontFamily: APP_FONT }}
        >
          <motion.div
            key="booking-form-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-[#fffdfb] shadow-[0_28px_90px_rgba(70,16,16,0.32)] border border-[#ead7d7]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-[#8b1e1e] via-[#741818] to-[#4f1010] px-6 py-5 text-white">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowBookingFormPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-[#fffdfb]/15 p-2 text-white transition-colors hover:bg-[#fffdfb]/25 ring-1 ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fffdfb]/15 ring-1 ring-white/20">
                  <CheckCircle size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">
                    {t('booking.bookFor')} {hourToLabel(selectedSlot, displayLocale)}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-white/85">
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
                  <div className="w-16 h-16 bg-[#f0fbf2] rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-[#bde9c8]">
                    <CheckCircle size={32} className="text-[#206a38]" />
                  </div>
                  <h4 className="text-xl font-extrabold text-[#7f1d1d] mb-2">{t('booking.successTitle')}</h4>
                  <p className="text-gray-500 text-sm">{t('booking.successDesc')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingFormPopup(false);
                      setSuccess(false);
                    }}
                    className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#8b1e1e] to-[#5f1414] text-white font-extrabold text-sm hover:from-[#7f1d1d] hover:to-[#4f1010] transition-colors shadow-md"
                  >
                    {t('booking.close')}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-extrabold text-[#8c6f6f] uppercase tracking-[0.18em] flex items-center gap-1 mb-1">
                      <User size={12} /> {t('booking.name')}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-[#ead7d7] rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 focus:border-[#8b1e1e] outline-none text-sm font-semibold text-[#231a1a] placeholder:text-[#b8a0a0]"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('booking.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#8c6f6f] uppercase tracking-[0.18em] flex items-center gap-1 mb-1">
                      <Mail size={12} /> {t('booking.email')}
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-2.5 bg-white border border-[#ead7d7] rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 focus:border-[#8b1e1e] outline-none text-sm font-semibold text-[#231a1a] placeholder:text-[#b8a0a0]"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('booking.emailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#8c6f6f] uppercase tracking-[0.18em] flex items-center gap-1 mb-1">
                      <MessageSquare size={12} /> {t('booking.reason')}
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-[#ead7d7] rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 focus:border-[#8b1e1e] outline-none text-sm font-semibold text-[#231a1a] placeholder:text-[#b8a0a0] resize-none"
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
                      className="py-3 bg-[#f4eeee] text-[#5f3b3b] rounded-xl font-extrabold hover:bg-[#ead7d7] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t('booking.close')}
                    </button>

                    <button
                      disabled={loading}
                      type="submit"
                      className="py-3 bg-gradient-to-br from-[#8B1E1E] to-[#5f1414] text-white rounded-xl font-extrabold shadow-md hover:from-[#7f1d1d] hover:to-[#4f1010] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
      <div className="min-h-screen space-y-8 max-w-5xl mx-auto px-4 py-8 text-[#231a1a] font-semibold" dir={dir} style={{ fontFamily: APP_FONT }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#7f1d1d] flex items-center gap-2">
              <CalendarIcon size={22} />
              {t('booking.pageTitle')}
            </h1>
            <p className="text-[#6b5f5f] text-sm font-semibold mt-1">{t('booking.pageDesc')}</p>
          </div>
          <button
            onClick={() => setShowAi(true)}
            className="flex items-center gap-2 bg-[#fff1f1] hover:bg-[#ffe7e7] text-[#7f1d1d] px-5 py-3 rounded-xl font-extrabold transition-colors text-sm border border-[#e8c4c4] shadow-sm"
          >
            <Bot size={16} />
            {t('booking.aiAssistant')}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-xs font-extrabold text-[#4f3b3b]">
          <div className="flex items-center gap-2 rounded-full bg-[#fffdfb]/80 px-4 py-2 border border-[#ead7d7] shadow-sm"><div className="w-4 h-4 rounded bg-[#fff1f1] border border-[#efcccc]"></div>{t('booking.legendInfeasible')}</div>
          <div className="flex items-center gap-2 rounded-full bg-[#fffdfb]/80 px-4 py-2 border border-[#ead7d7] shadow-sm"><div className="w-4 h-4 rounded bg-[#f2fbf4] border border-[#bde9c8]"></div>{t('booking.legendAvailable')}</div>
          <div className="flex items-center gap-2 rounded-full bg-[#fffdfb]/80 px-4 py-2 border border-[#ead7d7] shadow-sm"><div className="w-4 h-4 rounded bg-[#eee6e6] border border-[#d8caca]"></div>{t('booking.legendBooked')}</div>
        </div>

        <div className="bg-[#fffdfb] rounded-[2rem] shadow-[0_20px_60px_rgba(91,25,25,0.08)] border border-[#ead7d7] p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-full text-[#7f1d1d] hover:bg-[#fff1f1] transition-colors"><ChevronLeft size={20} /></button>
            <div className="text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#231a1a]">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</h2>
              <p className="text-xs text-[#8c6f6f] uppercase tracking-[0.22em] mt-1 font-extrabold">{t('calendar.schedule')}</p>
            </div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-full text-[#7f1d1d] hover:bg-[#fff1f1] transition-colors"><ChevronRight size={20} /></button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
              <div key={d} className="text-center text-[11px] uppercase tracking-[0.2em] text-[#8c6f6f] font-extrabold">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const dayBlocks = getDayBlocks(day);
              const visibleDayBlocks = dayBlocks.filter(b => b.type !== 'available');
              const availabilityBlocks = dayBlocks.filter(b => b.type === 'available');
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);
              const hasAvailability = availabilityBlocks.length > 0;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`min-h-[94px] rounded-2xl border transition-all text-center p-2 flex flex-col shadow-sm ${
                    isPast
                      ? 'bg-[#fff1f1] border-red-100 text-gray-300 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-gradient-to-br from-[#8b1e1e] via-[#7f1d1d] to-[#551111] border-[#7f1d1d] text-white shadow-[0_18px_35px_rgba(127,29,29,0.28)]'
                      : today
                      ? 'bg-[#fff7f3] border-[#8b1e1e] text-[#7f1d1d] font-extrabold shadow-sm ring-2 ring-[#8b1e1e]/10'
                      : hasAvailability
                      ? 'bg-[#f2fbf4] border-[#bde9c8] text-[#205c34] hover:border-[#8b1e1e]/40 hover:bg-[#fffdfb] hover:shadow-md'
                      : 'bg-[#fff1f1] border-red-100 text-[#8c6f6f] hover:border-[#8b1e1e]/30'
                  }`}
                >
                  <div className={`text-base font-extrabold ${isSelected ? 'text-white' : ''}`}>{format(day, 'd', { locale: dateLocale })}</div>
                  {isPast && <div className="text-[10px] text-[#b8a0a0] mt-1 font-extrabold">✕</div>}
                  {!isPast && !hasAvailability && (
                    <div className="text-[10px] text-[#b91c1c] mt-1 font-extrabold">{t('booking.unavailable')}</div>
                  )}
                  {!isPast && hasAvailability && (
                    <div className={`text-[10px] mt-1 font-extrabold ${isSelected ? 'text-white/85' : 'text-[#206a38]'}`}>{t('booking.slotAvailable')}</div>
                  )}
                  {!isPast && visibleDayBlocks.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1 flex-1 justify-end">
                      {visibleDayBlocks.slice(0, 2).map((b, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded-md truncate font-extrabold ${
                          b.type === 'unavailable'
                            ? (isSelected ? 'bg-[#fffdfb]/20 text-white/80' : 'bg-[#fff1f1] text-[#b91c1c]')
                            : (isSelected ? 'bg-[#fffdfb]/20 text-white/80' : 'bg-[#fff7e6] text-[#a15c00]')
                        }`}>
                          {b.title}
                        </div>
                      ))}
                      {visibleDayBlocks.length > 2 && (
                        <div className={`text-[8px] ${isSelected ? 'text-white/60' : 'text-[#8c6f6f]'}`}>+{visibleDayBlocks.length - 2} {t('booking.more')}</div>
                      )}
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
