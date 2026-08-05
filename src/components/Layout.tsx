import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  BookOpen,
  Calendar as CalendarIcon,
  Church,
  Globe,
  Home,
  Info,
  LogOut,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { useI18n } from '../i18n';
import { TutorialLibrary } from './tutorial-builder';

interface LayoutProps {
  children: ReactNode;
  activeTab?: string;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, isAdmin }: LayoutProps) {
  const [user] = useAuthState(auth);
  const { t, dir, locale, setLocale } = useI18n();

  const navItemClass = (tab: string) =>
    `group flex min-w-[58px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all md:min-w-0 md:flex-row md:gap-2 md:px-3 md:text-[11px] ${
      activeTab === tab
        ? 'bg-[#f2a900] text-[#24120d] shadow-[0_10px_24px_rgba(242,169,0,0.2)]'
        : 'text-stone-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="linc-app-shell min-h-screen overflow-x-hidden bg-[#f4efe6] text-[#251716]" dir={dir}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="linc-grid absolute inset-0 opacity-[0.035]" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-[#8b1e1e]/10 blur-3xl" />
        <div className="absolute -left-28 bottom-24 h-72 w-72 rounded-full bg-[#f2a900]/10 blur-3xl" />
      </div>

      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 md:hidden">
        <TutorialLibrary audience={isAdmin ? 'pastor' : 'congregation'} locale={locale} />
        <button
          data-tutorial-id="nav-language-toggle"
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          className="grid h-10 min-w-10 place-items-center rounded-xl border border-white/15 bg-[#160b0b]/95 px-2 text-xs font-bold text-white shadow-lg backdrop-blur-xl"
          aria-label="Change language"
        >
          {locale === 'en' ? 'ع' : 'En'}
        </button>
        {user && (
          <button
            data-tutorial-id="nav-sign-out"
            onClick={() => auth.signOut()}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-[#160b0b]/95 text-stone-200 shadow-lg backdrop-blur-xl"
            title={t('nav.signOut')}
          >
            <LogOut size={17} />
          </button>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#160b0b]/95 px-2 py-2 text-white shadow-[0_-18px_50px_rgba(28,8,8,0.25)] backdrop-blur-2xl md:inset-x-5 md:bottom-auto md:top-4 md:rounded-[1.7rem] md:border md:px-4 md:py-3 md:shadow-[0_18px_60px_rgba(28,8,8,0.24)]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <Link to="/" data-tutorial-id="nav-brand-home" className="hidden shrink-0 items-center gap-3 md:flex">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#8b1e1e] text-white shadow-[0_8px_24px_rgba(139,30,30,0.42)]">
              <Church size={20} />
            </div>
            <div>
              <span className="block font-serif text-xl font-semibold leading-none text-white">LInC One</span>
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.28em] text-[#f2a900]">Connect · Grow · Serve</span>
            </div>
          </Link>

          <div className="no-scrollbar flex flex-1 items-center justify-start gap-1 overflow-x-auto md:justify-center">
            <Link to="/" data-tutorial-id="nav-home" className={navItemClass('home')}>
              <Home size={18} />
              <span>{t('nav.home')}</span>
            </Link>
            <Link to="/#spiritual-gifts-program" data-tutorial-id="nav-spiritual-program" className={navItemClass('spiritual-program')}>
              <Sparkles size={18} />
              <span>{locale === 'ar' ? 'المواهب' : 'Spiritual'}</span>
            </Link>
            <Link to="/nextgen-activities" data-tutorial-id="nav-nextgen" className={navItemClass('nextgen-activities')}>
              <UsersRound size={18} />
              <span>NextGen</span>
            </Link>
            <Link to="/about" data-tutorial-id="nav-about" className={navItemClass('about')}>
              <Info size={18} />
              <span>{locale === 'ar' ? 'من نحن' : 'About'}</span>
            </Link>

            {isAdmin && (
              <>
                <Link to="/calendar" data-tutorial-id="nav-pastor-calendar" className={navItemClass('calendar')}>
                  <CalendarIcon size={18} />
                  <span>{t('nav.calendar')}</span>
                </Link>
                <Link to="/guide" data-tutorial-id="nav-guide" className={navItemClass('guide')}>
                  <BookOpen size={18} />
                  <span>{t('nav.guide')}</span>
                </Link>
              </>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <TutorialLibrary audience={isAdmin ? 'pastor' : 'congregation'} locale={locale} />
            <button
              data-tutorial-id="nav-language-toggle"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              className="flex h-10 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10"
            >
              <Globe size={14} />
              {locale === 'en' ? 'ع' : 'En'}
            </button>
            {user && (
              <button
                data-tutorial-id="nav-sign-out"
                onClick={() => auth.signOut()}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
                title={t('nav.signOut')}
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1500px] px-4 pb-28 pt-16 sm:px-6 md:pb-16 md:pt-32 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          key={activeTab}
        >
          {children}
        </motion.div>
      </main>

      <footer className="relative z-10 overflow-hidden border-t border-white/10 bg-[#160b0b] px-6 pb-28 pt-12 text-white md:pb-12">
        <div className="linc-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-serif text-4xl font-semibold text-[#fff8ec]">LInC One</p>
            <p className="mt-2 text-sm text-stone-400">{locale === 'ar' ? 'تواصل. انمُ. اخدم.' : 'Connect. Grow. Serve.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-300 transition-colors hover:border-[#f2a900]/50 hover:text-white">
              {t('footer.privacy')} <ArrowUpRight size={12} />
            </Link>
            <Link to="/tos" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-300 transition-colors hover:border-[#f2a900]/50 hover:text-white">
              {t('footer.tos')} <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <p className="relative mx-auto mt-10 max-w-6xl border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.22em] text-stone-500">
          {t('footer.created')} <span className="font-bold text-[#f2a900]">T-TLabs</span>
        </p>
      </footer>
    </div>
  );
}
