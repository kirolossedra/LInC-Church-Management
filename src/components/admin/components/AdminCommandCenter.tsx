import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Crown, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import LincLogo from '../../brand/LincLogo';

export type AdminSectionId =
  | 'overview'
  | 'hierarchy'
  | 'assessment'
  | 'carousel'
  | 'about'
  | 'attendance'
  | 'nextgen-qa'
  | 'people-access'
  | 'archives'
  | 'audit';

export interface AdminArea {
  id: AdminSectionId;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export function AdminCommandHeader({
  isChief,
  email,
  areaCount,
  onLogout,
}: {
  isChief: boolean;
  email: string;
  areaCount: number;
  onLogout: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <header className="relative isolate overflow-hidden bg-[#160c0c] px-5 pb-28 pt-5 text-white sm:px-8 sm:pb-32 sm:pt-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="linc-grid absolute inset-0 opacity-[0.08]" />
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [0, 55, -20, 0], y: [0, -25, 16, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-32 -top-52 h-[34rem] w-[34rem] rounded-full bg-[#a82b25]/35 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [0, -30, 15, 0], y: [0, 18, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-52 left-1/4 h-80 w-80 rounded-full bg-[#f2a900]/16 blur-3xl"
        />
      </div>

      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href="/" className="group inline-flex items-center gap-3" aria-label="LINC One home">
          <LincLogo
            size={44}
            className="rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:rotate-3 group-hover:scale-105"
          />
          <span>
            <span className="block font-serif text-xl font-bold leading-none">LINC One</span>
            <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.22em] text-white/35">Administration</span>
          </span>
        </a>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-xs font-extrabold text-white/75 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12 hover:text-white"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </nav>

      <div className="relative mx-auto mt-16 grid max-w-7xl items-end gap-10 lg:grid-cols-[1fr_0.55fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#f2a900]">
            <LincLogo size={18} className="rounded-full" /> LInC command center
          </p>
          <h1 className="mt-5 max-w-5xl font-serif text-[clamp(4rem,10vw,8.5rem)] font-semibold leading-[0.78] tracking-[-0.07em]">
            Lead with
            <span className="block ps-[0.16em] text-[#c53b33]">clarity<span className="text-[#f2a900]">.</span></span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/52 sm:text-lg">
            One deliberate workspace for ministry administration, people, content, and institutional memory.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.16, duration: 0.7 }}
          className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${isChief ? 'bg-[#f2a900] text-[#2c1805]' : 'bg-[#8b2823] text-white'}`}>
              {isChief ? <Crown size={22} /> : <ShieldCheck size={22} />}
            </span>
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/35">Signed in as</span>
              <span className="mt-1 block text-sm font-extrabold text-white">{isChief ? 'Chief Administrator' : 'Administrator'}</span>
            </span>
          </div>
          <p className="mt-6 break-all text-sm font-semibold text-white/58">{email}</p>
          <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
            <span>
              <span className="block font-serif text-4xl font-semibold">{areaCount}</span>
              <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.17em] text-white/35">Available areas</span>
            </span>
            <span className="rounded-full bg-emerald-400/12 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">Active session</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

export function AdminAreaNavigation({
  areas,
  activeSection,
  onSelect,
}: {
  areas: AdminArea[];
  activeSection: AdminSectionId;
  onSelect: (section: AdminSectionId) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const activeArea = areas.find(area => area.id === activeSection) ?? areas[0];

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectArea = (section: AdminSectionId) => {
    onSelect(section);
    setIsOpen(false);
  };

  return (
    <>
      <nav aria-label="Administrator areas" className="relative z-20 mx-auto -mt-20 max-w-7xl px-5 sm:px-8">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="group mx-auto flex min-h-16 w-full max-w-xl items-center justify-between gap-4 rounded-[2rem] border border-[#7a1b1b]/10 bg-[#f7f2e9]/95 px-4 py-3 text-left shadow-[0_24px_70px_rgba(61,24,17,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#761b1b] text-white shadow-[0_8px_24px_rgba(118,27,27,0.2)]">
              {activeArea ? <activeArea.icon size={19} /> : <Menu size={19} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#a12a24]">Administrator wheel</span>
              <span className="mt-0.5 block truncate font-serif text-xl font-semibold text-[#5f1919]">{activeArea?.label ?? 'Choose area'}</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#eadfd1] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6a4f48] transition group-hover:bg-[#761b1b] group-hover:text-white">
            <Menu size={14} />
            <span className="hidden xs:inline">Open wheel</span>
          </span>
        </button>
      </nav>

      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Choose administrator area"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#100909]/72 px-2 py-4 backdrop-blur-2xl sm:px-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,169,0,0.08),transparent_38%),radial-gradient(circle_at_center,transparent_0,rgba(38,12,12,0.24)_58%,rgba(9,4,4,0.72)_100%)]" />

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/25 text-white/70 backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:right-7 sm:top-7"
            aria-label="Close administrator wheel"
          >
            <X size={19} />
          </button>

          <div className="relative h-[min(92vw,760px)] w-[min(92vw,760px)] max-h-[82vh] max-w-[82vh]">
            <div className="pointer-events-none absolute inset-[12%] rounded-full border border-white/10 bg-black/20 shadow-[0_0_90px_rgba(0,0,0,0.42),inset_0_0_80px_rgba(255,255,255,0.025)] backdrop-blur-md" />
            <div className="pointer-events-none absolute inset-[28%] rounded-full border border-[#f2a900]/25 bg-[#1d0d0d]/75 shadow-[0_0_80px_rgba(118,27,27,0.28)]" />

            {areas.map(({ id, label, eyebrow, icon: Icon }, index) => {
              const angle = -90 + (360 / areas.length) * index;
              const radians = (angle * Math.PI) / 180;
              const radius = 39;
              const left = 50 + Math.cos(radians) * radius;
              const top = 50 + Math.sin(radians) * radius;
              const active = id === activeSection;

              return (
                <motion.div
                  key={id}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.78 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: prefersReducedMotion ? 0 : index * 0.025, duration: 0.22 }}
                  className="absolute z-10"
                  style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <button
                    type="button"
                    onClick={() => selectArea(id)}
                    className={`group flex h-[4.7rem] w-[5.7rem] flex-col items-center justify-center rounded-[1.45rem] border px-2 text-center shadow-2xl backdrop-blur-xl transition duration-200 sm:h-[5.8rem] sm:w-[7.4rem] sm:rounded-[1.8rem] ${
                      active
                        ? 'border-[#f2a900]/70 bg-[#761b1b]/95 text-white shadow-[0_0_32px_rgba(242,169,0,0.2)]'
                        : 'border-white/12 bg-[#211515]/88 text-white/72 hover:-translate-y-1 hover:border-white/25 hover:bg-[#3a1717]/95 hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={20} className={active ? 'text-[#f2a900]' : 'text-white/70 group-hover:text-[#f2a900]'} />
                    <span className="mt-1.5 line-clamp-2 text-[9px] font-extrabold leading-tight sm:text-[11px]">{label}</span>
                    <span className="mt-0.5 hidden text-[7px] font-bold uppercase tracking-[0.09em] text-white/35 sm:block">{eyebrow}</span>
                  </button>
                </motion.div>
              );
            })}

            <div className="absolute left-1/2 top-1/2 z-10 flex h-[27%] w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#f2a900]/30 bg-[#160c0c]/95 p-3 text-center text-white shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              {activeArea && (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2a900] text-[#2b1805] sm:h-12 sm:w-12">
                  <activeArea.icon size={20} />
                </span>
              )}
              <span className="mt-2 hidden text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#f2a900] sm:block">Current area</span>
              <span className="mt-1 max-w-[9rem] font-serif text-[clamp(0.85rem,2.2vw,1.45rem)] font-semibold leading-tight">{activeArea?.label}</span>
              <span className="mt-1 hidden max-w-[10rem] text-[8px] leading-relaxed text-white/40 md:block">Choose any role around the wheel.</span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

export function AdminOverview({
  areas,
  onSelect,
}: {
  areas: AdminArea[];
  onSelect: (section: AdminSectionId) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const workAreas = areas.filter(area => area.id !== 'overview');

  return (
    <section>
      <div className="mb-8 grid items-end gap-5 lg:grid-cols-[1fr_0.58fr]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#a12a24]">Your administration</p>
          <h2 className="mt-3 max-w-4xl font-serif text-[clamp(3rem,7vw,6rem)] font-semibold leading-[0.84] tracking-[-0.055em] text-[#5f1919]">Choose where to focus.</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-stone-500 sm:text-base">
          Each area opens as a dedicated workspace. Your visible choices reflect the authority assigned to this administrator account.
        </p>
      </div>

      {workAreas.length === 0 ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
          <ShieldCheck size={30} className="mx-auto text-amber-700" />
          <h3 className="mt-4 font-serif text-3xl font-semibold text-amber-950">Awaiting an allocation.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-amber-900/65">The Chief can assign one or more administration areas to this account.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workAreas.map(({ id, label, eyebrow, description, icon: Icon, accent }, index) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : index * 0.06, duration: 0.55 }}
              whileHover={prefersReducedMotion ? undefined : { y: -8, rotate: index % 2 === 0 ? -0.35 : 0.35 }}
              className={`group flex min-h-[245px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-start shadow-[0_18px_48px_rgba(70,38,23,0.1)] ${accent}`}
            >
              <span className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/30"><Icon size={22} /></span>
                <ArrowUpRight size={20} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.19em] opacity-55">{eyebrow}</span>
                <span className="mt-2 block font-serif text-3xl font-semibold leading-none">{label}</span>
                <span className="mt-3 block text-sm leading-relaxed opacity-65">{description}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}
