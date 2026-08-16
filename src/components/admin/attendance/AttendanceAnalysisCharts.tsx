import { BarChart3, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceAnalysisCharts({ controller }: { controller: AttendanceController }) {
  const { text, weeklyAttendanceSummary, maxWeeklyAttendanceCount, topAttendanceAnalysis, maxPersonAttendanceCount, attendanceCountHistogram, maxAttendanceCountHistogramPeople, attendanceRateHistogram, maxAttendanceRateHistogramPeople } = controller;
  const hasWeeklyData = weeklyAttendanceSummary.some(item => item.attendedCount > 0);
  const hasPersonData = topAttendanceAnalysis.some(item => item.attendanceCount > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard icon={<TrendingUp />} title={text.weeklyAttendancePlot}>
        {hasWeeklyData ? <BarList rows={weeklyAttendanceSummary.map(item => ({ key: item.dateKey, label: item.dateKey, value: item.attendedCount }))} maximum={maxWeeklyAttendanceCount} /> : <Empty message={text.noAttendanceData} />}
      </ChartCard>
      <ChartCard icon={<BarChart3 />} title={text.topAttendeesPlot}>
        {hasPersonData ? <BarList rows={topAttendanceAnalysis.map(item => ({ key: item.person.firebaseId, label: `${item.person.firstName} ${item.person.lastName}`.trim() || '—', value: item.attendanceCount }))} maximum={maxPersonAttendanceCount} /> : <Empty message={text.noAttendanceData} />}
      </ChartCard>
      <ChartCard icon={<TrendingUp />} title={text.weeklyAttendanceLine} wide>
        {hasWeeklyData ? <TrendChart data={weeklyAttendanceSummary} maximum={maxWeeklyAttendanceCount} /> : <Empty message={text.noAttendanceData} />}
      </ChartCard>
      <ChartCard icon={<BarChart3 />} title={text.attendanceHistogram}>
        <BarList rows={attendanceCountHistogram.map(item => ({ key: String(item.attendanceCount), label: `${item.attendanceCount} ${text.attendedLabel}`, value: item.peopleCount }))} maximum={maxAttendanceCountHistogramPeople} />
      </ChartCard>
      <ChartCard icon={<BarChart3 />} title={text.attendanceRateHistogram}>
        <BarList rows={attendanceRateHistogram.map(item => ({ key: item.label, label: item.label, value: item.peopleCount }))} maximum={maxAttendanceRateHistogramPeople} />
      </ChartCard>
    </div>
  );
}

function ChartCard({ icon, title, children, wide = false }: { icon: ReactNode; title: string; children: ReactNode; wide?: boolean }) {
  return <section className={`min-w-0 rounded-[1.5rem] border border-[#7a1b1b]/10 bg-white p-4 shadow-sm sm:p-5 ${wide ? 'xl:col-span-2' : ''}`}><h3 className="mb-5 flex items-center gap-2 font-serif text-xl font-semibold text-[#641414]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5ece4] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>{title}</h3>{children}</section>;
}

function BarList({ rows, maximum }: { rows: Array<{ key: string; label: string; value: number }>; maximum: number }) {
  return <div className="grid max-h-80 gap-3 overflow-y-auto pe-1">{rows.map(row => <div key={row.key}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-stone-600"><span className="truncate">{row.label}</span><span className="shrink-0 text-[#7a1b1b]">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-[#8d211d] to-[#b87b3a]" style={{ width: `${row.value === 0 ? 0 : Math.max(5, (row.value / Math.max(1, maximum)) * 100)}%` }} /></div></div>)}</div>;
}

function TrendChart({ data, maximum }: { data: Array<{ dateKey: string; attendedCount: number }>; maximum: number }) {
  const points = data.map((item, index) => ({ ...item, x: data.length === 1 ? 300 : 28 + (index / (data.length - 1)) * 544, y: 184 - (item.attendedCount / Math.max(1, maximum)) * 146 }));
  return <div className="overflow-x-auto"><svg viewBox="0 0 600 220" role="img" className="min-w-[560px]"><defs><linearGradient id="attendance-trend" x1="0" x2="1"><stop stopColor="#8d211d" /><stop offset="1" stopColor="#b87b3a" /></linearGradient></defs>{[38, 86, 134, 184].map(y => <line key={y} x1="28" y1={y} x2="572" y2={y} stroke="#eee8e1" strokeDasharray="5 6" />)}<polyline fill="none" stroke="url(#attendance-trend)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" points={points.map(point => `${point.x},${point.y}`).join(' ')} />{points.map((point, index) => <g key={point.dateKey}><circle cx={point.x} cy={point.y} r="5" fill="#8d211d" stroke="white" strokeWidth="2" /><text x={point.x} y={point.y - 11} textAnchor="middle" fontSize="10" fill="#641414" fontWeight="800">{point.attendedCount}</text>{(data.length <= 8 || index % Math.ceil(data.length / 8) === 0 || index === data.length - 1) && <text x={point.x} y="207" textAnchor="middle" fontSize="9" fill="#78716c">{point.dateKey.slice(5)}</text>}</g>)}</svg></div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl bg-[#faf7f2] px-4 py-8 text-center text-sm font-semibold text-stone-500">{message}</div>;
}
