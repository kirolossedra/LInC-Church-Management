import { motion } from 'motion/react';
import { CheckCircle2, ClipboardList, Loader2, Send, X } from 'lucide-react';
import { BINARY_SURVEY_QUESTIONS, RATING_SURVEY_QUESTIONS, SURVEY_TOTAL_QUESTIONS } from './nextGenActivities.constants';
import type { NextGenUserRecord } from './nextGenActivities.types';
import type { UseNextGenSurveyResult } from './useNextGenSurvey';

interface NextGenSurveyPanelProps {
  user: NextGenUserRecord;
  controller: UseNextGenSurveyResult;
  isArabic: boolean;
  onClose: () => void;
}

export default function NextGenSurveyPanel({ user, controller, isArabic, onClose }: NextGenSurveyPanelProps) {
  const {
    surveyAnswers,
    isSurveyCompleted,
    isLoadingSurveyStatus,
    isSubmittingSurvey,
    surveyError,
    surveyMessage,
    surveyAnsweredCount,
    setBinarySurveyAnswer,
    setRatingSurveyAnswer,
    handleSurveySubmit,
  } = controller;

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
        <div className="flex items-center gap-3"><ClipboardList size={24} /><div><h2 className="text-2xl font-bold">{isArabic ? 'استبيان تقييم جلسات NextGen' : 'NextGen Q&A Session Feedback Survey'}</h2><p className="text-white/75 text-sm mt-1">{isArabic ? 'تقييم أول جلستين. جميع الأسئلة مطلوبة، ويسمح بإرسال واحد فقط لكل معرّف.' : 'Feedback on the first two sessions. All questions are required, and each identifier may submit only once.'}</p></div></div>
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X size={22} /></button>
      </div>
      <div className="p-6 md:p-8">
        {isLoadingSurveyStatus ? (
          <div className="flex items-center gap-2 text-gray-500 bg-stone-50 border border-gray-100 rounded-2xl p-5"><Loader2 size={18} className="animate-spin" />{isArabic ? 'جار التحقق من حالة الاستبيان...' : 'Checking survey completion status...'}</div>
        ) : isSurveyCompleted ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-[26px] p-10"><div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-green-700 text-white mb-5"><CheckCircle2 size={30} /></div><h3 className="text-2xl font-bold text-green-900 mb-2">{isArabic ? 'تم إكمال الاستبيان' : 'Survey Completed'}</h3><p className="text-green-800 max-w-2xl mx-auto">{isArabic ? `أكمل المعرّف ${user.userId} هذا الاستبيان بالفعل. لا يمكن إرسال إجابة ثانية.` : `Identifier ${user.userId} has already completed this survey. A second response cannot be submitted.`}</p>{surveyMessage && <div className="mt-5 rounded-xl border border-green-200 bg-white px-5 py-4 text-green-800 font-bold">{surveyMessage}</div>}</div>
        ) : (
          <form onSubmit={handleSurveySubmit} className="space-y-7">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="font-bold">{isArabic ? 'استبيان إلزامي بالكامل' : 'Completion-Based Survey'}</h3><p className="text-sm mt-1 leading-relaxed">{isArabic ? 'يجب الإجابة عن كل سؤال قبل الإرسال. يتم حفظ الإكمال على معرّفك لمنع تعبئة الاستبيان مرتين.' : 'Every question must be answered before submission. Completion is stored against your identifier to prevent duplicate responses.'}</p></div><span className="shrink-0 px-4 py-2 rounded-full bg-white border border-amber-200 text-sm font-bold">{surveyAnsweredCount}/{SURVEY_TOTAL_QUESTIONS}</span></div></div>
            <div className="space-y-5">
              {BINARY_SURVEY_QUESTIONS.map((question, index) => {
                const selectedAnswer = surveyAnswers[question.id];
                return (
                  <div key={question.id} className="rounded-[24px] border border-gray-100 bg-stone-50 p-5 md:p-6">
                    <div className="flex items-start gap-3 mb-4"><span className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-[#8b1e1e] text-white text-sm font-bold">{index + 1}</span><div><h3 className="font-bold text-[#3f0f0f] text-lg leading-relaxed">{isArabic ? question.questionAr : question.questionEn}<span className="text-[#8b1e1e]"> *</span></h3>{(question.noteEn || question.noteAr) && <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{isArabic ? question.noteAr : question.noteEn}</p>}</div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(['A', 'B'] as const).map(answer => { const isSelected = selectedAnswer === answer; const label = answer === 'A' ? (isArabic ? question.optionAAr : question.optionAEn) : (isArabic ? question.optionBAr : question.optionBEn); return <button key={answer} type="button" onClick={() => setBinarySurveyAnswer(question.id, answer)} className={`text-start min-h-[76px] px-5 py-4 rounded-2xl border-2 font-bold transition-all ${isSelected ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_8px_20px_rgba(139,30,30,0.18)]' : 'bg-white border-gray-200 text-[#641414] hover:border-[#8b1e1e] hover:bg-[#fffafa]'}`}><span className={`inline-grid place-items-center w-7 h-7 rounded-full me-2 text-sm ${isSelected ? 'bg-white/20' : 'bg-[#f8eeee]'}`}>{answer}</span>{label}</button>; })}</div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-[24px] border border-[rgba(139,30,30,0.12)] bg-[#fffafa] p-5 md:p-6">
              <h3 className="text-xl font-bold text-[#8b1e1e] mb-2">{isArabic ? 'تقييم جودة القس إبراهيم' : "Pastor Ibrahim's Session Quality"}</h3><p className="text-sm text-gray-600 mb-5">{isArabic ? 'قيّم كل بند من 1 (ضعيف جداً) إلى 5 (ممتاز).' : 'Rate each item from 1 (Very poor) to 5 (Excellent).'}</p>
              <div className="space-y-5">{RATING_SURVEY_QUESTIONS.map((question, index) => <div key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5"><div className="flex items-start gap-3 mb-4"><span className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-[#8b1e1e] text-white text-sm font-bold">{BINARY_SURVEY_QUESTIONS.length + index + 1}</span><h4 className="font-bold text-[#3f0f0f] text-lg leading-relaxed">{isArabic ? question.questionAr : question.questionEn}<span className="text-[#8b1e1e]"> *</span></h4></div><div className="grid grid-cols-5 gap-2 sm:gap-3">{([1, 2, 3, 4, 5] as const).map(rating => { const selected = surveyAnswers[question.id] === rating; return <button key={rating} type="button" onClick={() => setRatingSurveyAnswer(question.id, rating)} className={`min-h-[52px] rounded-xl border-2 font-black text-lg transition-all ${selected ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_6px_16px_rgba(139,30,30,0.18)]' : 'bg-stone-50 border-gray-200 text-[#641414] hover:border-[#8b1e1e] hover:bg-[#fffafa]'}`}>{rating}</button>; })}</div><div className="flex justify-between mt-2 text-xs text-gray-500 font-bold"><span>{isArabic ? 'ضعيف جداً' : 'Very poor'}</span><span>{isArabic ? 'ممتاز' : 'Excellent'}</span></div></div>)}</div>
            </div>
            {surveyError && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-bold">{surveyError}</div>}
            {surveyMessage && <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 font-bold">{surveyMessage}</div>}
            <button type="submit" disabled={isSubmittingSurvey} className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">{isSubmittingSurvey ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}{isSubmittingSurvey ? (isArabic ? 'جار إرسال الاستبيان...' : 'Submitting Survey...') : (isArabic ? 'إرسال الاستبيان المكتمل' : 'Submit Completed Survey')}</button>
          </form>
        )}
      </div>
    </motion.section>
  );
}
