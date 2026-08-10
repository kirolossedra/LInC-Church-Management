import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, CircleSlash2, Loader2, Plus, ShieldCheck, Users } from 'lucide-react';

import {
  addPastorNextGenQuestion,
  createPastorNextGenSession,
  getPastorNextGenSession,
  getPastorNextGenSessions,
  updateNextGenParticipantStatus,
  updatePastorNextGenSession,
  type NextGenPastorSessionView,
  type NextGenQaSession,
} from '../../../services/nextGenPortal';

export default function NextGenQaSessionsAdmin({ expanded, onToggleExpanded }: {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [sessions, setSessions] = useState<NextGenQaSession[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<NextGenPastorSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [optionsText, setOptionsText] = useState('Yes\nNo');
  const sessionIsClosed = detail?.session.status === 'closed';

  const loadSessions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getPastorNextGenSessions();
      setSessions(result.sessions);
      setSelectedId(current => current || result.sessions[0]?.id || '');
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'QA sessions could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (sessionId: string) => {
    if (!sessionId) { setDetail(null); return; }
    try { setDetail(await getPastorNextGenSession(sessionId)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'The session could not be loaded.'); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSessions(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSessions]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDetail(selectedId); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId]);

  const createSession = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await createPastorNextGenSession({ title, description, status: 'draft' });
      setSessions(current => [result.session, ...current]); setSelectedId(result.session.id); setTitle(''); setDescription('');
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Session creation failed.'); }
    finally { setBusy(false); }
  };

  const setStatus = async (status: 'draft' | 'open' | 'closed') => {
    if (!selectedId) return; setBusy(true);
    try {
      const result = await updatePastorNextGenSession(selectedId, { status });
      setSessions(current => current.map(session => session.id === selectedId ? { ...session, status } : session));
      setDetail(current => current ? { ...current, session: result.session } : current);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Status update failed.'); }
    finally { setBusy(false); }
  };

  const addQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const options = optionsText.split('\n').map(value => value.trim()).filter(Boolean);
    if (!selectedId || options.length < 2) { setError('Enter at least two answer options, one per line.'); return; }
    setBusy(true); setError('');
    try { await addPastorNextGenQuestion(selectedId, { prompt, options }); setPrompt(''); setOptionsText('Yes\nNo'); await loadDetail(selectedId); await loadSessions(); }
    catch (addError) { setError(addError instanceof Error ? addError.message : 'Question creation failed.'); }
    finally { setBusy(false); }
  };

  const reviewParticipant = async (uid: string, status: 'verified' | 'discarded') => {
    if (!selectedId) return; setBusy(true);
    try { await updateNextGenParticipantStatus(selectedId, uid, status); await loadDetail(selectedId); await loadSessions(); }
    catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Participant review failed.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#7a1717]/10 bg-[#fffdf9] shadow-[0_20px_55px_rgba(70,20,18,0.08)]">
      <button onClick={onToggleExpanded} className="flex w-full items-center justify-between gap-4 bg-[#1b0d0d] px-7 py-6 text-left text-white">
        <div><p className="text-xs font-black uppercase tracking-[0.27em] text-[#f2a900]">Integrity-controlled forms</p><h3 className="mt-2 flex items-center gap-3 font-serif text-3xl"><ShieldCheck /> NextGen QA Sessions <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-sans">{sessions.length}</span></h3></div>
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </button>
      {expanded && <div className="space-y-8 p-6 md:p-8">
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        <form onSubmit={createSession} className="grid gap-3 rounded-3xl border border-[#7a1717]/10 bg-[#f8f2e9] p-5 md:grid-cols-[1fr_1fr_auto]">
          <input value={title} onChange={event => setTitle(event.target.value)} required placeholder="Session title" className="rounded-xl border border-stone-200 bg-white px-4 py-3" />
          <input value={description} onChange={event => setDescription(event.target.value)} placeholder="Short description" className="rounded-xl border border-stone-200 bg-white px-4 py-3" />
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1717] px-5 py-3 font-black text-white"><Plus size={17} /> New session</button>
        </form>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : sessions.length === 0 ? <p className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500">Create the first QA session above.</p> : <>
          <div className="flex flex-wrap gap-2">{sessions.map(session => <button key={session.id} onClick={() => setSelectedId(session.id)} className={`rounded-full border px-4 py-2 text-sm font-black ${selectedId === session.id ? 'border-[#7a1717] bg-[#7a1717] text-white' : 'border-stone-200 bg-white text-stone-600'}`}>{session.title} · {session.status}</button>)}</div>
          {detail && <div className="space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-6"><div><h4 className="font-serif text-3xl text-[#661816]">{detail.session.title}</h4><p className="mt-2 text-sm text-stone-500">{detail.questions.length} questions · {detail.participants.length} voters</p></div><div className="flex gap-2">{(['draft', 'open', 'closed'] as const).map(status => <button key={status} disabled={busy} onClick={() => void setStatus(status)} className={`rounded-xl px-4 py-2 text-xs font-black uppercase ${detail.session.status === status ? 'bg-[#7a1717] text-white' : 'border border-stone-200 text-stone-600'}`}>{status}</button>)}</div></div>
            <form onSubmit={addQuestion} className={`grid gap-4 rounded-3xl border p-6 lg:grid-cols-2 ${sessionIsClosed ? 'border-stone-200 bg-stone-100 opacity-70' : 'border-[#a66c18]/20 bg-[#fffaf0]'}`}>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Question</label>
                <textarea value={prompt} onChange={event => setPrompt(event.target.value)} required disabled={sessionIsClosed} rows={5} className="mt-2 w-full rounded-2xl border border-stone-200 bg-white p-4 disabled:cursor-not-allowed disabled:bg-stone-100" />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Answer options / one per line</label>
                <textarea value={optionsText} onChange={event => setOptionsText(event.target.value)} required disabled={sessionIsClosed} rows={5} className="mt-2 w-full rounded-2xl border border-stone-200 bg-white p-4 disabled:cursor-not-allowed disabled:bg-stone-100" />
                <button disabled={busy || sessionIsClosed} className="mt-3 rounded-xl bg-[#a66c18] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-stone-400">Add question</button>
                {sessionIsClosed && <p className="mt-3 text-xs font-bold text-stone-600">This session is read-only. Reopen it before adding questions.</p>}
              </div>
            </form>
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-stone-200 bg-white p-6"><h4 className="flex items-center gap-2 font-serif text-2xl text-[#661816]"><Users size={21} /> Voter integrity</h4><p className="mt-2 text-xs text-stone-500">Names and emails are shown here. Their exact answers are never shown.</p><div className="mt-5 space-y-3">{detail.participants.length === 0 ? <p className="text-sm text-stone-400">No votes yet.</p> : detail.participants.map(participant => <article key={participant.uid} className="rounded-2xl border border-stone-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-stone-800">{participant.name}</p><p className="text-xs text-stone-500">{participant.email}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${participant.status === 'verified' ? 'bg-green-100 text-green-800' : participant.status === 'discarded' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{participant.status}</span></div><div className="flex gap-2"><button disabled={busy} onClick={() => void reviewParticipant(participant.uid, 'verified')} className="rounded-xl bg-green-50 p-2.5 text-green-700" title="Verify"><CheckCircle2 size={17} /></button><button disabled={busy} onClick={() => void reviewParticipant(participant.uid, 'discarded')} className="rounded-xl bg-red-50 p-2.5 text-red-700" title="Discard"><CircleSlash2 size={17} /></button></div></div></article>)}</div></section>
              <section className="rounded-3xl border border-stone-200 bg-white p-6"><h4 className="flex items-center gap-2 font-serif text-2xl text-[#661816]"><BarChart3 size={21} /> Verified results</h4><p className="mt-2 text-xs text-stone-500">Pending and discarded voters are excluded automatically.</p><div className="mt-5 space-y-5">{detail.questions.map(question => { const result = detail.results.find(item => item.questionId === question.id); return <article key={question.id} className="rounded-2xl bg-[#f8f2e9] p-4"><p className="font-black text-stone-800">{question.prompt}</p><div className="mt-3 space-y-2">{question.options.map(option => <div key={option.id} className="flex items-center justify-between text-sm"><span>{option.label}</span><strong>{result?.counts[option.id] ?? 0}</strong></div>)}</div><p className="mt-3 text-xs font-bold text-[#7a1717]">{result?.totalVerifiedVotes ?? 0} verified votes</p></article>; })}</div></section>
            </div>
          </div>}
        </>}
      </div>}
    </section>
  );
}
