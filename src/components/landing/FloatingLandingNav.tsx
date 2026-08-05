import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Info, LogIn, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FloatingLandingNavProps {
  isAr: boolean;
  visible: boolean;
}

export default function FloatingLandingNav({ isAr, visible }: FloatingLandingNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const links = [
    {
      label: isAr ? 'المواهب الروحية' : 'Spiritual Gifts',
      href: '#spiritual-gifts-program',
      icon: Sparkles,
      className: 'bg-[#f2a900] text-[#2a1806] hover:bg-[#ffc43d]',
    },
    {
      label: isAr ? 'الجيل القادم' : 'NextGen',
      to: '/nextgen-activities',
      icon: UsersRound,
      className: 'bg-white/10 text-white hover:bg-white/18',
    },
    {
      label: isAr ? 'من نحن' : 'About Us',
      to: '/about',
      icon: Info,
      className: 'bg-white/10 text-white hover:bg-white/18',
    },
    {
      label: isAr ? 'دخول الراعي' : 'Pastor Login',
      to: '/calendar',
      icon: LogIn,
      className: 'bg-white/10 text-white hover:bg-white/18',
    },
    {
      label: isAr ? 'لوحة الإدارة' : 'Administrator Panel',
      to: '/administrator',
      icon: ShieldCheck,
      className: 'bg-[#8f2824] text-white hover:bg-[#a9342e]',
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label={isAr ? 'روابط LINC One السريعة' : 'LINC One quick access'}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -86, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -64, scale: 0.97 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.16 }
              : { type: 'spring', stiffness: 390, damping: 32, mass: 0.82 }
          }
          className="pointer-events-none fixed inset-x-0 top-2 z-[70] px-2 sm:top-3 sm:px-4"
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center gap-2 overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#190d0d]/94 p-2 shadow-[0_20px_65px_rgba(50,12,12,0.38)] backdrop-blur-2xl sm:p-2.5">
            <Link
              to="/"
              aria-label="LINC One home"
              className="hidden shrink-0 items-center gap-2 px-3 text-white lg:flex"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#8b1e1e] text-[#f2a900]">✦</span>
              <span className="font-serif text-lg font-bold tracking-[-0.03em]">LINC One</span>
            </Link>

            <div className="min-w-0 flex-1 sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
              <div className="grid min-w-0 grid-cols-3 items-stretch gap-1.5 sm:flex sm:min-w-max sm:items-center sm:gap-2 lg:justify-end">
                {links.map(({ label, href, to, icon: Icon, className }) => {
                  const content = (
                    <>
                      <Icon size={15} className="shrink-0" />
                      <span className="whitespace-nowrap">{label}</span>
                    </>
                  );
                  const mobileSpan = to === '/administrator' ? 'col-span-2' : '';
                  const sharedClassName = `inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[1.1rem] px-2 text-center text-[10px] font-extrabold leading-tight transition duration-200 hover:-translate-y-0.5 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm ${mobileSpan} sm:col-span-1 ${className}`;

                  return href ? (
                    <a key={href} href={href} className={sharedClassName}>
                      {content}
                    </a>
                  ) : (
                    <Link key={to} to={to!} className={sharedClassName}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
