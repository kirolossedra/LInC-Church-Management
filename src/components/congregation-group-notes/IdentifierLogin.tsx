import { CheckCircle, KeyRound, LockKeyhole, Mail, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function IdentifierLogin({ controller }: { controller: CongregationGroupNotesController }) {
  const {
    isAr, emailInput, setEmailInput, passwordInput, setPasswordInput,
    loginStatus, loginMessage, handleLogin,
  } = controller;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7"
    >
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#7a1717] text-white">
          <LockKeyhole size={25} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#7a1717]">
            {isAr ? 'تسجيل الدخول إلى ملاحظات الأشخاص' : 'People Notes Login'}
          </h2>
          <p className="mt-1 text-[#6b4b4b]">
            {isAr
              ? 'استخدم بريدك الإلكتروني في Firebase، والرمز الشخصي ككلمة المرور الأولية.'
              : 'Use your Firebase email and your personal identifier as the initial password.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#7a1717]/70">
            <Mail size={16} />
            {isAr ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <input
            required
            type="email"
            autoComplete="email"
            value={emailInput}
            onChange={event => setEmailInput(event.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-2xl border-2 border-[#ead9d0] bg-white px-4 py-4 text-lg font-black text-[#2b1717] outline-none placeholder:text-[#9b7b7b] focus:border-[#7a1717] focus:ring-2 focus:ring-[#7a1717]/20"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#7a1717]/70">
            <KeyRound size={16} />
            {isAr ? 'كلمة المرور' : 'Password'}
          </label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={passwordInput}
            onChange={event => setPasswordInput(event.target.value)}
            placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter your password'}
            className="w-full rounded-2xl border-2 border-[#ead9d0] bg-white px-4 py-4 text-lg font-black text-[#2b1717] outline-none placeholder:text-[#9b7b7b] focus:border-[#7a1717] focus:ring-2 focus:ring-[#7a1717]/20"
          />
        </div>

        {loginMessage && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{loginMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loginStatus === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-5 py-4 text-lg font-black text-white shadow-lg shadow-[#7a1717]/10 transition-all hover:bg-[#5e1010] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginStatus === 'loading' ? (
            <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />{isAr ? 'جارٍ التحقق...' : 'Signing in...'}</>
          ) : (
            <><CheckCircle size={20} />{isAr ? 'دخول' : 'Access People Notes'}</>
          )}
        </button>
      </form>
    </motion.section>
  );
}
