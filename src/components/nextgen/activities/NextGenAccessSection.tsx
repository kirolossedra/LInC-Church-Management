import { motion } from 'motion/react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  IdCard,
  Loader2,
  LockKeyhole,
  MapPinned,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import MontrealMissionTripMap from '../MontrealMissionTripMap';
import type { UseNextGenIdentityResult } from './useNextGenIdentity';
import { normalizeUserId } from './nextGenActivities.utils';

interface NextGenAccessSectionProps {
  controller: UseNextGenIdentityResult;
  isArabic: boolean;
}

export default function NextGenAccessSection({ controller, isArabic }: NextGenAccessSectionProps) {
  const {
    entryMode,
    signupForm,
    setSignupForm,
    existingUserId,
    setExistingUserId,
    registrationReceipt,
    isSubmittingSignup,
    isVerifyingUser,
    isDownloadingCertificate,
    accessError,
    accessMessage,
    chooseEntryMode,
    closeEntryMode,
    handleSignupSubmit,
    handleCertificateDownload,
    handleExistingUserSubmit,
  } = controller;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <motion.button type="button" onClick={() => chooseEntryMode('signup')} whileTap={{ scale: 0.98 }} className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${entryMode === 'signup' ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]' : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${entryMode === 'signup' ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}><UserPlus size={26} /></div>
              <div>
                <h2 className="text-2xl font-bold">{isArabic ? 'ابدأ كمستخدم NextGen' : 'Get Started as a NextGen User'}</h2>
                <p className={`text-sm mt-1 ${entryMode === 'signup' ? 'text-white/80' : 'text-[#777]'}`}>{isArabic ? 'أرسل طلباً بمعرّف من 4 أحرف أو أرقام.' : 'Submit a request with a 4-character ID.'}</p>
              </div>
            </div>
            <ChevronDown size={22} className={`transition-transform ${entryMode === 'signup' ? 'rotate-180' : ''}`} />
          </div>
        </motion.button>

        <motion.button type="button" onClick={() => chooseEntryMode('existing')} whileTap={{ scale: 0.98 }} className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${entryMode === 'existing' ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]' : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${entryMode === 'existing' ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}><LockKeyhole size={26} /></div>
              <div>
                <h2 className="text-2xl font-bold">{isArabic ? 'شارك كمستخدم حالي' : 'Participate as an Existing User'}</h2>
                <p className={`text-sm mt-1 ${entryMode === 'existing' ? 'text-white/80' : 'text-[#777]'}`}>{isArabic ? 'يتطلب معرّفاً موجوداً وتمت الموافقة عليه.' : 'Requires an existing approved ID.'}</p>
              </div>
            </div>
            <ChevronDown size={22} className={`transition-transform ${entryMode === 'existing' ? 'rotate-180' : ''}`} />
          </div>
        </motion.button>

        <motion.button type="button" onClick={() => chooseEntryMode('mission-map')} whileTap={{ scale: 0.98 }} className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${entryMode === 'mission-map' ? 'bg-[#3f0f0f] border-[#3f0f0f] text-white shadow-[0_14px_34px_rgba(63,15,15,0.24)]' : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${entryMode === 'mission-map' ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}><MapPinned size={26} /></div>
              <div>
                <h2 className="text-2xl font-bold">{isArabic ? 'خريطة رحلة مونتريال' : 'Montréal Mission Trip Map'}</h2>
                <p className={`text-sm mt-1 ${entryMode === 'mission-map' ? 'text-white/80' : 'text-[#777]'}`}>{isArabic ? 'دخول Firebase مخصص للمواقع والمسارات.' : 'Dedicated Firebase login for trip locations and routes.'}</p>
              </div>
            </div>
            <ChevronDown size={22} className={`transition-transform ${entryMode === 'mission-map' ? 'rotate-180' : ''}`} />
          </div>
        </motion.button>
      </div>

      {(accessError || accessMessage) && (
        <div className="max-w-3xl mx-auto mt-6">
          {accessError && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-bold">{accessError}</div>}
          {accessMessage && <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 font-bold">{accessMessage}</div>}
        </div>
      )}

      {entryMode === 'mission-map' && <MontrealMissionTripMap onClose={closeEntryMode} />}

      {entryMode === 'signup' && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
            <div className="flex items-center gap-3"><UserPlus size={24} /><div><h2 className="text-2xl font-bold">{isArabic ? 'طلب مستخدم NextGen' : 'NextGen User Request'}</h2><p className="text-white/75 text-sm mt-1">{isArabic ? 'كل طلب جديد يبدأ بحالة انتظار الموافقة.' : 'Every new request begins with pending approval status.'}</p></div></div>
            <button type="button" onClick={closeEntryMode} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X size={22} /></button>
          </div>
          <form onSubmit={handleSignupSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isArabic ? 'الاسم الكامل' : 'Full Name'}</label><input type="text" value={signupForm.fullName} onChange={event => setSignupForm(previous => ({ ...previous, fullName: event.target.value }))} className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424]" required /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label><input type="email" value={signupForm.email} onChange={event => setSignupForm(previous => ({ ...previous, email: event.target.value }))} className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424]" required /></div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isArabic ? 'معرّف NextGen' : 'NextGen ID'}</label>
              <div className="relative"><IdCard size={20} className={`absolute top-1/2 -translate-y-1/2 text-[#8b1e1e] ${isArabic ? 'right-4' : 'left-4'}`} /><input type="text" inputMode="text" maxLength={4} value={signupForm.userId} onChange={event => setSignupForm(previous => ({ ...previous, userId: normalizeUserId(event.target.value) }))} placeholder="A7B2" className={`w-full py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424] font-black tracking-[0.35em] uppercase ${isArabic ? 'pr-12 pl-5' : 'pl-12 pr-5'}`} required /></div>
              <p className="text-sm text-gray-500">{isArabic ? '4 أحرف أو أرقام بالإنجليزية فقط. لا يمكن استخدام معرّف موجود.' : 'Exactly 4 English letters or numbers. An existing ID cannot be reused.'}</p>
            </div>
            <button type="submit" disabled={isSubmittingSignup} className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">{isSubmittingSignup ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}{isSubmittingSignup ? (isArabic ? 'جار إرسال الطلب...' : 'Submitting Request...') : (isArabic ? 'إرسال طلب NextGen' : 'Submit NextGen Request')}</button>
            {registrationReceipt && (
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-5 space-y-4">
                <div className="flex items-start gap-3 text-green-900"><CheckCircle2 size={24} className="shrink-0 mt-0.5" /><div><h3 className="font-bold text-lg">{isArabic ? 'تم تسجيل الطلب' : 'Request Registered'}</h3><p className="text-sm mt-1">{isArabic ? `المعرّف ${registrationReceipt.userId} محفوظ وحالته في انتظار الموافقة.` : `ID ${registrationReceipt.userId} is reserved and pending approval.`}</p></div></div>
                <button type="button" onClick={handleCertificateDownload} disabled={isDownloadingCertificate} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 rounded-xl font-bold border border-green-200 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">{isDownloadingCertificate ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{isDownloadingCertificate ? (isArabic ? 'جار إنشاء الشهادة...' : 'Creating Certificate...') : (isArabic ? 'تحميل شهادة مستخدم NextGen PDF' : 'Download NextGen User Certificate PDF')}</button>
              </div>
            )}
          </form>
        </motion.section>
      )}

      {entryMode === 'existing' && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white"><div className="flex items-center gap-3"><LockKeyhole size={24} /><div><h2 className="text-2xl font-bold">{isArabic ? 'الدخول للمشاركة' : 'Enter to Participate'}</h2><p className="text-white/75 text-sm mt-1">{isArabic ? 'سيتم التحقق من وجود المعرّف وحالة الموافقة.' : 'The ID must exist and have approved status.'}</p></div></div><button type="button" onClick={closeEntryMode} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X size={22} /></button></div>
          <form onSubmit={handleExistingUserSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isArabic ? 'معرّف NextGen المعتمد' : 'Approved NextGen ID'}</label><div className="relative"><IdCard size={20} className={`absolute top-1/2 -translate-y-1/2 text-[#8b1e1e] ${isArabic ? 'right-4' : 'left-4'}`} /><input type="text" maxLength={4} value={existingUserId} onChange={event => setExistingUserId(normalizeUserId(event.target.value))} placeholder="A7B2" className={`w-full py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424] font-black tracking-[0.35em] uppercase ${isArabic ? 'pr-12 pl-5' : 'pl-12 pr-5'}`} required /></div></div>
            <button type="submit" disabled={isVerifyingUser} className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">{isVerifyingUser ? <Loader2 size={19} className="animate-spin" /> : <CheckCircle2 size={19} />}{isVerifyingUser ? (isArabic ? 'جار التحقق...' : 'Verifying...') : (isArabic ? 'التحقق والمتابعة' : 'Verify and Continue')}</button>
          </form>
        </motion.section>
      )}
    </>
  );
}
