import { BarChart3, CalendarRange, Loader2, Search, TrendingUp, UserRoundSearch, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

import AttendanceAnalysisCharts from './AttendanceAnalysisCharts';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceAnalysisPanel({ controller }: { controller: AttendanceController }) {
  const {
    activePanel,
    people,
    isLoadingPeople,
    peopleError,
    analysisSearchTerm,
    setAnalysisSearchTerm,
    setSelectedAnalysisPersonId,
    text,
    analysisStartDateKey,
    sundayDateKeysSinceStart,
    filteredPersonAttendanceAnalysis,
    averageAttendancePerSunday,
  } = controller;

  if (activePanel !== 'analysis') return null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9f6810]">{text.distributionAnalytics}</p>
        <h3 className="mt-1 font-serif text-3xl font-semibold text-[#641414] sm:text-4xl">{text.analysisTitle}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">{text.analysisDescription}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InsightCard icon={<CalendarRange />} label={text.analysisStartDate} value={analysisStartDateKey} />
        <InsightCard icon={<BarChart3 />} label={text.totalSundays} value={sundayDateKeysSinceStart.length} />
        <InsightCard icon={<UsersRound />} label={text.totalPeople} value={people.length} />
        <InsightCard icon={<TrendingUp />} label={text.averageAttendance} value={averageAttendancePerSunday} accent />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <div className="rounded-[1.8rem] border border-[#7a1b1b]/10 bg-white p-4 shadow-[0_12px_35px_rgba(61,24,17,0.07)] sm:p-5">
          <div className="mb-4">
            <h4 className="font-serif text-2xl font-semibold text-[#641414]">{text.personalAnalysis}</h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">{text.viewFullStats}</p>
          </div>
          <label className="relative mb-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d211d] rtl:left-auto rtl:right-3" size={17} />
            <input type="search" value={analysisSearchTerm} onChange={event => setAnalysisSearchTerm(event.target.value)} placeholder={text.analysisSearchPlaceholder} className="min-h-12 w-full rounded-xl border border-[#7a1b1b]/10 bg-[#faf7f2] px-10 text-sm outline-none focus:border-[#7a1b1b]/35" />
          </label>

          {isLoadingPeople && <CompactState icon={<Loader2 className="animate-spin" />} message={text.loadingPeople} />}
          {peopleError && <CompactState tone="error" message={peopleError} />}
          {!isLoadingPeople && !peopleError && filteredPersonAttendanceAnalysis.length === 0 && <CompactState icon={<UserRoundSearch />} message={people.length ? text.noAnalysisResults : text.noPeople} />}

          {!isLoadingPeople && !peopleError && filteredPersonAttendanceAnalysis.length > 0 && (
            <div className="max-h-[34rem] space-y-2 overflow-y-auto pe-1">
              {filteredPersonAttendanceAnalysis.map(item => (
                <button key={item.person.firebaseId} type="button" onClick={() => setSelectedAnalysisPersonId(item.person.firebaseId)} className="group flex w-full items-center gap-3 rounded-2xl border border-stone-100 p-3 text-start transition hover:border-[#7a1b1b]/20 hover:bg-[#faf4ed]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3e6dd] font-serif font-bold text-[#7a1b1b]">{`${item.person.firstName[0] || ''}${item.person.lastName[0] || ''}`.toUpperCase() || '—'}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-[#541616]">{item.person.firstName} {item.person.lastName}</strong>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-stone-400">{item.attendanceCount} {text.attendedLabel}</span>
                  </span>
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-black text-[#7a1b1b]">
                    {item.attendanceRate}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-[1.8rem] border border-[#7a1b1b]/10 bg-white p-4 shadow-[0_12px_35px_rgba(61,24,17,0.07)] sm:p-6">
          <AttendanceAnalysisCharts controller={controller} />
        </div>
      </div>
    </section>
  );
}

function InsightCard({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${accent ? 'border-[#f2a900]/40 bg-[#fff5d9]' : 'border-[#7a1b1b]/10 bg-white'}`}>
      <span className={`mb-4 grid h-9 w-9 place-items-center rounded-xl ${accent ? 'bg-[#f2a900] text-[#4a2710]' : 'bg-[#f3e6dd] text-[#8d211d]'}`}>{icon}</span>
      <strong className="block truncate text-xl font-black text-[#641414] sm:text-2xl">{value}</strong>
      <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400 sm:text-[10px]">{label}</span>
    </div>
  );
}

function CompactState({ message, icon, tone = 'neutral' }: { message: string; icon?: ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`grid min-h-32 place-items-center rounded-2xl border border-dashed p-4 text-center text-xs font-semibold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-200 bg-stone-50 text-stone-500'}`}><div>{icon && <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-[#f3e6dd] text-[#8d211d]">{icon}</span>}{message}</div></div>;
}
