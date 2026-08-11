import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Loader2, LockKeyhole, MessageCircleQuestion, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getNextGenSession,
  getNextGenSessions,
  submitNextGenQuestion,
  submitNextGenVote,
  type NextGenQaMemberView,
  type NextGenQaQuestion,
  type NextGenQaSession,
  type NextGenQaVoteType,
} from '../../../services/nextGenPortal';

export function NextGenQaSessionList() {
  const [sessions, setSessions] = useState<NextGenQaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const openSessionCount = sessions.filter(session => session.status === 'open').length;

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getNextGenSessions();
      setSessions(result.sessions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'QA sessions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  if (loading) return <div className="flex items-center gap-3 rounded-3xl bg-white p-8 text-stone-500"><Loader2 className="animate-spin" /> Loading QA sessions…</div>;
  if (error) return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p className="font-bold">{error}</p>
      <button type="button" onClick={() => void loadSessions()} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800">
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[0.28em] text-[#a66c18]">Separate forms</p><h2 className="mt-2 font-serif text-4xl text-[#661816]">QA sessions</h2></div>
        <span className="rounded-full bg-[#efe5d5] px-4 py-2 text-xs font-black text-[#661816]">{openSessionCount} open</span>
      </div>
      {sessions.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[#7a1717]/20 bg-white/70 px-8 py-16 text-center"><MessageCircleQuestion className="mx-auto text-[#a66c18]" size={42} /><p className="mt-5 font-serif text-2xl text-[#661816]">No QA sessions are available yet.</p></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {sessions.map(session => {
            const isOpen = session.status === 'open';
            return (
              <button
                key={session.id}
                type="button"
                disabled={!isOpen}
                aria-label={isOpen ? `Open ${session.title}` : `${session.title} is closed`}
                onClick={() => navigate(`/nextgen-activities/qa/${session.id}`)}
                className={`group rounded-[2rem] border p-7 text-left transition ${isOpen
                  ? 'border-[#7a1717]/10 bg-white shadow-[0_18px_45px_rgba(70,20,18,0.08)] hover:-translate-y-1 hover:border-[#7a1717]/30'
                  : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500 opacity-70 grayscale'
                }`}
              >
                <p className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] ${isOpen ? 'text-[#a66c18]' : 'text-stone-500'}`}>
                  {!isOpen && <LockKeyhole size={14} />}
                  {isOpen ? 'Open session' : 'Closed session'}
                </p>
                <h3 className="mt-3 font-serif text-3xl text-[#661816]">{session.title}</h3>
                {session.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{session.description}</p>}
                <span className={`mt-7 inline-flex items-center gap-2 text-sm font-black ${isOpen ? 'text-[#7a1717]' : 'text-stone-500'}`}>
                  {isOpen ? 'Open form' : 'Voting closed'}
                  {isOpen && <ArrowRight size={17} className="transition group-hover:translate-x-1" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function NextGenQaSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<NextGenQaSession | null>(null);
  const [questions, setQuestions] = useState<NextGenQaQuestion[]>([]);
  const [currentVotes, setCurrentVotes] = useState<Record<string, NextGenQaVoteType>>({});
  const [view, setView] = useState<NextGenQaMemberView>('all');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getNextGenSession(sessionId, view);
      setSession(result.session);
      setQuestions(result.questions);
      setCurrentVotes(result.currentVotes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The QA session could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, view]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const addQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setBusyId('new-question');
    setError('');
    try {
      await submitNextGenQuestion(sessionId, prompt);
      setPrompt('');
      await loadSession();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your question could not be submitted.');
    } finally {
      setBusyId('');
    }
  };

  const vote = async (question: NextGenQaQuestion, voteType: NextGenQaVoteType) => {
    setBusyId(question.id);
    setError('');
    try {
      await submitNextGenVote(sessionId, question.id, voteType);
      setCurrentVotes(current => ({ ...current, [question.id]: voteType }));
      if (view !== 'all') await loadSession();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your vote could not be submitted.');
    } finally {
      setBusyId('');
    }
  };

  if (loading && !session) return <div className="grid min-h-[360px] place-items-center"><Loader2 className="animate-spin text-[#7a1717]" size={36} /></div>;
  if (error && !session) return <div className="rounded-3xl border border-red-200 bg-red-50 p-7 font-bold text-red-700">{error}</div>;
  if (!session) return null;

  return (
    <section className="mx-auto max-w-4xl">
      <header className="rounded-[2.4rem] bg-[#1b0d0d] p-8 text-white md:p-11"><p className="text-xs font-black uppercase tracking-[0.3em] text-[#f2a900]">NextGen QA session</p><h1 className="mt-4 font-serif text-5xl">{session.title}</h1>{session.description && <p className="mt-5 max-w-2xl leading-7 text-stone-300">{session.description}</p>}</header>
      {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      <form onSubmit={addQuestion} className="mt-7 rounded-[2rem] border border-[#a66c18]/20 bg-[#fffaf0] p-6 shadow-[0_16px_40px_rgba(70,20,18,0.06)]">
        <label htmlFor="nextgen-question" className="text-xs font-black uppercase tracking-[0.22em] text-[#a66c18]">Add a question to this session</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea id="nextgen-question" value={prompt} onChange={event => setPrompt(event.target.value)} required maxLength={500} rows={3} placeholder="What would you like the group to discuss?" className="min-h-24 flex-1 rounded-2xl border border-stone-200 bg-white p-4 text-stone-800 outline-none transition focus:border-[#7a1717]" />
          <button type="submit" disabled={Boolean(busyId) || !prompt.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-6 py-4 font-black text-white disabled:opacity-40">
            {busyId === 'new-question' ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Submit question
          </button>
        </div>
      </form>
      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-2" aria-label="Question view">
        {([
          ['all', 'All questions'],
          ['my-upvotes', 'My upvotes'],
          ['net-votes', 'Ranked by community'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setView(value)} className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${view === value ? 'bg-[#7a1717] text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-7 space-y-6">
        {loading && <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-7 text-stone-500"><Loader2 className="animate-spin" size={20} /> Updating questions…</div>}
        {!loading && questions.length === 0 && <div className="rounded-[2rem] border border-dashed border-[#7a1717]/20 bg-white/70 p-12 text-center"><MessageCircleQuestion className="mx-auto text-[#a66c18]" size={38} /><p className="mt-4 font-serif text-2xl text-[#661816]">{view === 'my-upvotes' ? 'You have not upvoted a question yet.' : 'No questions have been added yet.'}</p></div>}
        {questions.map((question, index) => {
          const currentVote = currentVotes[question.id];
          const isBusy = busyId === question.id;
          return <article key={question.id} className="rounded-[2rem] border border-[#7a1717]/10 bg-white p-7 shadow-[0_16px_40px_rgba(70,20,18,0.07)]">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7a1717] font-black text-white">{index + 1}</span><div className="min-w-0 flex-1">{question.selectedForDiscussion && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0c2] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#7a4a00]"><Sparkles size={13} /> Selected for discussion</span>}<h2 className="mt-2 font-serif text-2xl text-[#661816]">{question.prompt}</h2></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void vote(question, 'upvote')} disabled={Boolean(busyId)} className={`flex items-center justify-center gap-2 rounded-2xl border p-4 font-black transition ${currentVote === 'upvote' ? 'border-green-700 bg-green-50 text-green-800' : 'border-stone-200 text-stone-700 hover:border-green-500 hover:bg-green-50'} disabled:opacity-50`}><ArrowUp size={20} /> Upvote {currentVote === 'upvote' && <CheckCircle2 size={17} />}</button>
              <button type="button" onClick={() => void vote(question, 'downvote')} disabled={Boolean(busyId)} className={`flex items-center justify-center gap-2 rounded-2xl border p-4 font-black transition ${currentVote === 'downvote' ? 'border-red-700 bg-red-50 text-red-800' : 'border-stone-200 text-stone-700 hover:border-red-400 hover:bg-red-50'} disabled:opacity-50`}><ArrowDown size={20} /> Downvote {currentVote === 'downvote' && <CheckCircle2 size={17} />}</button>
            </div>
            <p className="mt-3 text-xs text-stone-500">{isBusy ? 'Saving your choice…' : currentVote ? 'Your choice is saved. You can change it at any time while this session is open.' : 'Choose one. Vote totals are not shown publicly.'}</p>
          </article>;
        })}
      </div>
    </section>
  );
}
