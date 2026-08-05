import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Globe, HeartHandshake, Layers3, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useI18n } from '../i18n';

export default function AboutUs() {
  const { dir, locale, setLocale } = useI18n();
  const isAr = locale === 'ar';
  const prefersReducedMotion = useReducedMotion();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => { document.title = isAr ? 'من نحن | LINC One' : 'About Us | LINC One'; }, [isAr]);

  const areas = [
    { icon: Sparkles, title: isAr ? 'النمو الروحي' : 'Spiritual Growth', text: isAr ? 'اكتشاف المواهب، والحوار، والنمو المستمر.' : 'Gift discovery, meaningful conversation, and continued growth.' },
    { icon: UsersRound, title: isAr ? 'الجيل القادم' : 'Next Generation', text: isAr ? 'أنشطة ومساحات تساعد الجيل القادم على المشاركة.' : 'Activities and spaces that help the next generation participate.' },
    { icon: HeartHandshake, title: isAr ? 'المجتمع' : 'Community', text: isAr ? 'أدوات تقرّب الأشخاص والمجموعات والخدمة.' : 'Tools that bring people, groups, and ministry closer together.' },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e9] text-[#251817]" dir={dir}>
      <div className="relative border-b border-[#8b1e1e]/10 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="font-serif text-2xl font-bold text-[#681919]">LINC One</Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLocale(isAr ? 'en' : 'ar')} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#8b1e1e]/15 bg-white px-4 text-sm font-bold text-[#761b1b] transition hover:-translate-y-0.5"><Globe size={16} /> {isAr ? 'English' : 'العربية'}</button>
            <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#8b1e1e]/15 bg-white px-4 text-sm font-bold text-[#761b1b] transition hover:-translate-y-0.5"><BackIcon size={17} /> <span className="hidden sm:inline">{isAr ? 'العودة' : 'Back home'}</span></Link>
          </div>
        </div>
      </div>

      <section className="relative px-5 py-24 sm:px-8 sm:py-32">
        <div className="linc-grid pointer-events-none absolute inset-0 opacity-35" />
        <motion.div initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#a12a24]">{isAr ? 'من نحن' : 'About us'}</p>
          <h1 className="mt-7 max-w-5xl font-serif text-[clamp(4rem,10vw,9rem)] font-semibold leading-[0.8] tracking-[-0.065em] text-[#681919]">
            {isAr ? 'مكان واحد للحياة والخدمة.' : 'One place for life and ministry.'}
          </h1>
          <p className="mt-10 max-w-2xl text-xl leading-relaxed text-[#625650]">
            {isAr ? 'LINC One هو البيت الرقمي المشترك لبرامج خدمة LInC ومواردها ومساحات المشاركة فيها.' : 'LINC One is the shared digital home for LInC Ministry programs, resources, and ways to participate.'}
          </p>
        </motion.div>
      </section>

      <section className="bg-[#1b0e0e] px-5 py-24 text-white sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Layers3 size={34} className="text-[#f2a900]" />
              <h2 className="mt-6 font-serif text-5xl font-semibold">{isAr ? 'ما الذي يجمعه LINC One؟' : 'What LINC One brings together'}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {areas.map(({ icon: Icon, title, text }, index) => (
                <motion.article key={title} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                  <Icon size={27} className="text-[#f2a900]" />
                  <h3 className="mt-10 font-serif text-2xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
