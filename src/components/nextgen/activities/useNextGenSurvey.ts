import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BINARY_SURVEY_QUESTIONS, NEXTGEN_ID_PATTERN, NEXTGEN_SURVEY_ID, RATING_SURVEY_QUESTIONS, SURVEY_TOTAL_QUESTIONS } from './nextGenActivities.constants';
import { saveSurveyResponse, subscribeToSurveyCompletion } from './nextGenActivities.firebase';
import type { BinarySurveyQuestionId, NextGenUserRecord, RatingSurveyQuestionId, SurveyAnswers } from './nextGenActivities.types';
import { countSurveyAnswers, createInitialSurveyAnswers, getEasternTime, normalizeUserId } from './nextGenActivities.utils';

interface SurveyState {
  userId: string;
  answers: SurveyAnswers;
  isCompleted: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string;
  message: string;
}

function initialState(userId = ''): SurveyState {
  return {
    userId,
    answers: createInitialSurveyAnswers(),
    isCompleted: false,
    isLoading: Boolean(userId),
    isSubmitting: false,
    error: '',
    message: '',
  };
}

export default function useNextGenSurvey(activeUser: NextGenUserRecord | null, isArabic: boolean) {
  const [state, setState] = useState<SurveyState>(() => initialState());
  const activeUserId = activeUser?.userId || '';
  const effectiveState = state.userId === activeUserId ? state : initialState(activeUserId);

  useEffect(() => {
    if (!activeUserId) return undefined;
    return subscribeToSurveyCompletion(
      activeUserId,
      completed => setState(previous => ({
        ...(previous.userId === activeUserId ? previous : initialState(activeUserId)),
        isCompleted: completed,
        isLoading: false,
      })),
      error => {
        console.error('Failed to load NextGen survey completion status:', error);
        setState({
          ...initialState(activeUserId),
          isLoading: false,
          error: isArabic ? 'تعذر التحقق من حالة الاستبيان.' : 'Unable to verify the survey completion status.',
        });
      },
    );
  }, [activeUserId, isArabic]);

  const surveyAnsweredCount = useMemo(
    () => countSurveyAnswers(effectiveState.answers),
    [effectiveState.answers],
  );
  const isSurveyFormComplete = surveyAnsweredCount === SURVEY_TOTAL_QUESTIONS;

  const updateState = (updater: (current: SurveyState) => SurveyState) => {
    setState(previous => updater(previous.userId === activeUserId ? previous : initialState(activeUserId)));
  };

  const clearMessages = () => updateState(current => ({ ...current, error: '', message: '' }));
  const resetSurveySession = () => setState(initialState());

  const setBinarySurveyAnswer = (questionId: BinarySurveyQuestionId, answer: 'A' | 'B') => {
    if (effectiveState.isCompleted) return;
    updateState(current => ({ ...current, answers: { ...current.answers, [questionId]: answer }, error: '', message: '' }));
  };

  const setRatingSurveyAnswer = (questionId: RatingSurveyQuestionId, answer: 1 | 2 | 3 | 4 | 5) => {
    if (effectiveState.isCompleted) return;
    updateState(current => ({ ...current, answers: { ...current.answers, [questionId]: answer }, error: '', message: '' }));
  };

  const handleSurveySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeUser || effectiveState.isSubmitting || effectiveState.isCompleted) return;
    clearMessages();
    if (!isSurveyFormComplete) {
      updateState(current => ({
        ...current,
        error: isArabic
          ? `يجب الإجابة عن جميع الأسئلة. تمت الإجابة عن ${surveyAnsweredCount} من ${SURVEY_TOTAL_QUESTIONS}.`
          : `All questions are required. You answered ${surveyAnsweredCount} of ${SURVEY_TOTAL_QUESTIONS}.`,
      }));
      return;
    }

    const userId = normalizeUserId(activeUser.userId);
    if (!NEXTGEN_ID_PATTERN.test(userId)) return;
    updateState(current => ({ ...current, isSubmitting: true }));
    try {
      const now = Date.now();
      const nowISO = new Date(now).toISOString();
      const answers = effectiveState.answers;
      const binaryAnswerDetails = Object.fromEntries(BINARY_SURVEY_QUESTIONS.map(question => {
        const selectedAnswer = answers[question.id] as 'A' | 'B';
        return [question.id, {
          questionEnglish: question.questionEn,
          questionArabic: question.questionAr,
          answer: selectedAnswer,
          selectedOptionEnglish: selectedAnswer === 'A' ? question.optionAEn : question.optionBEn,
          selectedOptionArabic: selectedAnswer === 'A' ? question.optionAAr : question.optionBAr,
        }];
      }));
      const ratingAnswerDetails = Object.fromEntries(RATING_SURVEY_QUESTIONS.map(question => [question.id, {
        questionEnglish: question.questionEn,
        questionArabic: question.questionAr,
        rating: answers[question.id],
        minimumRating: 1,
        maximumRating: 5,
      }]));
      const payload = {
        surveyId: NEXTGEN_SURVEY_ID,
        surveyVersion: 1,
        surveyTitle: 'NextGen Q&A Session Feedback — First Two Sessions',
        identifier: userId,
        participantName: activeUser.fullName,
        participantEmail: activeUser.email,
        interfaceLanguageUsed: isArabic ? 'Arabic' : 'English',
        completionStatus: 'completed',
        allQuestionsRequired: true,
        totalQuestions: SURVEY_TOTAL_QUESTIONS,
        answeredQuestions: SURVEY_TOTAL_QUESTIONS,
        answers,
        answerDetails: { binaryQuestions: binaryAnswerDetails, pastorQualityRatings: ratingAnswerDetails },
        completedAt: now,
        completedAtISO: nowISO,
        completedAtEasternTime: getEasternTime(now),
        source: 'nextGenActivities',
      };

      const saved = await saveSurveyResponse(userId, payload, now, nowISO);
      updateState(current => ({
        ...current,
        isCompleted: true,
        error: saved ? '' : (isArabic ? 'هذا المعرّف أكمل الاستبيان بالفعل، ولا يمكن إرساله مرة أخرى.' : 'This identifier has already completed the survey and cannot submit it again.'),
        message: saved ? (isArabic ? 'تم إرسال الاستبيان بنجاح. شكراً لمشاركتك.' : 'Survey submitted successfully. Thank you for your feedback.') : '',
      }));
    } catch (error) {
      console.error('Failed to submit NextGen survey:', error);
      updateState(current => ({ ...current, error: isArabic ? 'تعذر إرسال الاستبيان. حاول مرة أخرى.' : 'Unable to submit the survey. Try again.' }));
    } finally {
      updateState(current => ({ ...current, isSubmitting: false }));
    }
  };

  return {
    surveyAnswers: effectiveState.answers,
    isSurveyCompleted: effectiveState.isCompleted,
    isLoadingSurveyStatus: effectiveState.isLoading,
    isSubmittingSurvey: effectiveState.isSubmitting,
    surveyError: effectiveState.error,
    surveyMessage: effectiveState.message,
    surveyAnsweredCount,
    isSurveyFormComplete,
    clearMessages,
    resetSurveySession,
    setBinarySurveyAnswer,
    setRatingSurveyAnswer,
    handleSurveySubmit,
  };
}

export type UseNextGenSurveyResult = ReturnType<typeof useNextGenSurvey>;
