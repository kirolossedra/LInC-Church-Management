import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import CommunityCarousel from '../components/landing/CommunityCarousel';
import LincOneHero from '../components/landing/LincOneHero';
import SpiritualProgramFeature from '../components/landing/SpiritualProgramFeature';
import { useI18n } from '../i18n';

export default function LandingPage() {
  const { dir, locale, setLocale } = useI18n();
  const isAr = locale === 'ar';

  useEffect(() => {
    document.title = isAr ? 'LINC One | مكان واحد للتواصل والنمو' : 'LINC One | Connect, Grow, Serve';
  }, [isAr]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f1e9] text-[#251817]" dir={dir}>
      <LincOneHero isAr={isAr} dir={dir} onToggleLocale={() => setLocale(isAr ? 'en' : 'ar')} />
      <SpiritualProgramFeature isAr={isAr} dir={dir} />
      <CommunityCarousel isAr={isAr} dir={dir} />

      <footer className="border-t border-white/10 bg-[#190e0d] px-6 py-10 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-start">
          <div>
            <p className="font-serif text-2xl font-semibold text-white">LINC One</p>
            <p className="mt-1 text-sm">
              {isAr ? 'تواصل. انمُ. اخدم.' : 'Connect. Grow. Serve.'}
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-bold uppercase tracking-[0.16em]">
            <Link to="/about" className="transition-colors hover:text-white">{isAr ? 'من نحن' : 'About Us'}</Link>
            <Link to="/privacy" className="transition-colors hover:text-white">{isAr ? 'الخصوصية' : 'Privacy'}</Link>
            <Link to="/tos" className="transition-colors hover:text-white">{isAr ? 'الشروط' : 'Terms'}</Link>
          </nav>
          <p className="text-xs text-white/35">{isAr ? 'صُمم بواسطة' : 'Created by'} <span className="font-bold text-white/70">T-TLabs</span></p>
        </div>
      </footer>
    </div>
  );
}
