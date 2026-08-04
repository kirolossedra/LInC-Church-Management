import { useEffect, useMemo, useState } from 'react';
import { NEXTGEN_ID_PATTERN } from './nextGenActivities.constants';
import { saveNextGenQuestion, submitPeerVote, subscribeToQuestions } from './nextGenActivities.firebase';
import type { NextGenUserRecord, QASessionForm, SavedQASession, VoteType } from './nextGenActivities.types';
import { getReviewableSessions, normalizeUserId } from './nextGenActivities.utils';

interface QuestionState {
  userId: string;
  sessions: SavedQASession[];
  reviewedSessionIds: Set<string>;
  isLoading: boolean;
  error: string;
}

export default function useNextGenQuestions(
  activeUser: NextGenUserRecord | null,
  initialReviewedSessionIds: Set<string>,
  isArabic: boolean,
) {
  const [form, setForm] = useState<QASessionForm>({ question: '', category: 'Theology', notes: '' });
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [state, setState] = useState<QuestionState>({
    userId: '',
    sessions: [],
    reviewedSessionIds: new Set(),
    isLoading: false,
    error: '',
  });
  const [isSubmittingPeerVote, setIsSubmittingPeerVote] = useState(false);
  const [submittingVoteSessionId, setSubmittingVoteSessionId] = useState<string | null>(null);

  const activeUserId = activeUser?.userId || '';
  const effectiveState = state.userId === activeUserId
    ? state
    : {
        userId: activeUserId,
        sessions: [],
        reviewedSessionIds: initialReviewedSessionIds,
        isLoading: Boolean(activeUserId),
        error: '',
      };

  useEffect(() => {
    if (!activeUserId) return undefined;
    return subscribeToQuestions(
      activeUserId,
      (sessions, votedQuestionIds) => {
        setState({
          userId: activeUserId,
          sessions,
          reviewedSessionIds: new Set([...initialReviewedSessionIds, ...votedQuestionIds]),
          isLoading: false,
          error: '',
        });
      },
      error => {
        console.error('Failed to load NextGen Q&A sessions:', error);
        setState({
          userId: activeUserId,
          sessions: [],
          reviewedSessionIds: initialReviewedSessionIds,
          isLoading: false,
          error: isArabic ? 'فشل تحميل الأسئلة للمراجعة.' : 'Failed to load questions for peer review.',
        });
      },
    );
  }, [activeUserId, initialReviewedSessionIds, isArabic]);

  const reviewableSessions = useMemo(
    () => getReviewableSessions(effectiveState.sessions, effectiveState.reviewedSessionIds),
    [effectiveState.sessions, effectiveState.reviewedSessionIds],
  );

  const resetForm = () => setForm({ question: '', category: 'Theology', notes: '' });
  const resetQuestionSession = () => {
    setState({
      userId: '',
      sessions: [],
      reviewedSessionIds: new Set(),
      isLoading: false,
      error: '',
    });
    setIsSubmittingPeerVote(false);
    setSubmittingVoteSessionId(null);
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!activeUser) return false;
    if (!form.question.trim()) {
      alert(isArabic ? 'يرجى كتابة السؤال قبل الحفظ.' : 'Please write the question before saving.');
      return false;
    }
    setIsSavingDraft(true);
    try {
      await saveNextGenQuestion(activeUser, form);
      alert(isArabic ? 'تم حفظ السؤال ليتمكن Pastor من مراجعته.' : 'Question saved for Pastor review.');
      resetForm();
      return true;
    } catch (error) {
      console.error('Failed to save NextGen question:', error);
      alert(isArabic ? 'فشل حفظ السؤال في قاعدة البيانات.' : 'Failed to save the question to the database.');
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePeerVote = async (sessionId: string, voteType: VoteType) => {
    if (!activeUser || isSubmittingPeerVote) return;
    const userId = normalizeUserId(activeUser.userId);
    if (!NEXTGEN_ID_PATTERN.test(userId)) return;
    setIsSubmittingPeerVote(true);
    setSubmittingVoteSessionId(sessionId);
    setState(previous => ({ ...previous, error: '' }));
    try {
      const result = await submitPeerVote(userId, sessionId, voteType);
      if (result === 'missing-question') {
        setState(previous => ({ ...previous, error: isArabic ? 'هذا السؤال لم يعد موجوداً.' : 'This question no longer exists.' }));
        return;
      }
      setState(previous => ({
        ...previous,
        userId,
        reviewedSessionIds: new Set([...previous.reviewedSessionIds, sessionId]),
        error: result === 'already-voted'
          ? (isArabic ? 'هذا المعرّف صوّت بالفعل على هذا السؤال.' : 'This identifier has already voted on this question.')
          : '',
      }));
    } catch (error) {
      console.error('Failed to submit peer review vote:', error);
      setState(previous => ({ ...previous, error: isArabic ? 'فشل حفظ التصويت. حاول مرة أخرى.' : 'Failed to save the vote. Try again.' }));
    } finally {
      setIsSubmittingPeerVote(false);
      setSubmittingVoteSessionId(null);
    }
  };

  return {
    form,
    setForm,
    isSavingDraft,
    reviewableSessions,
    isLoadingPeerReview: effectiveState.isLoading,
    peerReviewError: effectiveState.error,
    isSubmittingPeerVote,
    submittingVoteSessionId,
    resetForm,
    resetQuestionSession,
    handleSaveDraft,
    handlePeerVote,
  };
}

export type UseNextGenQuestionsResult = ReturnType<typeof useNextGenQuestions>;
