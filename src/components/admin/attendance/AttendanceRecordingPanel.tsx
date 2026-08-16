import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { AttendancePerson } from './attendance.types';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceRecordingPanel({ controller }: { controller: AttendanceController }) {
  const {
    dir,
    isArabic,
    activePanel,
    people,
    isLoadingPeople,
    peopleError,
    selectedAttendanceDate,
    attendanceSearchTerm,
    setAttendanceSearchTerm,
    isSavingAttendanceForId,
    text,
    weekDayLabels,
    monthLabel,
    calendarDays,
    filteredAttendancePeople,
    moveCalendarMonth,
    handleSelectAttendanceDate,
    hasPersonAttendedSelectedDate,
    handleToggleAttendance,
  } = controller;

  if (activePanel !== 'attendance') return null;

  const attendedCount = selectedAttendanceDate
    ? people.filter(hasPersonAttendedSelectedDate).length
    : 0;
  const orderedPeople = [...filteredAttendancePeople].sort((first, second) => (
    Number(hasPersonAttendedSelectedDate(first)) - Number(hasPersonAttendedSelectedDate(second))
  ));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9f6810]">{text.selectedDay}: {selectedAttendanceDate || '—'}</p>
        <h3 className="mt-1 font-serif text-3xl font-semibold text-[#641414] sm:text-4xl">{text.attendanceTitle}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{text.attendanceDescription}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-[1.8rem] border border-[#7a1b1b]/10 bg-white p-3 shadow-[0_12px_35px_rgba(61,24,17,0.07)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveCalendarMonth('previous')} aria-label={text.previousMonth} className="grid h-11 w-11 place-items-center rounded-2xl border border-[#7a1b1b]/10 text-[#8d211d] transition hover:bg-[#f7eee7]">
              {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <div className="text-center">
              <strong className="block font-serif text-2xl text-[#641414]">{monthLabel}</strong>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{text.sundayOnly}</span>
            </div>
            <button type="button" onClick={() => moveCalendarMonth('next')} aria-label={text.nextMonth} className="grid h-11 w-11 place-items-center rounded-2xl border border-[#7a1b1b]/10 text-[#8d211d] transition hover:bg-[#f7eee7]">
              {isArabic ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDayLabels.map(day => <div key={day} className="py-2 text-center text-[9px] font-black uppercase text-stone-400 sm:text-[10px]">{day}</div>)}
            {calendarDays.map(day => {
              const selected = selectedAttendanceDate === day.key;
              const selectable = day.isCurrentMonth && day.isSunday;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => handleSelectAttendanceDate(day)}
                  disabled={!selectable}
                  aria-pressed={selected}
                  className={`relative aspect-square min-h-9 rounded-xl text-xs font-black transition sm:min-h-11 sm:rounded-2xl sm:text-sm ${
                    selected
                      ? 'bg-[#831f1c] text-white shadow-[0_8px_20px_rgba(92,22,19,0.28)]'
                      : selectable
                        ? 'border border-[#7a1b1b]/15 bg-[#fffaf5] text-[#7a1b1b] hover:-translate-y-0.5 hover:border-[#7a1b1b]/35'
                        : day.isCurrentMonth ? 'text-stone-300' : 'text-stone-200'
                  }`}
                >
                  {day.dayNumber}
                  {selectable && !selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f2a900]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-[1.8rem] bg-[#241414] p-5 text-white shadow-[0_18px_45px_rgba(37,15,15,0.18)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2a900]">{text.selectedDay}</span>
              <strong className="mt-2 block font-serif text-3xl font-semibold sm:text-4xl">{selectedAttendanceDate || text.noSelectedDay}</strong>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#ffd46b]"><CalendarDays size={23} /></span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Metric icon={<UserCheck size={18} />} value={attendedCount} label={text.present} />
            <Metric icon={<UsersRound size={18} />} value={Math.max(0, people.length - attendedCount)} label={text.absent} />
          </div>
          <div className="mt-auto pt-7">
            <div className="mb-2 flex justify-between text-xs font-bold text-white/60"><span>{text.attendanceRate}</span><span>{people.length ? Math.round((attendedCount / people.length) * 100) : 0}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#f2a900] transition-all" style={{ width: `${people.length ? (attendedCount / people.length) * 100 : 0}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8d211d] rtl:left-auto rtl:right-4" size={19} />
          <input type="search" value={attendanceSearchTerm} onChange={event => setAttendanceSearchTerm(event.target.value)} placeholder={text.attendanceSearchPlaceholder} className="min-h-14 w-full rounded-2xl border border-[#7a1b1b]/10 bg-white px-12 text-sm outline-none shadow-sm transition focus:border-[#7a1b1b]/40 focus:ring-4 focus:ring-[#7a1b1b]/5" />
        </label>

        {isLoadingPeople && <StateCard icon={<Loader2 className="animate-spin" />} message={text.loadingPeople} />}
        {peopleError && <StateCard tone="error" message={peopleError} />}
        {!isLoadingPeople && !peopleError && orderedPeople.length === 0 && <StateCard icon={<Search />} message={people.length ? text.noAttendanceSearchResults : text.noPeople} />}

        {!isLoadingPeople && !peopleError && orderedPeople.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-2">
            {orderedPeople.map(person => {
              const attended = hasPersonAttendedSelectedDate(person);
              return (
                <AttendanceRow
                  key={person.firebaseId}
                  person={person}
                  attended={attended}
                  busy={isSavingAttendanceForId === person.firebaseId}
                  disabled={!selectedAttendanceDate || Boolean(isSavingAttendanceForId)}
                  dir={dir}
                  labels={{ attended: text.removeAttendance, mark: text.markAttended }}
                  onMark={() => void handleToggleAttendance(person)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AttendanceRow({ person, attended, busy, disabled, dir, labels, onMark }: { person: AttendancePerson; attended: boolean; busy: boolean; disabled: boolean; dir: 'ltr' | 'rtl'; labels: { attended: string; mark: string }; onMark: () => void }) {
  const initials = `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase() || '—';
  return (
    <article className={`flex items-center gap-3 rounded-2xl border bg-white p-3 transition ${attended ? 'border-emerald-200 bg-emerald-50/70' : 'border-[#7a1b1b]/10'}`}>
      {person.photoBase64 ? <img src={person.photoBase64} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f3e6dd] font-serif font-bold text-[#7a1b1b]">{initials}</span>}
      <div className="min-w-0 flex-1" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
        <h4 className="truncate text-sm font-extrabold text-[#541616]">{person.firstName} {person.lastName}</h4>
        {(person.arabicFirstName || person.arabicLastName) && <p dir="rtl" className="truncate text-xs font-bold text-[#8d211d]">{person.arabicFirstName} {person.arabicLastName}</p>}
        <p className="mt-1 truncate text-[11px] text-stone-400">{person.email || person.phoneNumber || '—'}</p>
      </div>
      <button type="button" onClick={onMark} disabled={disabled} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${attended ? 'bg-emerald-600 hover:bg-red-600' : 'bg-[#831f1c]'}`} aria-label={attended ? labels.attended : labels.mark} title={attended ? labels.attended : labels.mark}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : attended ? <Check size={19} /> : <CheckCircle2 size={19} />}
      </button>
    </article>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <div className="rounded-2xl bg-white/7 p-4"><span className="flex items-center gap-2 text-[#ffd46b]">{icon}<strong className="text-2xl text-white">{value}</strong></span><span className="mt-1 block text-[10px] font-extrabold uppercase tracking-wider text-white/45">{label}</span></div>;
}

function StateCard({ message, icon, tone = 'neutral' }: { message: string; icon?: ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`grid min-h-32 place-items-center rounded-2xl border border-dashed p-5 text-center text-sm font-semibold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#7a1b1b]/15 bg-white/70 text-stone-500'}`}><div>{icon && <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#f3e6dd] text-[#8d211d]">{icon}</span>}{message}</div></div>;
}
