import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { database } from '../../firebase';
import LincLogo from '../brand/LincLogo';

interface CommunityCarouselProps { isAr: boolean; dir: 'ltr' | 'rtl' }
interface CarouselPhoto { id: string; url: string; altEn: string; altAr: string; order: number }

function normalizeImageSource(value: string) {
  const source = value.trim();
  if (!source) return '';
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(source) || /^(https?:|blob:|\/)/i.test(source)) return source;
  const compact = source.replace(/\s/g, '');
  return compact.length >= 32 && /^[a-z0-9+/]+={0,2}$/i.test(compact) ? `data:image/jpeg;base64,${compact}` : source;
}

function normalizePhotos(value: unknown): CarouselPhoto[] {
  if (!value || typeof value !== 'object') return [];
  const entries = Array.isArray(value) ? value.map((photo, index) => [String(index), photo] as const) : Object.entries(value as Record<string, unknown>);
  return entries.map(([id, raw], index): CarouselPhoto | null => {
    if (typeof raw === 'string') {
      const url = normalizeImageSource(raw);
      return url ? { id, url, altEn: 'LINC community', altAr: 'مجتمع LINC', order: index } : null;
    }
    if (!raw || typeof raw !== 'object') return null;
    const photo = raw as Record<string, unknown>;
    const url = normalizeImageSource(String(photo.url || photo.dataUrl || ''));
    if (!url) return null;
    return {
      id, url,
      altEn: String(photo.altEn || 'LINC community').trim(),
      altAr: String(photo.altAr || 'مجتمع LINC').trim(),
      order: typeof photo.order === 'number' && Number.isFinite(photo.order) ? photo.order : index,
    };
  }).filter((photo): photo is CarouselPhoto => Boolean(photo)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export default function CommunityCarousel({ isAr, dir }: CommunityCarouselProps) {
  const [enabled, setEnabled] = useState(true);
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const slides = photos.length || 3;

  useEffect(() => onValue(ref(database, 'landingPage/carousel'), snapshot => {
    const value = snapshot.val() as { enabled?: boolean; photos?: unknown } | null;
    const nextPhotos = normalizePhotos(value?.photos);
    setEnabled(value?.enabled !== false);
    setPhotos(nextPhotos);
    setActive(current => current < (nextPhotos.length || 3) ? current : 0);
  }, error => console.error('Failed to load the landing-page carousel:', error)), []);

  useEffect(() => {
    if (!enabled || paused || slides <= 1 || prefersReducedMotion) return undefined;
    const timer = window.setInterval(() => { setDirection(1); setActive(current => (current + 1) % slides); }, 4_500);
    return () => window.clearInterval(timer);
  }, [enabled, paused, prefersReducedMotion, slides]);

  if (!enabled) return null;

  const move = (step: number) => {
    setDirection(step);
    setActive(current => (current + step + slides) % slides);
  };
  const photo = photos[active];

  return (
    <section className="relative overflow-hidden bg-[#f5f1e9] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.72fr_1fr]">
        <motion.div initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#a12a24]">{isAr ? 'مجتمعنا' : 'Our community'}</p>
          <h2 className="mt-5 font-serif text-[clamp(3.2rem,7vw,6.5rem)] font-semibold leading-[0.86] tracking-[-0.055em] text-[#681919]">
            {isAr ? 'الحياة والخدمة، معاً.' : 'Life and ministry, together.'}
          </h2>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#665954]">
            {isAr ? 'LINC One يجمع البرامج والأشخاص والخطوات التالية في مساحة واحدة واضحة.' : 'LINC One brings programs, people, and practical next steps together in one clear space.'}
          </p>
        </motion.div>

        <div className="relative mx-auto w-full max-w-[590px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
          <div className="absolute -inset-5 rotate-3 rounded-[3rem] bg-[#f2a900]/30" />
          <div className="absolute -inset-3 -rotate-2 rounded-[3rem] bg-[#8b1e1e]/15" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-[#ddd0bd] shadow-[0_35px_90px_rgba(83,46,25,0.2)]">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.div
                key={photo?.id || `placeholder-${active}`}
                custom={direction}
                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : direction * 60, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : direction * -60, scale: 0.97 }}
                transition={{ duration: prefersReducedMotion ? 0.15 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {photo ? (
                  <img src={photo.url} alt={isAr ? photo.altAr : photo.altEn} className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${active === 0 ? 'from-[#8b1e1e] to-[#b54835]' : active === 1 ? 'from-[#f2a900] to-[#ffe3a0]' : 'from-[#d8c4ab] to-[#f4eadb]'}`}>
                    <div className="linc-grid h-full w-full opacity-30" />
                    <span className="absolute inset-0 grid place-items-center"><LincLogo size={128} className="rounded-full opacity-35 shadow-2xl" /></span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button type="button" onClick={() => move(-1)} aria-label={isAr ? 'الصورة السابقة' : 'Previous photo'} className="absolute -left-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-[#761b1b] shadow-xl transition hover:scale-110 sm:-left-6">
            {dir === 'rtl' ? <ChevronRight size={21} /> : <ChevronLeft size={21} />}
          </button>
          <button type="button" onClick={() => move(1)} aria-label={isAr ? 'الصورة التالية' : 'Next photo'} className="absolute -right-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-[#761b1b] shadow-xl transition hover:scale-110 sm:-right-6">
            {dir === 'rtl' ? <ChevronLeft size={21} /> : <ChevronRight size={21} />}
          </button>

          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: slides }, (_, index) => (
              <button key={index} type="button" onClick={() => { setDirection(index > active ? 1 : -1); setActive(index); }} aria-label={`${isAr ? 'الصورة' : 'Photo'} ${index + 1}`} aria-current={active === index ? 'true' : undefined} className={`h-2 rounded-full transition-all ${active === index ? 'w-9 bg-[#8b1e1e]' : 'w-2 bg-[#8b1e1e]/20 hover:bg-[#8b1e1e]/45'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
