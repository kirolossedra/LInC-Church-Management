import { motion } from 'motion/react';
import { ClipboardList } from 'lucide-react';
import PageTitle from '../PageTitle';
import type { AssessmentController } from './useAssessmentForm';
import { FORMS, cardDescription, cardTitle, pageSubtitle, pageTitle } from './assessment.forms';

export default function AssessmentSelector({ controller }: { controller: AssessmentController }) {
  const { t, dir, langCode, isArabicUI, visibleForms, formAvailabilityById, directSignupName, setDirectSignupName, directSignupEmail, setDirectSignupEmail, directSignupLoading, directSignupError, directSignupMessage, selectForm, handleDirectSignup } = controller;
const firstForm = visibleForms[0] || FORMS[0];

    return (
      <div className="assessment-ui mx-auto max-w-[1120px] py-2 md:py-6" dir={dir}>
        <PageTitle title={firstForm ? pageTitle(firstForm, t, langCode) : t('assessment.title')} subtitle={firstForm ? pageSubtitle(firstForm, t, langCode) : t('assessment.program')} icon={<ClipboardList size={22} />} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-[rgba(139,30,30,0.1)] bg-[#fffdf9]/90 p-[clamp(20px,4vw,38px)] shadow-[0_24px_70px_rgba(80,24,24,0.09)] backdrop-blur-xl"
        >
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="m-0 text-[#8b1e1e] text-[clamp(1.35rem,4vw,1.9rem)] font-bold">
              {isArabicUI ? 'اختر نموذج التقييم' : 'Choose Assessment Form'}
            </h2>
            <p className="mt-3 mb-0 text-[#666] text-[1rem] leading-relaxed">
              {isArabicUI ? 'اختر نموذج التقييم الذي تريد تعبئته.' : 'Choose the assessment form you want to complete.'}
            </p>
          </div>

          <form onSubmit={handleDirectSignup} className="mb-8 bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
              <div>
                <h3 className="m-0 text-[#8b1e1e] text-[1.28rem] font-bold">
                  {isArabicUI ? 'التسجيل بدون تعبئة نموذج' : 'Sign up without filling a form'}
                </h3>
                <p className="m-0 mt-2 text-[#666] text-sm leading-relaxed">
                  {isArabicUI
                    ? 'أرسل الاسم والبريد الإلكتروني فقط. سيتم حفظه في نفس مسار ردود النماذج حتى تستخدمه باقي الخدمات، وسيظهر أيضاً في صفحة ربط المستخدمين.'
                    : 'Submit only name and email. An authorized administrator can link the response from the Administrator panel.'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center shrink-0 shadow-[0_8px_18px_rgba(139,30,30,0.22)]" style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}>
                <ClipboardList size={22} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-[7px] text-[#333]">
                  {isArabicUI ? 'الاسم الكامل' : 'Full Name'} <span className="text-[#8b1e1e]">*</span>
                </label>
                <input
                  type="text"
                  value={directSignupName}
                  onChange={event => setDirectSignupName(event.target.value)}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                />
              </div>
              <div>
                <label className="block font-bold mb-[7px] text-[#333]">
                  {isArabicUI ? 'البريد الإلكتروني' : 'Email'} <span className="text-[#8b1e1e]">*</span>
                </label>
                <input
                  type="email"
                  value={directSignupEmail}
                  onChange={event => setDirectSignupEmail(event.target.value)}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                />
              </div>
            </div>

            {directSignupError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold mt-4">{directSignupError}</div>}
            {directSignupMessage && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-[14px] font-bold mt-4">{directSignupMessage}</div>}

            <button
              type="submit"
              disabled={directSignupLoading}
              className="w-full min-h-[52px] mt-5 border-none bg-[#8b1e1e] text-white py-3 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.02rem] disabled:cursor-not-allowed disabled:opacity-70 disabled:translate-y-0"
            >
              {directSignupLoading ? (isArabicUI ? 'جارٍ الإرسال...' : 'Submitting...') : (isArabicUI ? 'إرسال التسجيل' : 'Submit Sign-Up')}
            </button>
          </form>

          <div className="mb-4">
            <h3 className="m-0 text-[#641414] text-[1.1rem] font-bold">
              {isArabicUI ? 'نماذج التقييم' : 'Assessment Forms'}
            </h3>
            <p className="m-0 mt-1 text-[#666] text-sm">
              {isArabicUI ? 'هذه هي النماذج الكاملة فقط.' : 'These are the full forms only.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            {visibleForms.map((item, index) => {
              const availability = formAvailabilityById[item.id] || 'active';
              const isDisabled = availability === 'disabled';

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectForm(item.id)}
                  aria-disabled={isDisabled}
                  className={`group relative text-start min-h-[190px] border-2 rounded-[22px] p-[22px] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed bg-stone-100 border-stone-200 opacity-65 grayscale'
                      : 'cursor-pointer bg-[#fffafa] border-[rgba(139,30,30,0.16)] hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]'
                  }`}
                >
                  <div
                    className={`absolute top-4 w-9 h-9 rounded-full text-white grid place-items-center text-[1rem] font-bold ${
                      isDisabled
                        ? 'bg-stone-400 shadow-none'
                        : 'bg-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.24)]'
                    }`}
                    style={dir === 'rtl' ? { right: '16px' } : { left: '16px' }}
                  >
                    {index + 1}
                  </div>

                  {isDisabled && (
                    <span
                      className="absolute top-4 rounded-full bg-stone-200 px-3 py-1 text-[11px] font-bold text-stone-600"
                      style={dir === 'rtl' ? { left: '16px' } : { right: '16px' }}
                    >
                      {isArabicUI ? 'غير متاح حالياً' : 'Currently unavailable'}
                    </span>
                  )}

                  <div
                    className={`w-12 h-12 rounded-[16px] text-white grid place-items-center mb-5 ${
                      isDisabled
                        ? 'bg-stone-400 shadow-none'
                        : 'bg-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]'
                    }`}
                    style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}
                  >
                    <ClipboardList size={22} />
                  </div>

                  <div
                    className={`text-[1.28rem] font-bold mb-3 ${
                      isDisabled ? 'text-stone-500' : 'text-[#8b1e1e]'
                    }`}
                  >
                    {cardTitle(item, t, langCode)}
                  </div>

                  <p
                    className={`m-0 text-sm leading-relaxed ${
                      isDisabled ? 'text-stone-500' : 'text-[#666]'
                    }`}
                  >
                    {cardDescription(item, t, langCode)}
                  </p>
                </button>
              );
            })}

          </div>
        </motion.div>
      </div>
    );
}
