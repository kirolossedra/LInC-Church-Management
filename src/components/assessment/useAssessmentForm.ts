import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useI18n } from '../../i18n';
import {
  getAssessmentFormStates,
  submitAssessment,
  submitDirectAssessmentSignup,
} from '../../services/assessment';
import type { AssessmentFormId } from '../../services/assessment';
import { buildResult } from './assessment.calculations';
import { FORMS, initialAnswers, isUsableEmail, validate } from './assessment.forms';
import type { AnswerValue, Answers, AssessmentFormAvailability, Lang } from './assessment.types';

const EMPTY_ANSWERS: Answers = {};

export default function useAssessmentForm() {
  const { t, dir } = useI18n();
  const langCode: Lang = dir === 'rtl' ? 'ar' : 'en';
  const isArabicUI = dir === 'rtl';

  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formAvailabilityById, setFormAvailabilityById] = useState<
    Record<string, AssessmentFormAvailability>
  >({});
  const selectedFormCandidate = FORMS.find(item => item.id === selectedFormId) || null;
  const selectedForm = selectedFormCandidate
    && (formAvailabilityById[selectedFormCandidate.id] || 'active') === 'active'
    ? selectedFormCandidate
    : null;
  const visibleForms = FORMS.filter(
    item => (formAvailabilityById[item.id] || 'active') !== 'hidden',
  );
  const [answersByForm, setAnswersByForm] = useState<Record<string, Answers>>(() =>
    Object.fromEntries(FORMS.map(item => [item.id, initialAnswers(item)])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directSignupName, setDirectSignupName] = useState('');
  const [directSignupEmail, setDirectSignupEmail] = useState('');
  const [directSignupLoading, setDirectSignupLoading] = useState(false);
  const [directSignupError, setDirectSignupError] = useState<string | null>(null);
  const [directSignupMessage, setDirectSignupMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getAssessmentFormStates(controller.signal)
      .then(({ forms }) => setFormAvailabilityById(forms))
      .catch(listenerError => {
        if (controller.signal.aborted) return;
        console.error('Unable to load assessment-form visibility controls:', listenerError);
        setFormAvailabilityById({});
      });
    return () => controller.abort();
  }, []);

  const answers = selectedForm ? answersByForm[selectedForm.id] || EMPTY_ANSWERS : EMPTY_ANSWERS;
  const result = useMemo(
    () => selectedForm ? buildResult(selectedForm, answers, t, langCode) : null,
    [selectedForm, answers, t, langCode],
  );

  const setAnswer = (fieldId: string, value: AnswerValue) => {
    if (!selectedForm) return;
    setAnswersByForm(previous => ({
      ...previous,
      [selectedForm.id]: {
        ...(previous[selectedForm.id] || {}),
        [fieldId]: value,
      },
    }));
  };

  const selectForm = (formId: string) => {
    const availability = formAvailabilityById[formId] || 'active';
    if (availability !== 'active') return;

    setSelectedFormId(formId);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForRetake = () => {
    if (!selectedForm) return;
    setAnswersByForm(previous => ({ ...previous, [selectedForm.id]: initialAnswers(selectedForm) }));
    setSubmitted(false);
    setError(null);
  };

  const handleBackToAssessmentChoices = () => {
    setSelectedFormId(null);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDirectSignup = async (event: FormEvent) => {
    event.preventDefault();

    const fullName = directSignupName.trim();
    const email = directSignupEmail.trim();

    setDirectSignupError(null);
    setDirectSignupMessage(null);

    if (!fullName) {
      setDirectSignupError(isArabicUI ? 'أدخل الاسم الكامل أولاً.' : 'Enter the full name first.');
      return;
    }

    if (!isUsableEmail(email)) {
      setDirectSignupError(isArabicUI ? 'أدخل بريد إلكتروني صالح.' : 'Enter a valid email address.');
      return;
    }

    setDirectSignupLoading(true);

    try {
      await submitDirectAssessmentSignup({
        fullName,
        email,
        locale: langCode,
      });

      setDirectSignupName('');
      setDirectSignupEmail('');
      setDirectSignupMessage(
        isArabicUI
          ? 'تم إرسال التسجيل بنجاح.'
          : 'Sign-up submitted successfully.',
      );
    } catch (err) {
      console.error(err);
      setDirectSignupError(isArabicUI ? 'تعذر إرسال طلب التسجيل.' : 'Unable to submit the sign-up request.');
    } finally {
      setDirectSignupLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedForm || !result) return;

    setError(null);

    if (!validate(selectedForm, answers)) {
      setError(t(selectedForm.validation?.errorKey || 'assessment.completeFields'));
      return;
    }

    setLoading(true);

    try {
      await submitAssessment({
        formId: selectedForm.id as AssessmentFormId,
        locale: langCode,
        answers,
      });

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit the assessment form.',
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    dir,
    langCode,
    isArabicUI,
    selectedForm,
    visibleForms,
    formAvailabilityById,
    answers,
    submitted,
    loading,
    error,
    directSignupName,
    setDirectSignupName,
    directSignupEmail,
    setDirectSignupEmail,
    directSignupLoading,
    directSignupError,
    directSignupMessage,
    result,
    setAnswer,
    selectForm,
    resetForRetake,
    handleBackToAssessmentChoices,
    handleDirectSignup,
    handleSubmit,
  };
}

export type AssessmentController = ReturnType<typeof useAssessmentForm>;
