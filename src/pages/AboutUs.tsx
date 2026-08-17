import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Globe, HeartHandshake, Layers3, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useI18n } from '../i18n';
import LincLogo from '../components/brand/LincLogo';
import { getPublicAboutPeople, type AboutPerson } from '../services/about';

export default function AboutUs() {
  const { dir, locale, setLocale } = useI18n();
  const isAr = locale === 'ar';
  const prefersReducedMotion = useReducedMotion();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const [people, setPeople] = useState<AboutPerson[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [peopleFailed, setPeopleFailed] = useState(false);

  useEffect(() => { document.title = isAr ? 'من نحن | LINC One' : 'About Us | LINC One'; }, [isAr]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void getPublicAboutPeople(controller.signal)
      .then(result => { if (active) setPeople(result); })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (active) setPeopleFailed(true);
      })
      .finally(() => { if (active) setLoadingPeople(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const areas = [
    { icon: LincLogo, title: isAr ? 'النمو الروحي' : 'Spiritual Growth', text: isAr ? 'اكتشاف المواهب، والحوار، والنمو المستمر.' : 'Gift discovery, meaningful conversation, and continued growth.' },
    { icon: UsersRound, title: isAr ? 'الجيل القادم' : 'Next Generation', text: isAr ? 'أنشطة ومساحات تساعد الجيل القادم على المشاركة.' : 'Activities and spaces that help the next generation participate.' },
    { icon: HeartHandshake, title: isAr ? 'المجتمع' : 'Community', text: isAr ? 'أدوات تقرّب الأشخاص والمجموعات والخدمة.' : 'Tools that bring people, groups, and ministry closer together.' },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e9] text-[#251817]" dir={dir}>
      <div className="relative border-b border-[#8b1e1e]/10 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 font-serif text-2xl font-bold text-[#681919]"><LincLogo size={40} className="rounded-full" /> LINC One</Link>
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

      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
        <div className="linc-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-40 top-24 h-96 w-96 rounded-full bg-[#f2a900]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#a66c18]">{isAr ? 'أشخاص LINC' : 'People of LINC'}</p>
              <h2 className="mt-5 font-serif text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.86] tracking-[-0.05em] text-[#681919]">{isAr ? 'الخدمة لها وجوه.' : 'Ministry has faces.'}</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#625650] lg:justify-self-end">{isAr ? 'تعرّف إلى الأشخاص الذين يخدمون مجتمع LINC ويساعدون في بناء مساحات للنمو والمشاركة.' : 'Meet the people who serve the LINC community and help create spaces for growth, care, and participation.'}</p>
          </div>

          {loadingPeople ? (
            <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label={isAr ? 'جار تحميل الأشخاص' : 'Loading people'}>
              {[0, 1, 2].map(index => <div key={index} className="h-[34rem] animate-pulse rounded-[2.5rem] bg-white/70 shadow-sm" />)}
            </div>
          ) : peopleFailed ? (
            <div className="mt-16 rounded-[2rem] border border-[#8b1e1e]/10 bg-white/70 px-6 py-10 text-center font-semibold text-[#681919]">{isAr ? 'تعذر تحميل دليل فريق الخدمة الآن.' : 'The ministry directory could not be loaded right now.'}</div>
          ) : people.length === 0 ? (
            <div className="mt-16 rounded-[2rem] border-2 border-dashed border-[#8b1e1e]/10 bg-white/45 px-6 py-14 text-center text-[#625650]">{isAr ? 'يتم إعداد دليل فريق الخدمة.' : 'The ministry people directory is being prepared.'}</div>
          ) : (
            <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {people.map((person, index) => {
                const name = isAr ? person.nameAr || person.nameEn : person.nameEn || person.nameAr;
                const role = isAr ? person.roleAr || person.roleEn : person.roleEn || person.roleAr;
                const description = isAr ? person.descriptionAr || person.descriptionEn : person.descriptionEn || person.descriptionAr;
                return (
                  <motion.article
                    key={person.id}
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 38 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={{ duration: 0.65, delay: prefersReducedMotion ? 0 : (index % 3) * 0.08 }}
                    className="group relative overflow-hidden rounded-[2.5rem] border border-[#8b1e1e]/10 bg-white shadow-[0_22px_70px_rgba(61,25,16,0.10)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e9ded0]">
                      <img src={person.photoUrl} alt={name} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1b0e0e]/90 via-[#1b0e0e]/20 to-transparent" />
                      <p className="absolute bottom-6 left-6 right-6 text-xs font-black uppercase tracking-[0.2em] text-[#ffd36c]" dir={isAr ? 'rtl' : 'ltr'}>{role}</p>
                    </div>
                    <div className="p-7 sm:p-8">
                      <h3 className="font-serif text-3xl font-semibold leading-tight text-[#681919]" dir={isAr ? 'rtl' : 'ltr'}>{name}</h3>
                      {description && <p className="mt-4 text-sm leading-7 text-[#625650]" dir={isAr ? 'rtl' : 'ltr'}>{description}</p>}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
