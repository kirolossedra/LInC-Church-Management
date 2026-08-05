import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AssessmentForm from './components/AssessmentForm';
import PastorDashboard from './components/pastor/PastorDashboard';
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import GuidePage from './pages/GuidePage';
import BookingCalendar from './pages/BookingCalendar';
import NextGenActivities from './pages/NextGenActivities';
import PeopleNotesPage from './pages/PeopleNotesPage';
import CongregationGroupNotes from './pages/CongregationGroupNotes';
import AdministratorPanel from './components/admin/AdministratorPanel';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { handleOAuthCallback, storeTokens } from './services/gmail';
import { I18nProvider, useI18n } from './i18n';
import { TutorialProvider } from './components/tutorial-builder';
import { usePastorAccess } from './hooks/usePastorAccess';

function ProtectedRoute({
  children,
  hasAccess,
  loading,
  fallbackUrl,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  loading: boolean;
  fallbackUrl?: string;
}) {
  const [user] = useAuthState(auth);
  const { t, dir } = useI18n();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: unknown }).code || '')
        : '';

      if (code === 'auth/email-already-in-use') {
        setAuthError(t('auth.emailInUse'));
      } else if (code === 'auth/weak-password') {
        setAuthError(t('auth.weakPassword'));
      } else {
        setAuthError(t('auth.authError'));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[2rem] border border-[#681919]/10 bg-[#1b0d0d] shadow-[0_28px_80px_rgba(40,10,10,0.2)]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-[#f2a900]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-stone-300">LInC One</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-gateway mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-[#681919]/10 bg-[#fffdf9]/90 shadow-[0_28px_80px_rgba(60,18,18,0.14)] backdrop-blur-xl" dir={dir}>
        <div className="relative overflow-hidden bg-[#1b0d0d] px-7 pb-10 pt-12 text-center text-white md:px-12">
          <div className="linc-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
          <div className="relative mx-auto mb-7 grid h-20 w-20 place-items-center rounded-[1.7rem] border border-white/15 bg-white/10">
            <ShieldCheck size={36} className="text-[#f2a900]" />
          </div>
          <h2 className="relative font-serif text-[clamp(2.6rem,7vw,4.6rem)] font-semibold leading-[0.95] text-[#fff8ed]">{t('auth.loginTitle')}</h2>
          <p className="relative mx-auto mt-5 max-w-md text-sm leading-relaxed text-stone-300">{t('auth.loginDesc')}</p>
        </div>
        <div className="p-7 md:p-10">
        {!showEmailLogin ? (
          <div className="space-y-4">
            <button
              onClick={() => signInWithGoogle()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#681919]/20 bg-white px-8 py-4 font-bold text-[#681919] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#fff8f4] active:scale-[0.98]"
            >
              <LogIn size={20} />
              {t('auth.signIn')}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#fffdf9] px-4 text-sm text-stone-400">{t('auth.or')}</span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailLogin(true)}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#681919] px-8 py-4 font-bold text-white shadow-[0_14px_32px_rgba(104,25,25,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#511212] active:scale-[0.98]"
            >
              <Mail size={20} />
              {t('auth.signInEmail')}
            </button>
          </div>
        ) : (
          <div className="rounded-[1.7rem] border border-[#681919]/10 bg-white p-7 text-left shadow-[0_18px_45px_rgba(60,18,18,0.08)] md:p-8">
            <h3 className="mb-6 text-center font-serif text-3xl font-semibold text-[#681919]">
              {isSignUp ? t('auth.signUpTitle') : t('auth.signInBtn')}
            </h3>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#681919]/10 bg-[#f7f2ea] px-4 py-3 outline-none transition-shadow focus:ring-2 focus:ring-[#8B1E1E]/20"
                  placeholder="pastor@linc.church"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#681919]/10 bg-[#f7f2ea] px-4 py-3 outline-none transition-shadow focus:ring-2 focus:ring-[#8B1E1E]/20"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}

              <button
                disabled={authLoading}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#681919] py-4 font-bold text-white shadow-[0_14px_32px_rgba(104,25,25,0.2)] transition-all hover:bg-[#511212]"
              >
                {authLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Lock size={16} />
                    {isSignUp ? t('auth.signUpBtn') : t('auth.signInBtn')}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className="text-sm text-[#8B1E1E] font-bold hover:underline"
              >
                {isSignUp
                  ? `${t('auth.hasAccount')} ${t('auth.signInNow')}`
                  : `${t('auth.noAccount')} ${t('auth.signUpNow')}`}
              </button>
            </div>

            <button
              onClick={() => {
                setShowEmailLogin(false);
                setAuthError('');
              }}
              className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              ← Back to Google Sign-in
            </button>
          </div>
        )}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallbackUrl && user) {
      return <Navigate to={fallbackUrl} replace />;
    }

    return (
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-[#681919]/10 bg-[#fffdf9] px-7 py-12 text-center shadow-[0_28px_80px_rgba(60,18,18,0.14)] md:px-12" dir={dir}>
        <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-[1.7rem] bg-[#681919] text-white shadow-[0_16px_36px_rgba(104,25,25,0.22)]">
          <ShieldCheck size={36} className="text-[#f2a900]" />
        </div>

        <h2 className="mb-4 font-serif text-4xl font-semibold text-[#681919]">{t('auth.deniedTitle')}</h2>
        <p className="mb-6 font-serif text-xl italic text-stone-500">{t('auth.deniedQuote')}</p>
        <p className="mb-10 text-sm leading-relaxed text-stone-600">
          {t('auth.signedInAs')} <span className="font-bold">{user.email}</span>, {t('auth.deniedDesc')}
        </p>

        <button
          onClick={() => auth.signOut()}
          className="rounded-2xl bg-[#681919] px-8 py-3 font-bold text-white shadow-[0_14px_32px_rgba(104,25,25,0.2)] transition-colors hover:bg-[#511212]"
        >
          {t('nav.signOut')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [user, authLoading] = useAuthState(auth);
  const location = useLocation();
  const {
    isPastor,
    loading: pastorAccessLoading,
  } = usePastorAccess(user);

  React.useEffect(() => {
    const tokens = handleOAuthCallback();

    if (tokens && !tokens.error) {
      storeTokens(tokens);
      window.history.replaceState({}, document.title, '/calendar');
    }

    import('@emailjs/browser').then(emailjs => {
      emailjs.init({ publicKey: 'x_Xx3UHe3-yE1I13_' });
    });
  }, []);

  const appLoading = authLoading || pastorAccessLoading;

  const getActiveTab = () => {
    const path = location.pathname;

    if (path === '/calendar') return 'calendar';
    if (path === '/pastor/people-notes') return 'people-notes';
    if (path === '/assessment') return 'spiritual-program';
    if (path === '/guide') return 'guide';
    if (path === '/group-notes') return 'spiritual-program';
    if (path === '/booking') return 'spiritual-program';
    if (path === '/nextgen-activities') return 'nextgen-activities';

    return 'home';
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutUs />} />

      <Route
        path="/calendar"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isPastor}>
            <ProtectedRoute hasAccess={!!isPastor} loading={appLoading}>
              <PastorDashboard />
            </ProtectedRoute>
          </Layout>
        }
      />

      <Route
        path="/pastor/people-notes"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isPastor}>
            <ProtectedRoute hasAccess={!!isPastor} loading={appLoading}>
              <PeopleNotesPage hasPastorAccess={isPastor} />
            </ProtectedRoute>
          </Layout>
        }
      />

      <Route
        path="/guide"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isPastor}>
            <ProtectedRoute hasAccess={!!isPastor} loading={appLoading}>
              <GuidePage />
            </ProtectedRoute>
          </Layout>
        }
      />

      <Route
        path="/assessment"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={false}>
            <AssessmentForm />
          </Layout>
        }
      />

      <Route
        path="/booking"
        element={
          <Layout activeTab="spiritual-program" isAdmin={false}>
            <BookingCalendar />
          </Layout>
        }
      />

      <Route
        path="/nextgen-activities"
        element={
          <Layout activeTab="nextgen-activities" isAdmin={false}>
            <NextGenActivities />
          </Layout>
        }
      />

      <Route
        path="/group-notes"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={false}>
            <CongregationGroupNotes />
          </Layout>
        }
      />


      <Route path="/administrator" element={<AdministratorPanel />} />

      <Route
        path="/privacy"
        element={
          <Layout activeTab="home" isAdmin={false}>
            <PrivacyPolicy />
          </Layout>
        }
      />
      <Route
        path="/tos"
        element={
          <Layout activeTab="home" isAdmin={false}>
            <TermsOfService />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <I18nProvider>
        <TutorialProvider>
          <AppRoutes />
        </TutorialProvider>
      </I18nProvider>
    </Router>
  );
}
