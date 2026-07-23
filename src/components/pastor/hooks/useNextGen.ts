import {
  useEffect,
  useState,
} from 'react';

import {
  createEmptyNextGenSurveyResults,
  getNextGenRegistrationsByStatus,
  subscribeToNextGenQuestions,
  subscribeToNextGenRegistrations,
  subscribeToNextGenSurveyResults,
  updateNextGenQuestionSelection,
  updateNextGenRegistrationStatus,
} from '../nextgen';

import type {
  NextGenQuestion,
  NextGenRegistration,
  NextGenRegistrationStatusFilter,
  NextGenSurveyAggregateResults,
} from '../nextgen';

type DisplayLocale = 'en' | 'ar';

export interface UseNextGenParams {
  locale: DisplayLocale;
}

export default function useNextGen({
  locale,
}: UseNextGenParams) {
  const [
    nextGenQuestions,
    setNextGenQuestions,
  ] = useState<NextGenQuestion[]>([]);

  const [
    showNextGenQuestions,
    setShowNextGenQuestions,
  ] = useState(false);

  const [
    showNextGenSurveyResults,
    setShowNextGenSurveyResults,
  ] = useState(false);

  const [
    nextGenSurveyResults,
    setNextGenSurveyResults,
  ] = useState<NextGenSurveyAggregateResults>(
    () => createEmptyNextGenSurveyResults(),
  );

  const [
    nextGenSurveyResultsLoading,
    setNextGenSurveyResultsLoading,
  ] = useState(true);

  const [
    nextGenSurveyResultsError,
    setNextGenSurveyResultsError,
  ] = useState('');

  const [
    nextGenRegistrations,
    setNextGenRegistrations,
  ] = useState<NextGenRegistration[]>([]);

  const [
    showNextGenRegistrations,
    setShowNextGenRegistrations,
  ] = useState(false);

  const [
    nextGenRegistrationSearchTerm,
    setNextGenRegistrationSearchTerm,
  ] = useState('');

  const [
    nextGenRegistrationStatusFilter,
    setNextGenRegistrationStatusFilter,
  ] = useState<NextGenRegistrationStatusFilter>(
    'all',
  );

  const [
    nextGenRegistrationUpdatingId,
    setNextGenRegistrationUpdatingId,
  ] = useState<string | null>(null);

  const [
    nextGenSelectionLoadingId,
    setNextGenSelectionLoadingId,
  ] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToNextGenQuestions(
        setNextGenQuestions,
      ),
    [],
  );

  useEffect(() => {
    setNextGenSurveyResultsLoading(true);
    setNextGenSurveyResultsError('');

    return subscribeToNextGenSurveyResults(
      results => {
        setNextGenSurveyResults(results);
        setNextGenSurveyResultsLoading(false);
      },
      error => {
        console.error(
          'Failed to load NextGen survey results:',
          error,
        );

        setNextGenSurveyResults(
          createEmptyNextGenSurveyResults(),
        );

        setNextGenSurveyResultsError(
          locale === 'ar'
            ? 'تعذر تحميل نتائج الاستبيان.'
            : 'Unable to load the survey results.',
        );

        setNextGenSurveyResultsLoading(false);
      },
    );
  }, [locale]);

  useEffect(
    () =>
      subscribeToNextGenRegistrations(
        setNextGenRegistrations,
      ),
    [],
  );

  const handleRegistrationStatus = async (
    registration: NextGenRegistration,
    nextStatus: 'approved' | 'rejected',
  ) => {
    if (nextGenRegistrationUpdatingId) {
      return;
    }

    setNextGenRegistrationUpdatingId(
      registration.userId,
    );

    try {
      await updateNextGenRegistrationStatus({
        registration,
        nextStatus,
      });
    } catch (error) {
      console.error(
        'Failed to update NextGen registration status:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل تحديث حالة تسجيل NextGen.'
          : 'Failed to update the NextGen registration status.',
      );
    } finally {
      setNextGenRegistrationUpdatingId(null);
    }
  };

  const handleQuestionSelection = async (
    question: NextGenQuestion,
    selected: boolean,
  ) => {
    setNextGenSelectionLoadingId(
      question.id,
    );

    try {
      await updateNextGenQuestionSelection({
        question,
        selected,
      });
    } catch (error) {
      console.error(
        'Failed to update NextGen question selection:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'فشل تحديث اختيار السؤال.'
          : 'Failed to update the question selection.',
      );
    } finally {
      setNextGenSelectionLoadingId(null);
    }
  };

  const pendingNextGenRegistrationCount =
    getNextGenRegistrationsByStatus(
      nextGenRegistrations,
      'pending',
    ).length;

  return {
    nextGenQuestions,
    showNextGenQuestions,
    setShowNextGenQuestions,

    nextGenSurveyResults,
    showNextGenSurveyResults,
    setShowNextGenSurveyResults,
    nextGenSurveyResultsLoading,
    nextGenSurveyResultsError,

    nextGenRegistrations,
    showNextGenRegistrations,
    setShowNextGenRegistrations,
    nextGenRegistrationSearchTerm,
    setNextGenRegistrationSearchTerm,
    nextGenRegistrationStatusFilter,
    setNextGenRegistrationStatusFilter,
    nextGenRegistrationUpdatingId,

    nextGenSelectionLoadingId,

    pendingNextGenRegistrationCount,

    handleRegistrationStatus,
    handleQuestionSelection,
  };
}

export type UseNextGenResult =
  ReturnType<typeof useNextGen>;
