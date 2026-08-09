import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowUpRight,
  Globe,
  Info,
  LogIn,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RefObject } from 'react';
import LincCrossMark from '../brand/LincCrossMark';

interface LincOneHeroProps {
  isAr: boolean;
  dir: 'ltr' | 'rtl';
  onToggleLocale: () => void;
  actionsRef?: RefObject<HTMLDivElement | null>;
}

export default function LincOneHero({ isAr, dir, onToggleLocale, actionsRef }: LincOneHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  const categoryLinks = [
    {
      label: isAr ? 'الجيل القادم' : 'NextGen',
      detail: isAr ? 'أنشطة ومساحات للجيل القادم' : 'Activities and spaces for the next generation',
      path: '/nextgen-activities',
      icon: UsersRound,
      tone: 'bg-[#f2a900] text-[#26170d]',
    },
    {
      label: isAr ? 'من نحن' : 'About Us',
      detail: isAr ? 'تعرف على LINC One وما نقدمه' : 'Meet LINC One and what it brings together',
      path: '/about',
      icon: Info,
      tone: 'bg-[#e8d9c7] text-[#5f1919]',
    },
  ];

  return (
    <header className="relative min-h-[100svh] overflow-hidden bg-[#f7f2e9] px-5 pb-12 pt-5 sm:px-8 sm:pt-7">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [0, 40, -12, 0], y: [0, -28, 18, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-32 -top-36 h-[32rem] w-[32rem] rounded-full bg-[#8b1e1e]/12 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [0, -28, 12, 0], y: [0, 22, -16, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#f2a900]/20 blur-3xl"
        />
        <div className="linc-grid absolute inset-0 opacity-40" />
      </div>

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="group inline-flex items-center gap-3" aria-label="LINC One home">
          <LincCrossMark
            size={44}
            className="shadow-[0_10px_30px_rgba(139,30,30,0.25)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105"
          />
          <span className="font-serif text-2xl font-bold tracking-[-0.03em] text-[#661818]">LINC One</span>
        </Link>
        <button
          type="button"
          onClick={onToggleLocale}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#8b1e1e]/15 bg-white/65 px-4 text-sm font-bold text-[#711c1c] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
        >
          <Globe size={16} />
          {isAr ? 'English' : 'العربية'}
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#8b1e1e]/15 bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#8b1e1e] backdrop-blur">
            <Sparkles size={14} />
            {isAr ? 'مكان واحد. مجتمع واحد.' : 'One place. One community.'}
          </p>
          <h1 className="font-serif text-[clamp(4.5rem,14vw,10rem)] font-semibold leading-[0.78] tracking-[-0.075em] text-[#6f1919]">
            LINC
            <motion.span
              initial={{ opacity: 0, x: dir === 'rtl' ? 35 : -35 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="block ps-[0.2em] text-[#a12a24]"
            >
              One<span className="text-[#f2a900]">.</span>
            </motion.span>
          </h1>
          <p className="mt-8 max-w-xl text-[clamp(1rem,2vw,1.3rem)] leading-relaxed text-[#5f5550]">
            {isAr
              ? 'مكان واحد للتواصل والنمو والخدمة والمشاركة في حياة خدمة LInC.'
              : 'One place to connect, grow, serve, and take part in the life of LInC Ministry.'}
          </p>
        </motion.div>

        <motion.div
          ref={actionsRef}
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1, delayChildren: 0.2 } } }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <motion.a
            href="#spiritual-gifts-program"
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
            whileHover={prefersReducedMotion ? undefined : { y: -7, rotate: -0.5 }}
            className="group relative min-h-[230px] overflow-hidden rounded-[2rem] bg-[#761b1b] p-7 text-start text-white shadow-[0_24px_70px_rgba(87,18,18,0.24)] sm:col-span-2"
          >
            <span className="absolute -right-6 -top-16 font-serif text-[12rem] leading-none text-white/[0.06]">✦</span>
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/12"><Sparkles size={23} /></span>
            <span className="relative mt-12 flex items-end justify-between gap-5">
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.18em] text-white/55">01 / {isAr ? 'النمو' : 'Growth'}</span>
                <span className="mt-2 block font-serif text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none">{isAr ? 'برنامج المواهب الروحية' : 'Spiritual Gifts Program'}</span>
              </span>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#761b1b] transition-transform group-hover:rotate-45"><ArrowDown size={21} /></span>
            </span>
          </motion.a>

          {categoryLinks.map(({ label, detail, path, icon: Icon, tone }, index) => (
            <motion.div
              key={path}
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
              whileHover={prefersReducedMotion ? undefined : { y: -7, rotate: index === 0 ? 0.7 : -0.7 }}
            >
              <Link to={path} className={`group flex min-h-[190px] h-full flex-col justify-between rounded-[2rem] p-6 shadow-[0_18px_50px_rgba(73,43,22,0.11)] ${tone}`}>
                <span className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/35"><Icon size={22} /></span>
                  <ArrowUpRight size={21} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
                <span>
                  <span className="font-serif text-3xl font-semibold">{label}</span>
                  <span className="mt-2 block text-sm leading-relaxed opacity-70">{detail}</span>
                </span>
              </Link>
            </motion.div>
          ))}

          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Link to="/calendar" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#8b1e1e]/20 bg-white/70 px-4 text-center text-sm font-bold text-[#761b1b] backdrop-blur transition hover:-translate-y-1 hover:bg-white">
              <LogIn size={18} /> {isAr ? 'تسجيل دخول الراعي' : 'Pastor Login'}
            </Link>
            <Link to="/administrator" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#8b1e1e]/20 bg-white/70 px-4 text-center text-sm font-bold text-[#761b1b] backdrop-blur transition hover:-translate-y-1 hover:bg-white">
              <ShieldCheck size={18} /> {isAr ? 'لوحة الإدارة' : 'Administrator Panel'}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
