import { useState, type FormEvent, type ReactNode } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, type User } from 'firebase/auth';
import { LockKeyhole, LogIn, UserPlus } from 'lucide-react';

import { auth } from '../../../firebase';
import LincLogo from '../../brand/LincLogo';

export default function NextGenAuthGateway({ user, loading, children }: {
  user: User | null | undefined;
  loading: boolean;
  children: ReactNode;
}) {
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (creating) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: fullName.trim() });
        await credential.user.getIdToken(true);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (authError) {
      const code = authError && typeof authError === 'object' && 'code' in authError
        ? String((authError as { code?: unknown }).code || '')
        : '';
      setError(code === 'auth/email-already-in-use'
        ? 'That email already has an account. Sign in instead.'
        : code === 'auth/weak-password'
          ? 'Use a stronger password with at least six characters.'
          : 'The email or password could not be accepted.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="grid min-h-[420px] place-items-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-[#7a1717]/20 border-t-[#7a1717]" /></div>;
  if (user) return <>{children}</>;

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-[2.4rem] border border-[#6f1d1b]/10 bg-[#fffdf8] shadow-[0_32px_90px_rgba(64,18,16,0.16)]">
      <div className="relative overflow-hidden bg-[#1b0d0d] px-8 py-12 text-center text-white">
        <div className="linc-grid absolute inset-0 opacity-10" />
        <LincLogo className="relative mx-auto mb-6 h-20 w-20 rounded-3xl bg-white/10 p-3" />
        <p className="relative text-xs font-black uppercase tracking-[0.32em] text-[#f2a900]">One secure account</p>
        <h1 className="relative mt-3 font-serif text-5xl font-semibold">NextGen Portal</h1>
        <p className="relative mx-auto mt-4 max-w-lg text-sm leading-7 text-stone-300">Create your Firebase account once, then use the same login for QA sessions, the mission map, and NextGen files.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 p-8 md:p-11">
        {creating && (
          <label className="block text-sm font-bold text-stone-700">Full name
            <input value={fullName} onChange={event => setFullName(event.target.value)} required className="mt-2 w-full rounded-2xl border border-[#6f1d1b]/15 bg-[#f7f2ea] px-5 py-4 outline-none focus:ring-2 focus:ring-[#7a1717]/20" autoComplete="name" />
          </label>
        )}
        <label className="block text-sm font-bold text-stone-700">Email
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-2 w-full rounded-2xl border border-[#6f1d1b]/15 bg-[#f7f2ea] px-5 py-4 outline-none focus:ring-2 focus:ring-[#7a1717]/20" autoComplete="email" />
        </label>
        <label className="block text-sm font-bold text-stone-700">Password
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} className="mt-2 w-full rounded-2xl border border-[#6f1d1b]/15 bg-[#f7f2ea] px-5 py-4 outline-none focus:ring-2 focus:ring-[#7a1717]/20" autoComplete={creating ? 'new-password' : 'current-password'} />
        </label>
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-6 py-4 font-black text-white shadow-[0_14px_30px_rgba(122,23,23,0.2)] disabled:opacity-50">
          {creating ? <UserPlus size={19} /> : <LogIn size={19} />}
          {busy ? 'Please wait…' : creating ? 'Create account and enter' : 'Sign in'}
        </button>
        <button type="button" onClick={() => { setCreating(value => !value); setError(''); }} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-[#7a1717] hover:underline">
          <LockKeyhole size={16} /> {creating ? 'Already registered? Sign in' : 'New to NextGen? Create an account'}
        </button>
      </form>
    </section>
  );
}
