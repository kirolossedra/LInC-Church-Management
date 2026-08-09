import type { FormEventHandler, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import LincCrossMark from '../brand/LincCrossMark';

interface AdminLoadingScreenProps {
  message: string;
}

export function AdminLoadingScreen({ message }: AdminLoadingScreenProps) {
  return (
    <AdminAccessStage>
      <div className="relative text-center text-white">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] border border-white/10 bg-white/[0.06] text-[#f2a900] backdrop-blur-xl">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-white/40">LInC command center</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">{message}</h1>
      </div>
    </AdminAccessStage>
  );
}

interface AdminLoginScreenProps {
  email: string;
  password: string;
  showPassword: boolean;
  isSigningIn: boolean;
  loginError: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function AdminLoginScreen({
  email,
  password,
  showPassword,
  isSigningIn,
  loginError,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: AdminLoginScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AdminAccessStage>
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="text-white"
        >
          <a href="/" className="mb-14 inline-flex items-center gap-3" aria-label="LINC One home">
            <LincCrossMark size={44} className="shadow-[0_10px_28px_rgba(0,0,0,0.24)]" />
            <span className="font-serif text-2xl font-bold">LINC One</span>
          </a>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#f2a900]"><Sparkles size={14} /> Administration</p>
          <h1 className="mt-5 font-serif text-[clamp(4rem,9vw,8rem)] font-semibold leading-[0.78] tracking-[-0.07em]">
            Work with
            <span className="block ps-[0.14em] text-[#c83b34]">purpose<span className="text-[#f2a900]">.</span></span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">A focused workspace for the people entrusted with organizing LInC ministry life.</p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 30, scale: prefersReducedMotion ? 1 : 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-[2.2rem] bg-[#f7f2e9] p-6 text-[#251817] shadow-[0_35px_110px_rgba(0,0,0,0.34)] sm:p-9"
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a12a24]">Secure access</p>
              <h2 className="mt-2 font-serif text-4xl font-semibold leading-none text-[#5f1919]">Administrator sign in</h2>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#761b1b] text-white"><LockKeyhole size={21} /></span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-stone-500">Use an administrator Firebase email and password. New accounts remain pending until the Chief assigns authority.</p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-stone-500">Email address</span>
              <input
                id="administrator-email"
                type="email"
                value={email}
                onChange={event => onEmailChange(event.target.value)}
                autoComplete="username"
                disabled={isSigningIn}
                className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-base font-semibold outline-none transition focus:border-[#8b1e1e] disabled:opacity-60"
                placeholder="admin@example.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-stone-500">Password</span>
              <span className="relative block">
                <input
                  id="administrator-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => onPasswordChange(event.target.value)}
                  autoComplete="current-password"
                  disabled={isSigningIn}
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 pe-12 text-base font-semibold outline-none transition focus:border-[#8b1e1e] disabled:opacity-60"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={onTogglePassword} disabled={isSigningIn} className="absolute end-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {loginError && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loginError}</p>}
          </div>

          <button type="submit" disabled={isSigningIn} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#761b1b] px-6 font-extrabold text-white shadow-[0_12px_30px_rgba(118,27,27,0.22)] transition hover:-translate-y-0.5 hover:bg-[#8b2420] disabled:cursor-not-allowed disabled:opacity-60">
            {isSigningIn ? <Loader2 size={19} className="animate-spin" /> : <ShieldCheck size={19} />}
            {isSigningIn ? 'Signing in' : 'Enter command center'}
            {!isSigningIn && <ArrowUpRight size={17} />}
          </button>
        </motion.form>
      </div>
    </AdminAccessStage>
  );
}

interface AdminApprovalScreenProps {
  isSuspended: boolean;
  email: string;
  loginError: string;
  onLogout: () => void;
}

export function AdminApprovalScreen({
  isSuspended,
  email,
  loginError,
  onLogout,
}: AdminApprovalScreenProps) {
  return (
    <AdminAccessStage>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-xl rounded-[2.2rem] bg-[#f7f2e9] p-7 text-center text-[#251817] shadow-[0_35px_110px_rgba(0,0,0,0.34)] sm:p-10">
        <span className={`mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] ${isSuspended ? 'bg-red-100 text-red-700' : 'bg-[#f2a900] text-[#2b1805]'}`}>
          {isSuspended ? <LockKeyhole size={31} /> : <Users size={31} />}
        </span>
        <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[0.21em] text-[#a12a24]">Firebase account authenticated</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#5f1919]">{isSuspended ? 'Administrator access suspended.' : 'Chief approval required.'}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-500">
          {isSuspended
            ? 'The Chief must reactivate this administrator profile before the command center can open.'
            : 'The Chief must select at least one authority and activate this administrator profile.'}
        </p>
        <div className="mt-7 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-start">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-stone-400">Signed-in account</p>
          <p className="mt-1 break-all font-extrabold text-stone-800">{email}</p>
          {loginError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{loginError}</p>}
        </div>
        <button type="button" onClick={onLogout} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#761b1b] bg-transparent px-6 font-extrabold text-[#761b1b] transition hover:bg-[#f8eeee]">
          <LogOut size={17} /> Sign Out
        </button>
      </motion.div>
    </AdminAccessStage>
  );
}

function AdminAccessStage({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#160c0c] px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="linc-grid absolute inset-0 opacity-[0.08]" />
        <motion.div aria-hidden="true" animate={prefersReducedMotion ? undefined : { x: [0, 50, -18, 0], y: [0, -25, 12, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-40 -top-48 h-[36rem] w-[36rem] rounded-full bg-[#9d2722]/35 blur-3xl" />
        <motion.div aria-hidden="true" animate={prefersReducedMotion ? undefined : { x: [0, -30, 14, 0], y: [0, 20, -10, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-[#f2a900]/15 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
