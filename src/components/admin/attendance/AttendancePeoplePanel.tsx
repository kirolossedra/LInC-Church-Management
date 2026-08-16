import { CalendarCheck2, Loader2, Mail, Phone, Search, UserPlus, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AttendancePerson } from './attendance.types';
import { getAttendanceDays } from './attendance.utils';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePeoplePanel({ controller }: { controller: AttendanceController }) {
  const {
    activePanel,
    people,
    isLoadingPeople,
    peopleError,
    searchTerm,
    setSearchTerm,
    text,
    filteredPeople,
    openNewPersonEditor,
    handleSelectPerson,
  } = controller;

  if (activePanel !== 'people') return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9f6810]">{text.totalPeople}: {people.length}</p>
          <h3 className="mt-1 font-serif text-3xl font-semibold text-[#641414] sm:text-4xl">{text.peopleTitle}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{text.peopleDescription}</p>
        </div>
        <button
          type="button"
          onClick={openNewPersonEditor}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#831f1c] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(92,22,19,0.22)] transition hover:-translate-y-0.5"
        >
          <UserPlus size={18} /> {text.addNewPerson}
        </button>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8d211d] rtl:left-auto rtl:right-4" size={19} />
        <input
          type="search"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder={text.searchPlaceholder}
          className="min-h-14 w-full rounded-2xl border border-[#7a1b1b]/10 bg-white px-12 text-sm outline-none shadow-sm transition placeholder:text-stone-400 focus:border-[#7a1b1b]/40 focus:ring-4 focus:ring-[#7a1b1b]/5"
        />
      </label>

      {isLoadingPeople && <StateCard icon={<Loader2 className="animate-spin" />} message={text.loadingPeople} />}
      {peopleError && <StateCard tone="error" message={peopleError} />}
      {!isLoadingPeople && !peopleError && people.length === 0 && <StateCard icon={<UsersRound />} message={text.noPeople} />}
      {!isLoadingPeople && !peopleError && people.length > 0 && filteredPeople.length === 0 && <StateCard icon={<Search />} message={text.noSearchResults} />}

      {!isLoadingPeople && !peopleError && filteredPeople.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredPeople.map(person => (
            <PersonCard key={person.firebaseId} person={person} onClick={() => handleSelectPerson(person)} attendanceLabel={text.daysOfAttendance} />
          ))}
        </div>
      )}
    </section>
  );
}

function PersonCard({ person, onClick, attendanceLabel }: { person: AttendancePerson; onClick: () => void; attendanceLabel: string }) {
  const attendanceCount = getAttendanceDays(person.daysOfAttendance).length;
  const initials = `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase() || '—';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-[1.6rem] border border-[#7a1b1b]/10 bg-white p-4 text-start shadow-[0_10px_30px_rgba(61,24,17,0.06)] transition hover:-translate-y-1 hover:border-[#7a1b1b]/25 hover:shadow-[0_18px_40px_rgba(61,24,17,0.12)]"
    >
      <div className="flex items-start gap-3">
        {person.photoBase64 ? (
          <img src={person.photoBase64} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-[#7a1b1b]/10" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f3e6dd] font-serif text-xl font-bold text-[#7a1b1b]">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-extrabold text-[#541616]">{person.firstName} {person.lastName}</h4>
          {(person.arabicFirstName || person.arabicLastName) && (
            <p dir="rtl" className="mt-0.5 truncate text-sm font-bold text-[#8d211d]">{person.arabicFirstName} {person.arabicLastName}</p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
            <CalendarCheck2 size={12} /> {attendanceCount} {attendanceLabel}
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-500">
        <p className="flex items-center gap-2 truncate"><Phone size={13} className="text-[#8d211d]" /> {person.phoneNumber || '—'}</p>
        <p className="flex items-center gap-2 truncate"><Mail size={13} className="text-[#8d211d]" /> {person.email || '—'}</p>
      </div>
    </button>
  );
}

function StateCard({ message, icon, tone = 'neutral' }: { message: string; icon?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`grid min-h-40 place-items-center rounded-[1.6rem] border border-dashed p-6 text-center text-sm font-semibold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#7a1b1b]/15 bg-white/70 text-stone-500'}`}>
      <div>{icon && <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f3e6dd] text-[#8d211d]">{icon}</span>}{message}</div>
    </div>
  );
}
