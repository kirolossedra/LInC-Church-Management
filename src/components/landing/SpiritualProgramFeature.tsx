import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight, CalendarDays, ClipboardCheck, NotebookTabs, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

interface SpiritualProgramFeatureProps {
  isAr: boolean;
  dir: 'ltr' | 'rtl';
}

export default function SpiritualProgramFeature({ isAr, dir }: SpiritualProgramFeatureProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['12%', '-14%']);
  const glowX = useTransform(scrollYProgress, [0, 1], ['-20%', '40%']);

  const actions = [
    {
      number: '01', icon: ClipboardCheck, path: '/assessment',
      title: isAr ? 'ابدأ التقييم' : 'Take the Assessment',
      description: isAr ? 'اكتشف نقاط القوة والمواهب التي وهبك الله إياها.' : 'Discover the strengths and gifts God has placed in you.',
      accent: 'from-[#f2a900] to-[#ffcb55]', ink: 'text-[#2b1805]',
    },
    {
      number: '02', icon: CalendarDays, path: '/booking',
      title: isAr ? 'احجز اجتماعاً مع الراعي' : 'Book a Meeting with the Pastor',
      description: isAr ? 'حوّل نتائجك إلى حوار واضح وخطوة تالية عملية.' : 'Turn your results into a clear conversation and a practical next step.',
      accent: 'from-[#a42b25] to-[#6d1717]', ink: 'text-white',
    },
    {
      number: '03', icon: NotebookTabs, path: '/group-notes',
      title: isAr ? 'ملاحظات مجموعتي' : 'My Group Notes',
      description: isAr ? 'تابع واجبات مجموعتك ومواعيدها وموادها في مكان واحد.' : 'Keep up with your group assignments, meetings, and materials in one place.',
      accent: 'from-[#e7d9c6] to-[#cdb89f]', ink: 'text-[#5f1919]',
    },
  ];

  const gifts = isAr
    ? ['رسولية', 'نبوية', 'تبشيرية', 'رعوية', 'تعليم']
    : ['Apostolic', 'Prophetic', 'Evangelistic', 'Pastoral', 'Teaching'];

  return (
    <section id="spiritual-gifts-program" ref={sectionRef} className="relative isolate overflow-hidden bg-[#160c0c] px-5 py-24 text-white sm:px-8 sm:py-32">
      <motion.div
        aria-hidden="true"
        style={prefersReducedMotion ? undefined : { y: backgroundY }}
        className="pointer-events-none absolute inset-x-0 top-10 -z-10 select-none text-center font-serif text-[clamp(6rem,21vw,19rem)] font-semibold uppercase leading-[0.72] tracking-[-0.08em] text-white/[0.035]"
      >
        {isAr ? <><span className="block">المواهب</span><span className="block">الروحية</span></> : <><span className="block">Spiritual</span><span className="block">Gifts</span></>}
      </motion.div>
      <motion.div aria-hidden="true" style={prefersReducedMotion ? undefined : { x: glowX }} className="pointer-events-none absolute left-1/4 top-1/3 -z-10 h-80 w-80 rounded-full bg-[#b72e26]/20 blur-[100px]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_0.72fr]">
          <motion.div initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.75 }}>
            <p className="mb-6 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.25em] text-[#f2a900]">
              <Sparkles size={15} /> {isAr ? 'المميز' : 'Featured'}
            </p>
            <h2 className="max-w-4xl font-serif text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[0.82] tracking-[-0.06em]">
              {isAr ? 'اكتشف دعوتك.' : 'Discover your calling.'}
            </h2>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.7 }} className="max-w-xl text-lg leading-relaxed text-white/58">
            {isAr
              ? 'رحلة واحدة تجمع التقييم، والحوار مع الراعي، والنمو داخل مجموعتك.'
              : 'One connected journey bringing together assessment, a conversation with the pastor, and growth inside your group.'}
          </motion.p>
        </div>

        <div className="mt-20 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {actions.map(({ number, icon: Icon, path, title, description, accent, ink }, index) => (
            <motion.div
              key={path}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 60, rotate: prefersReducedMotion ? 0 : index - 1 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: prefersReducedMotion ? 0 : index * 0.11, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileHover={prefersReducedMotion ? undefined : { y: -14, rotate: index === 1 ? 1 : -1 }}
              className="[perspective:1200px]"
            >
              <Link to={path} className={`linc-feature-card group relative flex min-h-[430px] h-full flex-col overflow-hidden rounded-[2.25rem] bg-gradient-to-br p-7 shadow-[0_35px_90px_rgba(0,0,0,0.28)] sm:p-8 ${accent} ${ink}`}>
                <span className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-[0.22em] opacity-60">{number}</span>
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-current/15 bg-white/10 backdrop-blur"><ArrowUpRight size={21} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" /></span>
                </span>
                <span className="my-auto grid h-24 w-24 place-items-center self-center rounded-[2rem] border border-current/10 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Icon size={42} strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block font-serif text-[clamp(2rem,3vw,2.65rem)] font-semibold leading-[0.95]">{title}</span>
                  <span className="mt-4 block text-sm leading-relaxed opacity-65">{description}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 overflow-hidden border-y border-white/10 py-6" aria-label={isAr ? 'مجالات المواهب الروحية' : 'Spiritual gift areas'}>
          <div className={`linc-marquee-track flex w-max items-center gap-8 ${dir === 'rtl' ? 'linc-marquee-reverse' : ''}`}>
            {[...gifts, ...gifts].map((gift, index) => (
              <span key={`${gift}-${index}`} className="flex items-center gap-8 whitespace-nowrap font-serif text-3xl text-white/75 sm:text-5xl">
                {gift}<span className="text-lg text-[#f2a900]">✦</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-white/45 sm:gap-6">
          <span>{isAr ? 'قيّم' : 'Assess'}</span><span className="text-[#f2a900]">→</span>
          <span>{isAr ? 'تحاور' : 'Meet'}</span><span className="text-[#f2a900]">→</span>
          <span>{isAr ? 'انمُ' : 'Grow'}</span>
        </div>
      </div>
    </section>
  );
}
