import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface LincPageHeroProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}

export default function LincPageHero({
  title,
  description,
  eyebrow = 'LInC One',
  icon,
  aside,
  compact = false,
}: LincPageHeroProps) {
  return (
    <motion.header
      data-tutorial-id="page-title"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`linc-page-hero relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#1b0d0d] text-white shadow-[0_28px_80px_rgba(40,10,10,0.2)] ${
        compact ? 'px-6 py-7 md:px-9 md:py-8' : 'px-6 py-9 md:px-12 md:py-12'
      }`}
    >
      <div className="linc-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#8f2424]/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#f2a900]/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-5 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.34em] text-[#f4c95d]">
            {icon && (
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-inner shadow-white/5">
                {icon}
              </span>
            )}
            <span>{eyebrow}</span>
          </div>
          <h1 className={`${compact ? 'text-[clamp(2.25rem,6vw,4.4rem)]' : 'text-[clamp(2.7rem,7vw,5.7rem)]'} max-w-5xl font-serif font-semibold leading-[0.9] tracking-[-0.045em] text-[#fffaf1]`}>
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-3xl text-[clamp(0.98rem,2vw,1.16rem)] font-medium leading-relaxed text-stone-300">
              {description}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </motion.header>
  );
}
