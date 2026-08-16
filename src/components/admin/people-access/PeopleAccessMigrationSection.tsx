import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, LoaderCircle, Mail, RefreshCw, UserRoundCog } from 'lucide-react';

import {
  getPeopleAccessAudit,
  migratePeopleAccess,
  updatePeopleAccessEmail,
  type PeopleAccessPerson,
} from '../../../services/administrator';

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  complete: 'Complete',
  firebase_ready: 'Firebase ready — email pending',
  email_failed: 'Email retry needed',
  firebase_failed: 'Firebase retry needed',
  missing_email: 'Missing email',
  invalid_email: 'Invalid email',
};

export default function PeopleAccessMigrationSection() {
  const [people, setPeople] = useState<PeopleAccessPerson[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPeopleAccessAudit();
      setPeople(result.people);
      setEmailDrafts(Object.fromEntries(result.people.map(person => [person.memberKey, person.authEmail])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'People Access could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => people.reduce<Record<string, number>>((result, person) => {
    result[person.status] = (result[person.status] || 0) + 1;
    return result;
  }, {}), [people]);

  const migrate = async (memberKeys?: string[]) => {
    setBusyKey(memberKeys?.[0] || 'all');
    setError('');
    setMessage('');
    try {
      const result = await migratePeopleAccess(memberKeys);
      const completed = result.summary.complete || 0;
      const failed = (result.summary.firebase_failed || 0) + (result.summary.email_failed || 0);
      setMessage(`${completed} migration${completed === 1 ? '' : 's'} completed with Firebase access and email.${failed ? ` ${failed} need attention.` : ''}`);
      await load();
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : 'Firebase registration failed.');
    } finally {
      setBusyKey('');
    }
  };

  const saveEmail = async (person: PeopleAccessPerson) => {
    setBusyKey(person.memberKey);
    setError('');
    setMessage('');
    try {
      await updatePeopleAccessEmail(person.memberKey, emailDrafts[person.memberKey] || '');
      setMessage(`${person.fullName || 'The person'} is ready to retry.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The email could not be saved.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-[#7a1b1b]/10 bg-[#fffdf9] shadow-[0_24px_70px_rgba(61,24,17,0.12)]">
      <header className="grid gap-7 bg-[#1b1010] p-7 text-white sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f2a900]"><UserRoundCog size={17} /> People access migration</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold sm:text-6xl">Move People Notes to Firebase.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">The server gives each unfinished account a memorable temporary password, saves its Firebase link, then emails the person. A migration is complete only when both steps succeed.</p>
        </div>
        <button type="button" onClick={() => void migrate()} disabled={busyKey !== '' || loading} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#8d211d] px-6 font-extrabold text-white shadow-xl transition hover:-translate-y-0.5 disabled:opacity-50">
          {busyKey === 'all' ? <LoaderCircle className="animate-spin" size={19} /> : <KeyRound size={19} />}
          Migrate current people
        </button>
      </header>

      <div className="p-5 sm:p-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatusCard label="Complete" value={counts.complete || 0} tone="green" />
          <StatusCard label="Ready / retry" value={(counts.ready || 0) + (counts.firebase_ready || 0) + (counts.email_failed || 0) + (counts.firebase_failed || 0)} tone="gold" />
          <StatusCard label="Needs data" value={(counts.missing_email || 0) + (counts.invalid_email || 0)} tone="red" />
        </div>

        {(message || error) && <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}

        {loading ? (
          <div className="grid min-h-48 place-items-center text-stone-500"><LoaderCircle className="animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {people.map(person => {
              const busy = busyKey === person.memberKey;
              const editableEmail = !person.firebaseUid;
              return (
                <article key={person.memberKey} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-xl font-semibold text-[#5f1919]">{person.fullName || 'Unnamed person'}</h3>
                    <p className="mt-1 text-xs text-stone-500">{STATUS_LABELS[person.status] || person.status}</p>
                    {person.problem && <p className="mt-2 flex gap-1.5 text-xs leading-5 text-red-700"><AlertTriangle className="mt-0.5 shrink-0" size={14} />{person.problem}</p>}
                  </div>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-500"><Mail size={13} /> Firebase email</span>
                    <input type="email" disabled={!editableEmail || busy} value={emailDrafts[person.memberKey] || ''} onChange={event => setEmailDrafts(current => ({ ...current, [person.memberKey]: event.target.value }))} className="min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-[#7a1b1b] disabled:opacity-60" />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    {person.status === 'complete' ? (
                      <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800"><CheckCircle2 size={17} /> Firebase + email</span>
                    ) : (
                      <>
                        {(person.status === 'missing_email' || person.status === 'invalid_email') && <button type="button" disabled={busy} onClick={() => void saveEmail(person)} className="min-h-11 rounded-xl border border-[#7a1b1b]/20 px-4 text-sm font-bold text-[#7a1b1b] disabled:opacity-50">Save email</button>}
                        {(person.status === 'ready' || person.status === 'firebase_ready' || person.status === 'email_failed' || person.status === 'firebase_failed') && <button type="button" disabled={busy} onClick={() => void migrate([person.memberKey])} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#7a1b1b] px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} Migrate / retry</button>}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'gold' | 'red' }) {
  const colors = tone === 'green' ? 'bg-emerald-50 text-emerald-900' : tone === 'gold' ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-900';
  return <div className={`rounded-2xl p-4 ${colors}`}><span className="block text-3xl font-black">{value}</span><span className="text-xs font-extrabold uppercase tracking-wider opacity-65">{label}</span></div>;
}
