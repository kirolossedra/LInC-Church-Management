import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { onValue, push, ref, runTransaction } from 'firebase/database';
import { database } from '../firebase';
import { useI18n } from '../i18n';

interface QASessionForm {
  question: string;
  category: string;
  notes: string;
}

interface SavedQASession {
  firebaseId: string;
  question: string;
  category: string;
  notes: string;
  status: string;
  source: string;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  createdAt: number;
  updatedAt: number;
}

interface LastPeerAction {
  sessionId: string;
  voteType: 'upvote' | 'downvote';
}

const CATEGORY_OPTIONS = [
  'Theology',
  'Apologetics',
  'Prayer',
  'Bible Study',
  'Discipleship',
  'Christian Living',
  'Church Life',
  'Youth Questions',
  'Other',
];

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeSavedSession(firebaseId: string, value: any): SavedQASession {
  const totalUpvotes = normalizeNumber(value?.totalUpvotes);
  const totalDownvotes = normalizeNumber(value?.totalDownvotes);
  const netVotes = typeof value?.netVotes === 'number'
    ? normalizeNumber(value.netVotes)
    : totalUpvotes - totalDownvotes;

  return {
    firebaseId,
    question: String(value?.question || '').trim(),
    category: String(value?.category || 'Other').trim(),
    notes: String(value?.notes || '').trim(),
    status: String(value?.status || '').trim(),
    source: String(value?.source || '').trim(),
    totalUpvotes,
    totalDownvotes,
    netVotes,
    createdAt: normalizeNumber(value?.createdAt),
    updatedAt: normalizeNumber(value?.updatedAt),
  };
}

export default function NextGenActivities() {
  const navigate = useNavigate();
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [isQASessionOpen, setIsQASessionOpen] = useState(false);
  const [isPeerReviewOpen, setIsPeerReviewOpen] = useState(false);

  const [form, setForm] = useState<QASessionForm>({
    question: '',
    category: 'Theology',
    notes: '',
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [savedSessions, setSavedSessions] = useState<SavedQASession[]>([]);
  const [isLoadingPeerReview, setIsLoadingPeerReview] = useState(true);
  const [peerReviewError, setPeerReviewError] = useState('');
  const [reviewedSessionIds, setReviewedSessionIds] = useState<Set<string>>(() => new Set());
  const [lastPeerAction, setLastPeerAction] = useState<LastPeerAction | null>(null);
  const [isSubmittingPeerVote, setIsSubmittingPeerVote] = useState(false);
  const [isUndoingPeerVote, setIsUndoingPeerVote] = useState(false);

  const reviewableSessions = useMemo(() => {
    return savedSessions
      .filter(session => session.question && !reviewedSessionIds.has(session.firebaseId))
      .sort((a, b) => {
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return a.question.localeCompare(b.question);
      });
  }, [savedSessions, reviewedSessionIds]);

  const activePeerReviewSession = reviewableSessions[0] || null;

  useEffect(() => {
    setIsLoadingPeerReview(true);
    setPeerReviewError('');

    const sessionsRef = ref(database, 'nextGenActivities/qaSessions/');

    const unsubscribe = onValue(
      sessionsRef,
      snapshot => {
        const rawSessions = snapshot.val() as Record<string, any> | null;

        const loadedSessions = Object.entries(rawSessions || {})
          .map(([firebaseId, value]) => normalizeSavedSession(firebaseId, value))
          .filter(session => session.question);

        setSavedSessions(loadedSessions);
        setIsLoadingPeerReview(false);
      },
      error => {
        console.error('Failed to load NextGen Q&A sessions:', error);
        setPeerReviewError(
          isArabic
            ? 'فشل تحميل الأسئلة للمراجعة.'
            : 'Failed to load questions for peer review.'
        );
        setIsLoadingPeerReview(false);
      }
    );

    return () => unsubscribe();
  }, [isArabic]);

  const resetForm = () => {
    setForm({
      question: '',
      category: 'Theology',
      notes: '',
    });
  };

  const handleSaveDraft = async () => {
    const cleanedQuestion = form.question.trim();
    const cleanedNotes = form.notes.trim();

    if (!cleanedQuestion) {
      alert(isArabic ? 'يرجى كتابة السؤال قبل الحفظ.' : 'Please write the question before saving.');
      return;
    }

    setIsSavingDraft(true);

    try {
      const now = Date.now();
      const payload = {
        question: cleanedQuestion,
        category: form.category,
        notes: cleanedNotes,
        status: 'submittedForPastorReview',
        source: 'nextGenActivities',
        verses: [],
        translation: '',
        totalUpvotes: 0,
        totalDownvotes: 0,
        netVotes: 0,
        createdAt: now,
        updatedAt: now,
      };

      await push(ref(database, 'nextGenActivities/qaSessions/'), payload);

      alert(isArabic ? 'تم حفظ السؤال ليتمكن Pastor من مراجعته.' : 'Question saved for Pastor review.');
      resetForm();
      setIsQASessionOpen(false);
    } catch (err) {
      console.error('Failed to save NextGen question:', err);
      alert(isArabic ? 'فشل حفظ السؤال في قاعدة البيانات.' : 'Failed to save the question to the database.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePeerVote = async (sessionId: string, voteType: 'upvote' | 'downvote') => {
    if (isSubmittingPeerVote || reviewedSessionIds.has(sessionId)) return;

    setIsSubmittingPeerVote(true);
    setPeerReviewError('');

    try {
      const sessionRef = ref(database, `nextGenActivities/qaSessions/${sessionId}`);

      await runTransaction(sessionRef, currentSession => {
        if (!currentSession) return currentSession;

        const currentUpvotes = normalizeNumber(currentSession.totalUpvotes);
        const currentDownvotes = normalizeNumber(currentSession.totalDownvotes);

        const nextUpvotes = voteType === 'upvote' ? currentUpvotes + 1 : currentUpvotes;
        const nextDownvotes = voteType === 'downvote' ? currentDownvotes + 1 : currentDownvotes;

        return {
          ...currentSession,
          totalUpvotes: nextUpvotes,
          totalDownvotes: nextDownvotes,
          netVotes: nextUpvotes - nextDownvotes,
          updatedAt: Date.now(),
        };
      });

      setReviewedSessionIds(prev => {
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });

      setLastPeerAction({
        sessionId,
        voteType,
      });
    } catch (err) {
      console.error('Failed to submit peer review vote:', err);
      setPeerReviewError(
        isArabic
          ? 'فشل حفظ التصويت. حاول مرة أخرى.'
          : 'Failed to save the vote. Try again.'
      );
    } finally {
      setIsSubmittingPeerVote(false);
    }
  };

  const handleUndoPreviousPeerVote = async () => {
    if (!lastPeerAction || isUndoingPeerVote) return;

    setIsUndoingPeerVote(true);
    setPeerReviewError('');

    try {
      const sessionRef = ref(database, `nextGenActivities/qaSessions/${lastPeerAction.sessionId}`);

      await runTransaction(sessionRef, currentSession => {
        if (!currentSession) return currentSession;

        const currentUpvotes = normalizeNumber(currentSession.totalUpvotes);
        const currentDownvotes = normalizeNumber(currentSession.totalDownvotes);

        const nextUpvotes = lastPeerAction.voteType === 'upvote'
          ? Math.max(0, currentUpvotes - 1)
          : currentUpvotes;

        const nextDownvotes = lastPeerAction.voteType === 'downvote'
          ? Math.max(0, currentDownvotes - 1)
          : currentDownvotes;

        return {
          ...currentSession,
          totalUpvotes: nextUpvotes,
          totalDownvotes: nextDownvotes,
          netVotes: nextUpvotes - nextDownvotes,
          updatedAt: Date.now(),
        };
      });

      setReviewedSessionIds(prev => {
        const next = new Set(prev);
        next.delete(lastPeerAction.sessionId);
        return next;
      });

      setLastPeerAction(null);
    } catch (err) {
      console.error('Failed to undo peer review vote:', err);
      setPeerReviewError(
        isArabic
          ? 'فشل التراجع عن التصويت السابق.'
          : 'Failed to undo the previous vote.'
      );
    } finally {
      setIsUndoingPeerVote(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <section className="relative overflow-hidden px-6 py-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 58%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[#8b1e1e] rounded-full font-bold border border-[rgba(139,30,30,0.12)] shadow-sm hover:bg-[#f8eeee] transition-all"
          >
            <ArrowLeft size={18} className={isArabic ? 'rotate-180' : ''} />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </button>

          <div className="text-center mt-14 mb-12">
            <div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_28px_rgba(139,30,30,0.24)] mb-6">
              <Sparkles size={28} />
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#8b1e1e] leading-tight mb-4">
              {isArabic ? 'أنشطة NextGen' : 'NextGen Activities'}
            </h1>
            <p className="max-w-2xl mx-auto text-[#666] text-lg leading-relaxed">
              {isArabic
                ? 'مساحة لإضافة أسئلة ومحتوى نقاش خاص بخدمة NextGen.'
                : 'A dedicated space for NextGen questions, discussion topics, and teaching content.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <motion.button
              type="button"
              onClick={() => {
                setIsQASessionOpen(true);
                setIsPeerReviewOpen(false);
              }}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                isQASessionOpen
                  ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                  : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isQASessionOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                    <HelpCircle size={26} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'إضافة سؤال' : 'Add Question'}
                    </h2>
                    <p className={`text-sm mt-1 ${isQASessionOpen ? 'text-white/80' : 'text-[#777]'}`}>
                      {isArabic ? 'اكتب سؤالاً واختر التصنيف فقط.' : 'Write a question and choose a category.'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={22} className={`transition-transform ${isQASessionOpen ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                setIsPeerReviewOpen(true);
                setIsQASessionOpen(false);
              }}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                isPeerReviewOpen
                  ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                  : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isPeerReviewOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                    <ThumbsUp size={26} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'مراجعة الزملاء' : 'Peer Review'}
                    </h2>
                    <p className={`text-sm mt-1 ${isPeerReviewOpen ? 'text-white/80' : 'text-[#777]'}`}>
                      {isArabic ? 'صوّت على الأسئلة مرة واحدة بصدق.' : 'Review questions once with honesty.'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={22} className={`transition-transform ${isPeerReviewOpen ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>

            <div className="p-7 rounded-[28px] bg-white border border-[rgba(139,30,30,0.08)] shadow-sm">
              <h3 className="text-xl font-bold text-[#8b1e1e] mb-3">
                {isArabic ? 'ملاحظات التنفيذ' : 'Implementation Notes'}
              </h3>
              <p className="text-[#666] leading-relaxed">
                {isArabic
                  ? 'هذه الصفحة تحفظ السؤال فقط مع حقول تصويت مخفية ليتم ترتيب الأسئلة لاحقاً.'
                  : 'This page saves the question only, with hidden vote counters for later ranking.'}
              </p>
            </div>
          </div>

          {isQASessionOpen && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                <div className="flex items-center gap-3">
                  <HelpCircle size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'إضافة سؤال للمراجعة' : 'Create Question'}
                    </h2>
                    <p className="text-white/75 text-sm mt-1">
                      {isArabic ? 'اكتب السؤال فقط، ثم اختر التصنيف إذا لزم.' : 'Write the question only, then choose a category if needed.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQASessionOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-7">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {isArabic ? 'السؤال' : 'Question'}
                  </label>
                  <textarea
                    value={form.question}
                    onChange={e => setForm(prev => ({ ...prev, question: e.target.value }))}
                    rows={5}
                    placeholder={isArabic ? 'اكتب السؤال هنا...' : 'Write the question here...'}
                    className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none resize-none text-[#242424]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isArabic ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={form.category}
                      onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414]"
                    >
                      {CATEGORY_OPTIONS.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isArabic ? 'ملاحظات اختيارية' : 'Optional Notes'}
                    </label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={isArabic ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                      className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-stone-100 text-[#641414] rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    {isArabic ? 'إعادة ضبط' : 'Reset'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#8b1e1e] text-white rounded-xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] active:bg-[#3f0f0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSavingDraft
                      ? (isArabic ? 'جار الحفظ...' : 'Saving...')
                      : (isArabic ? 'حفظ للمراجعة' : 'Save for Pastor Review')}
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {isPeerReviewOpen && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                <div className="flex items-center gap-3">
                  <ThumbsUp size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'مراجعة الأسئلة' : 'Peer Review Questions'}
                    </h2>
                    <p className="text-white/75 text-sm mt-1">
                      {isArabic
                        ? 'راجع كل سؤال مرة واحدة بصدق. التراجع متاح لآخر تصويت فقط.'
                        : 'Review each question honestly once. Undo is available only for the previous vote.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPeerReviewOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
                  <h3 className="font-bold mb-2">
                    {isArabic ? 'تعهد الأمانة' : 'Honesty Disclaimer'}
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {isArabic
                      ? 'يرجى مراجعة كل سؤال مرة واحدة فقط. لا تستخدم التحديث أو فتح الصفحة مرة أخرى للتصويت على نفس السؤال أكثر من مرة. الهدف هو تقييم صادق يساعد Pastor في ترتيب الأسئلة.'
                      : 'Please review each question only once. Do not refresh or reopen the page to vote on the same question multiple times. The goal is honest feedback that helps Pastor prioritize the questions.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    {isArabic
                      ? `المتبقي للمراجعة في هذه الجلسة: ${reviewableSessions.length}`
                      : `Remaining in this session: ${reviewableSessions.length}`}
                  </div>

                  <button
                    type="button"
                    onClick={handleUndoPreviousPeerVote}
                    disabled={!lastPeerAction || isUndoingPeerVote || isSubmittingPeerVote}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-100 text-[#641414] rounded-xl font-bold hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUndoingPeerVote ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    {isArabic ? 'تراجع عن آخر تصويت' : 'Undo Previous Vote'}
                  </button>
                </div>

                {peerReviewError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
                    {peerReviewError}
                  </div>
                )}

                {isLoadingPeerReview && (
                  <div className="flex items-center gap-2 text-gray-500 bg-stone-50 border border-gray-100 rounded-2xl p-5">
                    <Loader2 size={18} className="animate-spin" />
                    {isArabic ? 'جار تحميل الأسئلة...' : 'Loading questions...'}
                  </div>
                )}

                {!isLoadingPeerReview && !activePeerReviewSession && (
                  <div className="text-center bg-stone-50 border border-gray-100 rounded-3xl p-10">
                    <div className="w-14 h-14 mx-auto grid place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e] mb-4">
                      <ThumbsUp size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-[#8b1e1e] mb-2">
                      {isArabic ? 'لا توجد أسئلة أخرى للمراجعة' : 'No More Questions to Review'}
                    </h3>
                    <p className="text-gray-500">
                      {isArabic
                        ? 'تمت مراجعة كل الأسئلة المتاحة في هذه الجلسة.'
                        : 'You have reviewed all available questions in this session.'}
                    </p>
                  </div>
                )}

                {!isLoadingPeerReview && activePeerReviewSession && (
                  <motion.div
                    key={activePeerReviewSession.firebaseId}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[28px] bg-stone-50 border border-gray-100 p-6 space-y-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-[#f8eeee] text-[#8b1e1e] rounded-full text-xs font-bold border border-[rgba(139,30,30,0.10)]">
                            {activePeerReviewSession.category}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#641414] leading-snug">
                          {activePeerReviewSession.question}
                        </h3>
                      </div>

                      <div className="grid grid-cols-3 gap-2 min-w-[220px]">
                        <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-400 font-bold uppercase">
                            {isArabic ? 'مؤيد' : 'Up'}
                          </div>
                          <div className="text-xl font-bold text-green-700">
                            {activePeerReviewSession.totalUpvotes}
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-400 font-bold uppercase">
                            {isArabic ? 'رافض' : 'Down'}
                          </div>
                          <div className="text-xl font-bold text-red-700">
                            {activePeerReviewSession.totalDownvotes}
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-400 font-bold uppercase">
                            {isArabic ? 'الصافي' : 'Net'}
                          </div>
                          <div className="text-xl font-bold text-[#8b1e1e]">
                            {activePeerReviewSession.netVotes}
                          </div>
                        </div>
                      </div>
                    </div>

                    {activePeerReviewSession.notes && (
                      <div className="bg-white border border-gray-100 rounded-2xl p-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          {isArabic ? 'ملاحظات' : 'Notes'}
                        </h4>
                        <p className="text-sm leading-relaxed text-[#333]">
                          {activePeerReviewSession.notes}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handlePeerVote(activePeerReviewSession.firebaseId, 'upvote')}
                        disabled={isSubmittingPeerVote || isUndoingPeerVote}
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-700 text-white rounded-2xl font-bold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmittingPeerVote ? <Loader2 size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
                        {isArabic ? 'تصويت إيجابي' : 'Upvote'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePeerVote(activePeerReviewSession.firebaseId, 'downvote')}
                        disabled={isSubmittingPeerVote || isUndoingPeerVote}
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-red-700 text-white rounded-2xl font-bold hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmittingPeerVote ? <Loader2 size={18} className="animate-spin" /> : <ThumbsDown size={18} />}
                        {isArabic ? 'تصويت سلبي' : 'Downvote'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </section>
    </div>
  );
}
