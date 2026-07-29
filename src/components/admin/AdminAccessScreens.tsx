import type { FormEventHandler } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface AdminLoadingScreenProps {
  message: string;
}

export function AdminLoadingScreen({ message }: AdminLoadingScreenProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f4f0] px-5">
      <div className="text-center text-[#641414]">
        <Loader2 size={38} className="mx-auto mb-4 animate-spin" />
        <p className="font-extrabold">{message}</p>
      </div>
    </div>
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
  return (
    <div className="min-h-screen bg-[#f5f4f0] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <form
          onSubmit={onSubmit}
          className="w-full rounded-[28px] border border-[#8b1e1e]/10 bg-white p-7 shadow-[0_24px_70px_rgba(73,20,20,0.14)] sm:p-9"
        >
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_10px_30px_rgba(139,30,30,0.25)]">
            <LockKeyhole size={28} />
          </div>

          <div className="text-center">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
              LINC Administration
            </p>
            <h1 className="text-3xl font-extrabold text-[#641414]">
              Administrator Panel
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Sign in with a Firebase Authentication email and password. The
              first successful account becomes Chief.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-stone-700">
                Email address
              </span>
              <input
                id="administrator-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                autoComplete="username"
                disabled={isSigningIn}
                className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900 outline-none transition focus:border-[#8b1e1e] disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="admin@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-stone-700">
                Password
              </span>

              <div className="relative">
                <input
                  id="administrator-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  autoComplete="current-password"
                  disabled={isSigningIn}
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 pr-12 text-base text-stone-900 outline-none transition focus:border-[#8b1e1e] disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={onTogglePassword}
                  disabled={isSigningIn}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            {loginError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {loginError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSigningIn}
            className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-6 font-bold text-white shadow-[0_10px_25px_rgba(139,30,30,0.22)] transition hover:-translate-y-0.5 hover:bg-[#761919] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ShieldCheck size={20} />
            )}
            {isSigningIn ? 'Signing In' : 'Sign In'}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-stone-400">
            Email/password accounts must already exist in Firebase
            Authentication.
          </p>
        </form>
      </div>
    </div>
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
    <div className="min-h-screen bg-[#f5f4f0] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-[#8b1e1e]/10 bg-white p-7 text-center shadow-[0_24px_70px_rgba(73,20,20,0.14)] sm:p-9">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e]">
            {isSuspended ? <LockKeyhole size={28} /> : <Users size={28} />}
          </div>

          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
            Firebase account authenticated
          </p>
          <h1 className="text-3xl font-extrabold text-[#641414]">
            {isSuspended
              ? 'Administrator Access Suspended'
              : 'Chief Approval Required'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            {isSuspended
              ? 'The Chief has suspended this administrator profile. You cannot open the panel until the Chief activates it again.'
              : 'Your email and password were accepted. The Chief must now select your authority and activate your administrator profile.'}
          </p>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left">
            <p className="text-xs font-extrabold uppercase tracking-wide text-stone-400">
              Signed-in account
            </p>
            <p className="mt-1 break-all font-bold text-stone-800">{email}</p>
            {loginError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {loginError}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full border-2 border-[#8b1e1e] bg-white px-6 font-bold text-[#8b1e1e] transition hover:bg-[#f8eeee]"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
