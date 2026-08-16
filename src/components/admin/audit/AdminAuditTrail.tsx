import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Filter, Loader2, RefreshCw, Search, ShieldCheck, UserRound, XCircle } from 'lucide-react';

import { getAdminAuditEvents } from '../../../services/administrator';
import type { AdminAuditEvent } from '../admin.types';

export default function AdminAuditTrail({ isChief }: { isChief: boolean }) {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'succeeded' | 'failed'>('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminAuditEvents();
      setEvents(result.events);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The audit trail could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void getAdminAuditEvents()
      .then(result => { if (active) setEvents(result.events); })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'The audit trail could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter(event => {
      if (status !== 'all' && event.status !== status) return false;
      if (!needle) return true;
      return [event.actorEmail, event.action, event.targetType, event.targetLabel, event.targetId, event.summary]
        .join(' ').toLowerCase().includes(needle);
    });
  }, [events, query, status]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] bg-[#180d0d] p-6 text-white shadow-[0_24px_70px_rgba(52,18,15,0.18)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f2a900]">Administrator accountability</p><h2 className="mt-3 font-serif text-4xl font-semibold sm:text-6xl">Audit Trail</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{isChief ? 'A server-verified history of actions across every administrator.' : 'Your server-verified administrator activity history.'}</p></div>
          <div className="flex gap-3"><Stat label="Recorded" value={events.length} /><Stat label="Visible" value={filtered.length} /></div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border border-[#7a1b1b]/10 bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto_auto]">
        <label className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8d211d]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search actor, action, target, or summary" className="min-h-12 w-full rounded-xl bg-[#faf7f2] pl-11 pr-4 text-sm outline-none ring-[#7a1b1b]/15 focus:ring-4" /></label>
        <label className="relative"><Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="min-h-12 rounded-xl border border-stone-100 bg-white pl-9 pr-8 text-sm font-bold text-stone-600"><option value="all">All statuses</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option></select></label>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#831f1c] px-5 text-sm font-extrabold text-white disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} Refresh</button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}
      {loading && events.length === 0 && <State icon={<Loader2 className="animate-spin" />} text="Loading verified activity…" />}
      {!loading && !error && filtered.length === 0 && <State icon={<ShieldCheck />} text="No matching administrator activity yet." />}

      <div className="grid gap-3">
        {filtered.map(event => <AuditEventCard key={event.id} event={event} showActor={isChief} />)}
      </div>
    </section>
  );
}

function AuditEventCard({ event, showActor }: { event: AdminAuditEvent; showActor: boolean }) {
  const changes = Object.entries(event.changes || {});
  return <article className="rounded-[1.4rem] border border-[#7a1b1b]/10 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${event.status === 'succeeded' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{event.status === 'succeeded' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#f5ece4] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#7a1b1b]">{humanize(event.action)}</span><span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-400"><Clock3 size={13} />{new Date(event.occurredAt).toLocaleString()}</span></div><h3 className="mt-3 font-serif text-xl font-semibold text-[#641414]">{event.summary || humanize(event.action)}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">{showActor && <span className="inline-flex items-center gap-1.5"><UserRound size={13} />{event.actorEmail || event.actorUid}</span>}<span><strong className="text-stone-700">Target:</strong> {event.targetLabel || event.targetId || event.targetType}</span></div>{changes.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{changes.map(([field, change]) => <div key={field} className="rounded-xl bg-[#faf7f2] p-3"><span className="block text-[9px] font-black uppercase tracking-wider text-stone-400">{humanize(field)}</span><p className="mt-1 truncate text-xs text-stone-500"><span className="line-through">{formatValue(change.before)}</span> <span className="mx-1 text-[#a66c18]">→</span> <strong className="text-[#641414]">{formatValue(change.after)}</strong></p></div>)}</div>}</div></div></article>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="min-w-24 rounded-2xl bg-white/[0.07] p-3"><strong className="block text-2xl">{value}</strong><span className="text-[9px] font-black uppercase tracking-wider text-white/40">{label}</span></div>; }
function State({ icon, text }: { icon: ReactNode; text: string }) { return <div className="grid min-h-52 place-items-center rounded-[1.5rem] border border-dashed border-[#7a1b1b]/15 bg-white/60 text-center text-sm font-semibold text-stone-500"><div><span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f5ece4] text-[#7a1b1b]">{icon}</span>{text}</div></div>; }
function humanize(value: string) { return value.replace(/[._-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()); }
function formatValue(value: unknown) { if (value === undefined || value === null || value === '') return 'None'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
