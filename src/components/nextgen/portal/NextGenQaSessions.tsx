import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, MessageCircleQuestion } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getNextGenSession,
  getNextGenSessions,
  submitNextGenVote,
  type NextGenQaQuestion,
  type NextGenQaSession,
} from '../../../services/nextGenPortal';

export function NextGenQaSessionList() {
  const [sessions, setSessions] = useState<NextGenQaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void getNextGenSessions().then(result => setSessions(result.sessions)).catch(loadError => setError(loadError instanceof Error ? loadError.message : 'QA sessions could not be loaded.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-3 rounded-3xl bg-white p-8 text-stone-500"><Loader2 className="animate-spin" /> Loading QA sessions…</div>;
  if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">{error}</div>;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[0.28em] text-[#a66c18]">Separate forms</p><h2 className="mt-2 font-serif text-4xl text-[#661816]">QA sessions</h2></div>
        <span className="rounded-full bg-[#efe5d5] px-4 py-2 text-xs font-black text-[#661816]">{sessions.length} open</span>
      </div>
      {sessions.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[#7a1717]/20 bg-white/70 px-8 py-16 text-center"><MessageCircleQuestion className="mx-auto text-[#a66c18]" size={42} /><p className="mt-5 font-serif text-2xl text-[#661816]">No QA session is open yet.</p></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {sessions.map(session => (
            <button key={session.id} onClick={() => navigate(`/nextgen-activities/qa/${session.id}`)} className="group rounded-[2rem] border border-[#7a1717]/10 bg-white p-7 text-left shadow-[0_18px_45px_rgba(70,20,18,0.08)] transition hover:-translate-y-1 hover:border-[#7a1717]/30">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a66c18]">Open session</p>
              <h3 className="mt-3 font-serif text-3xl text-[#661816]">{session.title}</h3>
              {session.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{session.description}</p>}
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7a1717]">Open form <ArrowRight size={17} className="transition group-hover:translate-x-1" /></span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function NextGenQaSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<NextGenQaSession | null>(null);
  const [questions, setQuestions] = useState<NextGenQaQuestion[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void getNextGenSession(sessionId).then(result => {
      setSession(result.session);
      setQuestions(result.questions);
      setVotedIds(new Set(result.votedQuestionIds));
    }).catch(loadError => setError(loadError instanceof Error ? loadError.message : 'The QA session could not be loaded.'));
  }, [sessionId]);

  const vote = async (question: NextGenQaQuestion) => {
    const optionId = answers[question.id];
    if (!optionId) return;
    setBusyId(question.id);
    setError('');
    try {
      await submitNextGenVote(sessionId, question.id, optionId);
      setVotedIds(current => new Set([...current, question.id]));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your vote could not be submitted.');
    } finally { setBusyId(''); }
  };

  if (error && !session) return <div className="rounded-3xl border border-red-200 bg-red-50 p-7 font-bold text-red-700">{error}</div>;
  if (!session) return <div className="grid min-h-[360px] place-items-center"><Loader2 className="animate-spin text-[#7a1717]" size={36} /></div>;

  return (
    <section className="mx-auto max-w-4xl">
      <header className="rounded-[2.4rem] bg-[#1b0d0d] p-8 text-white md:p-11"><p className="text-xs font-black uppercase tracking-[0.3em] text-[#f2a900]">NextGen QA session</p><h1 className="mt-4 font-serif text-5xl">{session.title}</h1>{session.description && <p className="mt-5 max-w-2xl leading-7 text-stone-300">{session.description}</p>}</header>
      {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      <div className="mt-7 space-y-6">
        {questions.map((question, index) => {
          const completed = votedIds.has(question.id);
          return <article key={question.id} className="rounded-[2rem] border border-[#7a1717]/10 bg-white p-7 shadow-[0_16px_40px_rgba(70,20,18,0.07)]">
            <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7a1717] font-black text-white">{index + 1}</span><h2 className="pt-1 font-serif text-2xl text-[#661816]">{question.prompt}</h2></div>
            {completed ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-green-50 p-4 font-bold text-green-800"><CheckCircle2 size={20} /> Vote recorded. It cannot be submitted again.</div> : <>
              <div className="mt-6 grid gap-3">{question.options.map(option => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${answers[question.id] === option.id ? 'border-[#7a1717] bg-[#fff7f1]' : 'border-stone-200 hover:border-[#7a1717]/40'}`}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers(current => ({ ...current, [question.id]: option.id }))} /><span className="font-semibold text-stone-700">{option.label}</span></label>)}</div>
              <button onClick={() => void vote(question)} disabled={!answers[question.id] || Boolean(busyId)} className="mt-6 rounded-2xl bg-[#7a1717] px-6 py-3 font-black text-white disabled:opacity-40">{busyId === question.id ? 'Submitting…' : 'Submit vote'}</button>
            </>}
          </article>;
        })}
      </div>
    </section>
  );
}
