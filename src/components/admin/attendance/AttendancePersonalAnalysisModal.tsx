import { CalendarCheck2, CalendarX2, Percent, TrendingUp, X } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonalAnalysisModal({ controller }: { controller: AttendanceController }) {
  const { setSelectedAnalysisPersonId, text, sundayDateKeysSinceStart, selectedPersonAttendanceAnalysis: analysis, selectedPersonMissedDates, selectedPersonTimeline } = controller;
  if (!analysis) return null;

  const close = () => setSelectedAnalysisPersonId('');
  const fullName = `${analysis.person.firstName} ${analysis.person.lastName}`.trim();
  const arabicName = `${analysis.person.arabicFirstName} ${analysis.person.arabicLastName}`.trim();

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[10000] grid place-items-center bg-[#160909]/70 p-2 backdrop-blur-md sm:p-6" onMouseDown={close}>
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] bg-[#faf7f2] shadow-2xl sm:max-h-[calc(100dvh-3rem)]" onMouseDown={event => event.stopPropagation()}>
        <header className="flex shrink-0 items-center justify-between gap-4 bg-[#1d0e0e] px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">{text.personalAnalysis}</p><h2 className="truncate font-serif text-2xl font-semibold sm:text-3xl">{fullName || '—'}</h2>{arabicName && <p dir="rtl" className="mt-0.5 truncate text-sm text-white/65">{arabicName}</p>}</div>
          <button type="button" onClick={close} aria-label={text.close} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<CalendarCheck2 />} label={text.attendanceCount} value={analysis.attendanceCount} />
            <Metric icon={<CalendarX2 />} label={text.missedCount} value={selectedPersonMissedDates.length} />
            <Metric icon={<Percent />} label={text.attendanceRate} value={`${analysis.attendanceRate}%`} accent />
            <Metric icon={<TrendingUp />} label={text.totalSundays} value={sundayDateKeysSinceStart.length} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <ReportCard title={text.dateAttendanceLine}>
              <TimelineChart timeline={selectedPersonTimeline} />
              <div className="mt-3 flex gap-4 text-xs font-bold"><Legend color="bg-emerald-600" label={text.present} /><Legend color="bg-red-600" label={text.absent} /></div>
            </ReportCard>
            <ReportCard title={text.attendanceDonut}>
              <div className="grid place-items-center">
                <div className="relative h-44 w-44 rounded-full" style={{ background: `conic-gradient(#15803d ${analysis.attendanceRate}%, #dc2626 0)` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center"><strong className="text-3xl text-[#7a1b1b]">{analysis.attendanceRate}%</strong><span className="-mt-6 text-[10px] font-black uppercase tracking-wider text-stone-500">{text.attendanceRate}</span></div></div>
              </div>
              <div className="mt-4 grid gap-2 text-xs font-bold"><RateRow label={text.attendedPercent} value={`${analysis.attendanceCount}/${sundayDateKeysSinceStart.length}`} color="text-emerald-700" /><RateRow label={text.missedPercent} value={`${selectedPersonMissedDates.length}/${sundayDateKeysSinceStart.length}`} color="text-red-700" /></div>
            </ReportCard>
          </div>

          <ReportCard title={text.attendanceTimeline}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{selectedPersonTimeline.map(item => <div key={item.dateKey} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-extrabold ${item.attended ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}><span>{item.dateKey}</span><span>{item.attended ? text.present : text.absent}</span></div>)}</div>
          </ReportCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <DateList title={text.attendedSundays} dates={analysis.attendedDates} empty="—" tone="present" />
            <DateList title={text.missedSundays} dates={selectedPersonMissedDates} empty="—" tone="missed" />
          </div>

        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string | number; accent?: boolean }) {
  return <div className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${accent ? 'border-[#7a1b1b] bg-[#7a1b1b] text-white' : 'border-[#7a1b1b]/10 bg-white text-[#641414]'}`}><span className={`mb-3 grid h-8 w-8 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4 ${accent ? 'bg-white/10' : 'bg-[#f5ece4]'}`}>{icon}</span><strong className="block text-2xl sm:text-3xl">{value}</strong><span className={`mt-1 block text-[9px] font-black uppercase tracking-wider ${accent ? 'text-white/60' : 'text-stone-500'}`}>{label}</span></div>;
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-[1.4rem] border border-[#7a1b1b]/10 bg-white p-4 shadow-sm sm:p-5"><h3 className="mb-4 font-serif text-xl font-semibold text-[#641414]">{title}</h3>{children}</section>;
}

function TimelineChart({ timeline }: { timeline: Array<{ dateKey: string; attended: boolean; cumulativeAttendance: number }> }) {
  const points = timeline.map((item, index) => ({ ...item, x: timeline.length === 1 ? 300 : 28 + (index / (timeline.length - 1)) * 544, y: item.attended ? 45 : 145 }));
  return <div className="overflow-x-auto"><svg viewBox="0 0 600 190" role="img" className="min-w-[560px]"><line x1="28" y1="45" x2="572" y2="45" stroke="#dcfce7" strokeWidth="2" /><line x1="28" y1="145" x2="572" y2="145" stroke="#fee2e2" strokeWidth="2" /><polyline fill="none" stroke="#8d211d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.map(point => `${point.x},${point.y}`).join(' ')} />{points.map((point, index) => <g key={point.dateKey}><circle cx={point.x} cy={point.y} r="6" fill={point.attended ? '#15803d' : '#dc2626'} stroke="white" strokeWidth="2" />{(timeline.length <= 8 || index % Math.ceil(timeline.length / 8) === 0 || index === timeline.length - 1) && <text x={point.x} y="174" textAnchor="middle" fontSize="9" fill="#78716c">{point.dateKey.slice(5)}</text>}</g>)}</svg></div>;
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>; }
function RateRow({ label, value, color }: { label: string; value: string; color: string }) { return <div className={`flex justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 ${color}`}><span>{label}</span><span>{value}</span></div>; }

function DateList({ title, dates, empty, tone }: { title: string; dates: string[]; empty: string; tone: 'present' | 'missed' }) {
  const classes = tone === 'present' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800';
  return <ReportCard title={title}><div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{(dates.length ? dates : [empty]).map(date => <span key={date} className={`rounded-full px-3 py-2 text-xs font-extrabold ${classes}`}>{date}</span>)}</div></ReportCard>;
}
