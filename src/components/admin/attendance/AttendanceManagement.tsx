import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import AttendanceAnalysisPanel from './AttendanceAnalysisPanel';
import AttendancePeoplePanel from './AttendancePeoplePanel';
import AttendancePersonModal from './AttendancePersonModal';
import AttendancePersonalAnalysisModal from './AttendancePersonalAnalysisModal';
import AttendanceRecordingPanel from './AttendanceRecordingPanel';
import { getAttendanceDays } from './attendance.utils';
import useAttendanceManagement from './useAttendanceManagement';

export default function AttendanceManagement() {
  const controller = useAttendanceManagement();
  const {
    dir,
    activePanel,
    setActivePanel,
    notice,
    dismissNotice,
    people,
    selectedAttendanceDate,
    averageAttendancePerSunday,
    text,
  } = controller;

  const selectedAttendanceCount = selectedAttendanceDate
    ? people.filter(person => getAttendanceDays(person.daysOfAttendance).includes(selectedAttendanceDate)).length
    : 0;

  const tabs = [
    { id: 'attendance' as const, label: text.takeAttendance, icon: CalendarCheck2 },
    { id: 'people' as const, label: text.addModifyPerson, icon: UsersRound },
    { id: 'analysis' as const, label: text.analysis, icon: BarChart3 },
  ];

  return (
    <div dir={dir} className="attendance-page-root overflow-hidden rounded-[2rem] bg-[#f4efe5] text-stone-900">
      <header className="relative overflow-hidden bg-[#1b1010] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#8d211d]/40 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#f2a900]">
              <Sparkles size={15} /> Administration operations
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-6xl">{text.pageTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">{text.pageDescription}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Summary value={people.length} label={text.totalPeople} />
            <Summary value={selectedAttendanceCount} label={text.present} accent />
            <Summary value={averageAttendancePerSunday} label={text.averageAttendance} />
          </div>
        </div>
      </header>

      <div className="border-b border-[#7a1b1b]/10 bg-white/90 p-2 backdrop-blur sm:p-3">
        <nav className="grid grid-cols-3 gap-2" aria-label={text.pageTitle}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = activePanel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePanel(tab.id)}
                aria-pressed={selected}
                className={`group flex min-h-14 items-center justify-center gap-2 rounded-2xl px-2 text-xs font-extrabold transition sm:min-h-16 sm:text-sm ${
                  selected
                    ? 'bg-[#831f1c] text-white shadow-[0_12px_30px_rgba(92,22,19,0.25)]'
                    : 'text-stone-600 hover:bg-[#f7f0e8] hover:text-[#6f1818]'
                }`}
              >
                <Icon size={19} className={selected ? 'text-[#ffd46b]' : 'text-[#8d211d]'} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'attendance' ? text.attended : tab.id === 'people' ? text.totalPeople : text.analysis}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {notice && (
        <div className="px-4 pt-4 sm:px-6">
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}>
            <span className="flex items-center gap-2">
              {notice.tone === 'success' && <CheckCircle2 size={18} />}
              {notice.message}
            </span>
            <button type="button" onClick={dismissNotice} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label={text.close}>
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      <main className="p-4 sm:p-6 lg:p-8">
        <AttendanceRecordingPanel controller={controller} />
        <AttendancePeoplePanel controller={controller} />
        <AttendanceAnalysisPanel controller={controller} />
      </main>

      <AttendancePersonModal controller={controller} />
      <AttendancePersonalAnalysisModal controller={controller} />
    </div>
  );
}

function Summary({ value, label, accent = false }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-3 text-center sm:min-w-28 sm:px-4 ${accent ? 'border-[#f2a900]/40 bg-[#f2a900]/15' : 'border-white/10 bg-white/5'}`}>
      <strong className={`block text-2xl font-black sm:text-3xl ${accent ? 'text-[#ffd46b]' : 'text-white'}`}>{value}</strong>
      <span className="mt-1 block truncate text-[9px] font-extrabold uppercase tracking-wider text-white/45 sm:text-[10px]">{label}</span>
    </div>
  );
}
