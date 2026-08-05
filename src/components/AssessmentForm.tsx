import { ClipboardList } from 'lucide-react';
import PageTitle from './PageTitle';
import AssessmentQuestionnaire from './assessment/AssessmentQuestionnaire';
import AssessmentResults from './assessment/AssessmentResults';
import AssessmentSelector from './assessment/AssessmentSelector';
import useAssessmentForm from './assessment/useAssessmentForm';
import { pageSubtitle, pageTitle } from './assessment/assessment.forms';

export default function AssessmentForm() {
  const controller = useAssessmentForm();
  const {
    t,
    dir,
    langCode,
    isArabicUI,
    selectedForm,
    submitted,
    result,
    loading,
    error,
    handleBackToAssessmentChoices,
    handleSubmit,
  } = controller;

  if (!selectedForm) return <AssessmentSelector controller={controller} />;
  if (submitted && result) return <AssessmentResults controller={controller} />;

  return (
    <div className="assessment-ui mx-auto max-w-[1120px] py-2 md:py-6" dir={dir}>
      <PageTitle
        title={pageTitle(selectedForm, t, langCode)}
        subtitle={pageSubtitle(selectedForm, t, langCode)}
        icon={<ClipboardList size={22} />}
      />

      <button
        type="button"
        onClick={handleBackToAssessmentChoices}
        className="mb-[18px] min-h-[46px] cursor-pointer rounded-2xl border border-[rgba(139,30,30,0.16)] bg-[#fffdf9] px-5 py-3 font-bold text-[#8b1e1e] shadow-[0_10px_26px_rgba(80,24,24,0.07)] transition-all hover:-translate-y-[1px] hover:bg-white"
      >
        {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">{error}</div>}

        <AssessmentQuestionnaire controller={controller} />

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0"
        >
          {loading ? t('assessment.submitting') : t('assessment.submit')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">
          {t(selectedForm.page?.confidentialKey || 'assessment.confidential')}
        </p>
      </form>
    </div>
  );
}
