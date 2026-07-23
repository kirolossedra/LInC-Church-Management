import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onValue, ref } from 'firebase/database';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import {
  ClipboardList,
  LogIn,
  ArrowRight,
  Heart,
  BookOpen,
  Users,
  Star,
  Globe,
  Calendar as CalendarIcon,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { database } from '../firebase';

type ShapeKind = 'circle' | 'blob-a' | 'blob-b' | 'hex' | 'square';
type ShapeTone = 'a' | 'b';

interface CarouselShape {
  kind: ShapeKind;
  tone: ShapeTone;
}

interface CarouselPhoto {
  id: string;
  url: string;
  altEn: string;
  altAr: string;
  order: number;
}

interface CarouselDatabaseValue {
  enabled?: boolean;
  photos?: unknown;
}

const CAROUSEL_AUTO_ADVANCE_MS = 4_500;

// Pure placeholder shapes for the carousel — no icons, no names, nothing to
// swap out later except dropping a real <img> into each tile once
// photography exists. Shape + a faint dot pattern is all invented locally.
const CAROUSEL_SHAPES: CarouselShape[] = [
  { kind: 'circle', tone: 'a' },
  { kind: 'blob-a', tone: 'b' },
  { kind: 'hex', tone: 'a' },
  { kind: 'square', tone: 'b' },
  { kind: 'blob-b', tone: 'a' },
  { kind: 'circle', tone: 'b' },
];

const SHAPE_CLASS: Record<ShapeKind, string> = {
  circle: 'rounded-full',
  'blob-a': 'rounded-[42%_58%_61%_39%/45%_41%_59%_55%]',
  'blob-b': 'rounded-[61%_39%_42%_58%/55%_59%_41%_45%]',
  hex: '',
  square: 'rounded-[28px]',
};

const TONE_CLASS: Record<ShapeTone, string> = {
  a: 'from-[#f8eeee] to-[#f5e6d8]',
  b: 'from-[#f5e6d8] to-[#efe1cf]',
};

function ShapeTile({ shape, index }: { shape: CarouselShape; index: number }) {
  const patternId = `carousel-dots-${index}`;
  const clipStyle = shape.kind === 'hex' ? { clipPath: 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)' } : undefined;

  return (
    <div
      className={`relative w-full aspect-square overflow-hidden bg-gradient-to-br ${TONE_CLASS[shape.tone]} border-2 border-dashed border-[#8b1e1e]/25 ${SHAPE_CLASS[shape.kind]}`}
      style={clipStyle}
    >
      <svg className="absolute inset-0 w-full h-full opacity-50" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#8b1e1e" fillOpacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}


function normalizeImageSource(value: string): string {
  const source = value.trim();
  if (!source) return '';

  if (
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(source) ||
    /^(https?:|blob:|\/)/i.test(source)
  ) {
    return source;
  }

  const compactBase64 = source.replace(/\s/g, '');

  if (
    compactBase64.length >= 32 &&
    /^[a-z0-9+/]+={0,2}$/i.test(compactBase64)
  ) {
    return `data:image/jpeg;base64,${compactBase64}`;
  }

  return source;
}

function normalizeCarouselPhotos(value: unknown): CarouselPhoto[] {
  if (!value || typeof value !== 'object') return [];

  const entries = Array.isArray(value)
    ? value.map((photo, index) => [String(index), photo] as const)
    : Object.entries(value as Record<string, unknown>);

  return entries
    .map(([id, rawPhoto], index): CarouselPhoto | null => {
      if (typeof rawPhoto === 'string') {
        const url = normalizeImageSource(rawPhoto);
        if (!url) return null;

        return {
          id,
          url,
          altEn: 'LINC community',
          altAr: 'مجتمع LINC',
          order: index,
        };
      }

      if (!rawPhoto || typeof rawPhoto !== 'object') return null;

      const photo = rawPhoto as Record<string, unknown>;
      const rawSource =
        typeof photo.url === 'string'
          ? photo.url
          : typeof photo.dataUrl === 'string'
            ? photo.dataUrl
            : '';
      const url = normalizeImageSource(rawSource);

      if (!url) return null;

      return {
        id,
        url,
        altEn:
          typeof photo.altEn === 'string' && photo.altEn.trim()
            ? photo.altEn.trim()
            : 'LINC community',
        altAr:
          typeof photo.altAr === 'string' && photo.altAr.trim()
            ? photo.altAr.trim()
            : 'مجتمع LINC',
        order:
          typeof photo.order === 'number' && Number.isFinite(photo.order)
            ? photo.order
            : index,
      };
    })
    .filter((photo): photo is CarouselPhoto => photo !== null)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function useDecodedImageSource(source: string): string {
  const [decodedSource, setDecodedSource] = useState(source);

  useEffect(() => {
    setDecodedSource(source);

    if (!source.startsWith('data:image/')) return;

    try {
      const commaIndex = source.indexOf(',');
      if (commaIndex < 0) return;

      const metadata = source.slice(0, commaIndex);
      const encodedData = source.slice(commaIndex + 1);
      const mimeMatch = metadata.match(/^data:(image\/[a-z0-9.+-]+);base64$/i);

      if (!mimeMatch) return;

      const binaryData = window.atob(encodedData);
      const bytes = new Uint8Array(binaryData.length);

      for (let index = 0; index < binaryData.length; index += 1) {
        bytes[index] = binaryData.charCodeAt(index);
      }

      const objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: mimeMatch[1] })
      );

      setDecodedSource(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } catch (error) {
      console.error('Failed to decode a Base64 carousel image:', error);
      setDecodedSource(source);
    }
  }, [source]);

  return decodedSource;
}

function PhotoTile({
  photo,
  index,
  isAr,
}: {
  photo: CarouselPhoto;
  index: number;
  isAr: boolean;
}) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const decodedSource = useDecodedImageSource(photo.url);

  useEffect(() => {
    setFailedToLoad(false);
  }, [decodedSource]);

  if (failedToLoad) {
    return (
      <ShapeTile
        shape={CAROUSEL_SHAPES[index % CAROUSEL_SHAPES.length]}
        index={index}
      />
    );
  }

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-[28px] bg-[#f5f4f0] border border-[#8b1e1e]/10 shadow-[0_18px_45px_rgba(73,20,20,0.14)]">
      <img
        src={decodedSource}
        alt={isAr ? photo.altAr : photo.altEn}
        loading="eager"
        decoding="async"
        onError={() => setFailedToLoad(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, dir, locale, setLocale } = useI18n();
  const [scrollY, setScrollY] = useState(0);
  const [nextGenButtonClicked, setNextGenButtonClicked] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [carouselPhotos, setCarouselPhotos] = useState<CarouselPhoto[]>([]);
  const [carouselDirection, setCarouselDirection] = useState(1);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const actionAreaRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const isAr = locale === 'ar';
  const displayFont = isAr ? "'Amiri', serif" : "'Fraunces', serif";
  const bodyFont = isAr ? "'Cairo', Tahoma, sans-serif" : "'Manrope', Arial, sans-serif";

  useEffect(() => {
    document.title = isAr ? 'تقييم المواهب الروحية - LINC' : 'LINC Spiritual Gifts Assessment';
  }, [isAr]);

  useEffect(() => {
    if (document.getElementById('linc-font-link')) return;
    const link = document.createElement('link');
    link.id = 'linc-font-link';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    const carouselRef = ref(database, 'landingPage/carousel');

    return onValue(
      carouselRef,
      (snapshot) => {
        const value = snapshot.val() as CarouselDatabaseValue | null;

        // Missing configuration keeps the current carousel visible.
        setCarouselEnabled(value?.enabled !== false);
        setCarouselPhotos(normalizeCarouselPhotos(value?.photos));
      },
      (error) => {
        console.error('Failed to load the landing-page carousel configuration:', error);

        // Database failures preserve the existing placeholder experience.
        setCarouselEnabled(true);
        setCarouselPhotos([]);
      }
    );
  }, []);

  useEffect(() => {
    const actionArea = actionAreaRef.current;
    if (!actionArea) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const hasScrolledPastActions = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        setShowFloatingActions(hasScrolledPastActions);
      },
      { threshold: 0 }
    );

    observer.observe(actionArea);
    return () => observer.disconnect();
  }, []);

  const carouselSlideCount =
    carouselPhotos.length > 0
      ? carouselPhotos.length
      : CAROUSEL_SHAPES.length;

  useEffect(() => {
    if (activeSlide >= carouselSlideCount) {
      setActiveSlide(Math.max(carouselSlideCount - 1, 0));
    }
  }, [activeSlide, carouselSlideCount]);

  useEffect(() => {
    if (
      !carouselEnabled ||
      carouselPaused ||
      carouselSlideCount <= 1 ||
      prefersReducedMotion
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCarouselDirection(1);
      setActiveSlide((current) => (current + 1) % carouselSlideCount);
    }, CAROUSEL_AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [
    carouselEnabled,
    carouselPaused,
    carouselSlideCount,
    prefersReducedMotion,
  ]);

  const goToSlide = (index: number) => {
    if (index === activeSlide) return;

    setCarouselDirection(index > activeSlide ? 1 : -1);
    setActiveSlide(index);
  };

  const goPrev = () => {
    setCarouselDirection(-1);
    setActiveSlide(
      (current) => (current - 1 + carouselSlideCount) % carouselSlideCount
    );
  };

  const goNext = () => {
    setCarouselDirection(1);
    setActiveSlide((current) => (current + 1) % carouselSlideCount);
  };

  const activeCarouselPhoto =
    carouselPhotos.length > 0 ? carouselPhotos[activeSlide] : null;
  const activeCarouselShape =
    CAROUSEL_SHAPES[activeSlide % CAROUSEL_SHAPES.length];
  const activeCarouselKey = activeCarouselPhoto
    ? `photo-${activeCarouselPhoto.id}`
    : `shape-${activeSlide}-${activeCarouselShape.kind}-${activeCarouselShape.tone}`;

  const Arrow = isAr ? <ArrowRight size={20} className="rotate-180" /> : <ArrowRight size={20} />;

  const giftAreas = [
    { en: 'Apostolic', ar: 'رسولية' },
    { en: 'Prophetic', ar: 'نبوية' },
    { en: 'Evangelistic', ar: 'تبشيرية' },
    { en: 'Pastoral', ar: 'رعوية' },
    { en: 'Teaching', ar: 'تعليم' },
  ];

  const quickLinks = [
    { icon: CalendarIcon, path: '/booking', en: 'Book a Meeting', ar: 'حجز موعد' },
    { icon: Users, path: '/group-notes', en: 'My Group Notes', ar: 'ملاحظات مجموعتي' },
    { icon: ClipboardList, path: '/attendance', en: 'Attendance', ar: 'الحضور' },
    { icon: ShieldCheck, path: '/administrator', en: 'Administrator Panel', ar: 'لوحة الإدارة' },
  ];

  const heroContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12, delayChildren: 0.05 } },
  };
  const heroItem: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const carouselSlideVariants: Variants = {
    enter: (direction: number) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : direction * 72,
      scale: prefersReducedMotion ? 1 : 0.96,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.15 : 0.55,
        ease: 'easeOut',
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : direction * -72,
      scale: prefersReducedMotion ? 1 : 0.96,
      transition: {
        duration: prefersReducedMotion ? 0.15 : 0.4,
        ease: 'easeIn',
      },
    }),
  };

  return (
    <div className="min-h-screen" dir={dir} style={{ fontFamily: bodyFont }}>
      <AnimatePresence>
        {showFloatingActions && (
          <motion.nav
            aria-label={isAr ? 'روابط سريعة' : 'Quick actions'}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -72, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -52, scale: 0.97 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 420, damping: 34, mass: 0.82 }
            }
            className="pointer-events-none fixed inset-x-0 top-2 z-50 px-2 sm:top-3 sm:px-4"
          >
            <div className="pointer-events-auto mx-auto w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#8b1e1e]/15 bg-white/90 shadow-[0_16px_48px_rgba(59,18,18,0.22)] backdrop-blur-xl">
              <div className="grid max-h-[calc(100svh-1rem)] grid-cols-2 gap-2 overflow-y-auto p-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5 sm:p-3">
                <button
                  onClick={() => navigate('/assessment')}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#8b1e1e] px-3 py-2.5 text-[12px] font-bold leading-tight text-white shadow-[0_6px_18px_rgba(139,30,30,0.22)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:min-h-[44px] sm:rounded-full sm:px-5 sm:text-sm"
                >
                  <ClipboardList size={16} className="shrink-0" />
                  <span className="min-w-0 max-w-full break-words text-center sm:whitespace-nowrap">{t('landing.takeAssessment')}</span>
                </button>

                <button
                  onClick={() => navigate('/calendar')}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 border-[#8b1e1e] bg-white px-3 py-2.5 text-[12px] font-bold leading-tight text-[#8b1e1e] transition-transform hover:-translate-y-0.5 hover:bg-[#f8eeee] active:scale-[0.98] sm:min-h-[44px] sm:rounded-full sm:px-5 sm:text-sm"
                >
                  <LogIn size={16} className="shrink-0" />
                  <span className="min-w-0 max-w-full break-words text-center sm:whitespace-nowrap">{t('landing.adminLogin')}</span>
                </button>

                {quickLinks.map(({ icon: Icon, path, en, ar }) => (
                  <button
                    key={`floating-${path}`}
                    onClick={() => navigate(path)}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-stone-100 px-3 py-2.5 text-[12px] font-bold leading-tight text-[#8b1e1e] transition-transform hover:-translate-y-0.5 hover:bg-stone-200 active:scale-[0.98] sm:min-h-[44px] sm:rounded-full sm:px-5 sm:text-sm"
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="min-w-0 max-w-full break-words text-center sm:whitespace-nowrap">{isAr ? ar : en}</span>
                  </button>
                ))}

                <button
                  onMouseDown={() => setNextGenButtonClicked(true)}
                  onMouseLeave={() => setNextGenButtonClicked(false)}
                  onClick={() => {
                    setNextGenButtonClicked(true);
                    navigate('/nextgen-activities');
                  }}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-[12px] font-bold leading-tight shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] sm:min-h-[44px] sm:rounded-full sm:px-5 sm:text-sm ${
                    nextGenButtonClicked
                      ? 'border-[#641414] bg-[#641414] text-white'
                      : 'border-[#f59e0b] bg-[#fff7ed] text-[#8b1e1e] hover:bg-[#f59e0b] hover:text-white'
                  }`}
                >
                  <Sparkles size={16} className="shrink-0" />
                  <span className="min-w-0 max-w-full break-words text-center sm:whitespace-nowrap">NextGen Activities</span>
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <section className="relative min-h-[100svh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#f5f4f0]">
        {/* Ambient shapes — the same soft-blob language reappears in the
            carousel below, tying the two together */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-24 -right-16 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-[#8b1e1e]/[0.07] blur-2xl"
            style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          />
          <div
            className="absolute top-1/3 -left-20 w-52 h-52 sm:w-72 sm:h-72 rounded-full bg-[#8b1e1e]/[0.05] blur-2xl"
            style={{ transform: `translateY(${scrollY * -0.05}px)` }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 60%)',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />

        {/* Language Toggle */}
        <button
          onClick={() => setLocale(isAr ? 'en' : 'ar')}
          className={`absolute top-5 sm:top-6 ${dir === 'rtl' ? 'left-4 sm:left-6' : 'right-4 sm:right-6'} z-10 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/80 backdrop-blur-sm border border-[rgba(139,30,30,0.15)] rounded-full text-sm font-bold text-[#8b1e1e] shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95`}
        >
          <Globe size={16} />
          {isAr ? 'English' : 'العربية'}
        </button>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroContainer}
          className="relative text-center px-5 sm:px-6 max-w-4xl mx-auto pt-16 sm:pt-0"
        >
          <motion.div
            variants={heroItem}
            className="w-14 h-14 sm:w-[60px] sm:h-[60px] grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-2xl shadow-[0_8px_28px_rgba(139,30,30,0.25)]"
          >
            ✦
          </motion.div>

          <motion.h1
            variants={heroItem}
            style={{ fontFamily: displayFont }}
            className="text-[clamp(2.1rem,7vw,3.8rem)] font-bold text-[#8b1e1e] leading-[1.15] tracking-[-0.02em] mb-5 sm:mb-6"
          >
            {t('landing.title')}
            <br />
            <span className="text-[#641414]">{t('landing.subtitle')}</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="text-[#666] text-[clamp(1rem,2.8vw,1.2rem)] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          >
            {t('landing.description')}
          </motion.p>

          <motion.p
            variants={heroItem}
            className="text-[#999] uppercase tracking-[0.25em] text-xs font-bold mb-10 sm:mb-12"
          >
            {t('landing.program')}
          </motion.p>

          <div ref={actionAreaRef}>
            <motion.div variants={heroItem} className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 justify-center">
              <button
                onClick={() => navigate('/assessment')}
                className="inline-flex items-center justify-center gap-3 min-h-[56px] px-10 bg-[#8b1e1e] text-white rounded-full font-bold text-lg shadow-[0_8px_28px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(139,30,30,0.3)] active:translate-y-0 active:scale-[0.98]"
              >
                {t('landing.takeAssessment')}
                {Arrow}
              </button>
              <button
                onClick={() => navigate('/calendar')}
                className="inline-flex items-center justify-center gap-3 min-h-[56px] px-10 bg-white text-[#8b1e1e] border-2 border-[#8b1e1e] rounded-full font-bold text-lg transition-transform hover:-translate-y-[2px] hover:bg-[#f8eeee] active:translate-y-0 active:scale-[0.98]"
              >
                <LogIn size={18} />
                {t('landing.adminLogin')}
              </button>
            </motion.div>

            {/* Secondary actions — a compact grid on phones instead of
                wrapping pills, so every tap target stays the same size */}
            <motion.div variants={heroItem} className="mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-3.5 justify-center">
              {quickLinks.map(({ icon: Icon, path, en, ar }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="inline-flex items-center justify-center gap-2 min-h-[50px] px-4 sm:px-6 bg-stone-100 text-[#8b1e1e] rounded-2xl sm:rounded-full text-sm sm:text-base font-bold transition-transform hover:-translate-y-[2px] hover:bg-stone-200 active:translate-y-0 active:scale-[0.98]"
                >
                  <Icon size={17} />
                  {isAr ? ar : en}
                </button>
              ))}
              <button
                onMouseDown={() => setNextGenButtonClicked(true)}
                onMouseLeave={() => setNextGenButtonClicked(false)}
                onClick={() => {
                  setNextGenButtonClicked(true);
                  navigate('/nextgen-activities');
                }}
                className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 min-h-[50px] px-4 sm:px-6 rounded-2xl sm:rounded-full text-sm sm:text-base font-bold border-2 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(139,30,30,0.22)] active:translate-y-[1px] active:scale-[0.98] ${
                  nextGenButtonClicked
                    ? 'bg-[#641414] text-white border-[#641414]'
                    : 'bg-[#fff7ed] text-[#8b1e1e] border-[#f59e0b] hover:bg-[#f59e0b] hover:text-white hover:border-[#f59e0b] active:bg-[#641414] active:border-[#641414] active:text-white'
                }`}
              >
                <Sparkles size={17} />
                NextGen Activities
              </button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: displayFont }}
            className="text-center text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-12 sm:mb-16"
          >
            {isAr ? 'كيف يعمل' : 'How It Works'}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <ClipboardList size={30} />,
                step: '01',
                title: isAr ? 'ابدأ التقييم' : 'Take the Assessment',
                desc: isAr
                  ? 'أجب على أسئلة مدروسة حول رحلتك الإيمانية ومواهبك الروحية وشغفك بالخدمة.'
                  : 'Answer thoughtful questions about your faith journey, spiritual gifts, and ministry passions.',
                delay: 0.05,
              },
              {
                icon: <Star size={30} />,
                step: '02',
                title: isAr ? 'اكتشف مواهبك' : 'Discover Your Gifts',
                desc: isAr
                  ? 'احصل على تقرير شخصي يبرز موهبتك الروحية الأساسية والثانوية.'
                  : 'Receive a personalized report highlighting your primary and secondary spiritual gifts.',
                delay: 0.15,
              },
              {
                icon: <Heart size={30} />,
                step: '03',
                title: isAr ? 'اعثر على دعوتك' : 'Find Your Calling',
                desc: isAr
                  ? 'احصل على توصية بمجال الخدمة الذي يتوافق مع مواهبك الفريدة وشغفك.'
                  : 'Get matched with the ministry area that aligns with your unique gifts and passions.',
                delay: 0.25,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: prefersReducedMotion ? 0 : item.delay, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="relative text-center p-7 sm:p-8 rounded-[22px] bg-[#f5f4f0] border border-[rgba(139,30,30,0.08)] transition-shadow hover:shadow-[0_12px_32px_rgba(139,30,30,0.1)]"
              >
                <span
                  style={{ fontFamily: displayFont }}
                  className={`absolute top-4 ${dir === 'rtl' ? 'left-5' : 'right-5'} text-[13px] font-semibold text-[#8b1e1e]/25 tracking-widest`}
                >
                  {item.step}
                </span>
                <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-2xl bg-[#f8eeee] text-[#8b1e1e]">
                  {item.icon}
                </div>
                <h3 style={{ fontFamily: displayFont }} className="text-xl font-bold text-[#641414] mb-3">
                  {item.title}
                </h3>
                <p className="text-[#666] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 bg-[#f5f4f0]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <div className="w-12 h-12 grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-lg shadow-lg">
              <BookOpen size={20} />
            </div>
            <h2
              style={{ fontFamily: displayFont }}
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-6"
            >
              {isAr ? 'عن البرنامج' : 'About the Program'}
            </h2>
            <p className="text-[#666] text-lg leading-relaxed max-w-3xl mx-auto mb-6">
              {isAr
                ? 'صُمم تقييم المواهب الروحية لمساعدتك في تحديد نقاط قوتك التي وهبها الله لك واكتشاف أين يمكنك الخدمة بفعالية أكبر. من خلال أسئلة مدروسة تغطي خمسة مجالات للمواهب وعشرة مجالات للخدمة، ستحصل على وضوح حول دعوتك الروحية.'
                : "The LINC Spiritual Gifts Assessment is designed to help you identify your God-given strengths and discover where you can serve most effectively. Through thoughtful questions covering five gift areas and ten ministry domains, you'll gain clarity on your spiritual calling."}
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-10">
              {giftAreas.map((gift) => (
                <span
                  key={gift.en}
                  className="px-4 sm:px-5 py-2 bg-white rounded-full text-sm font-bold text-[#8b1e1e] border border-[rgba(139,30,30,0.12)] shadow-sm"
                >
                  {isAr ? gift.ar : gift.en}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {carouselEnabled && (
        <section className="overflow-hidden bg-white px-5 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-8 sm:mb-10">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#999]">
                {isAr ? 'مجتمعنا' : 'Our Community'}
              </p>
              <h2
                style={{ fontFamily: displayFont }}
                className="text-[clamp(1.5rem,3.6vw,2rem)] font-bold text-[#8b1e1e]"
              >
                {isAr ? 'حياة الخدمة معًا' : 'Ministry Life, Together'}
              </h2>
            </div>

            <div
              className="relative mx-auto flex w-full max-w-[540px] items-center justify-center px-12 sm:px-16"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
              onFocusCapture={() => setCarouselPaused(true)}
              onBlurCapture={() => setCarouselPaused(false)}
            >
              <button
                type="button"
                onClick={goPrev}
                aria-label={isAr ? 'الصورة السابقة' : 'Previous photo'}
                className="absolute left-0 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-[#8b1e1e]/20 bg-white text-[#8b1e1e] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f8eeee] hover:shadow-md active:translate-y-0"
              >
                {dir === 'rtl' ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronLeft size={20} />
                )}
              </button>

              <div className="w-full max-w-[400px] overflow-hidden rounded-[30px]">
                <AnimatePresence
                  initial={false}
                  mode="wait"
                  custom={carouselDirection}
                >
                  <motion.div
                    key={activeCarouselKey}
                    custom={carouselDirection}
                    variants={carouselSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="w-full"
                  >
                    {activeCarouselPhoto ? (
                      <PhotoTile
                        photo={activeCarouselPhoto}
                        index={activeSlide}
                        isAr={isAr}
                      />
                    ) : (
                      <ShapeTile
                        shape={activeCarouselShape}
                        index={activeSlide}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={goNext}
                aria-label={isAr ? 'الصورة التالية' : 'Next photo'}
                className="absolute right-0 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-[#8b1e1e]/20 bg-white text-[#8b1e1e] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f8eeee] hover:shadow-md active:translate-y-0"
              >
                {dir === 'rtl' ? (
                  <ChevronLeft size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
              </button>
            </div>

            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: carouselSlideCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`${isAr ? 'الصورة' : 'Photo'} ${index + 1}`}
                  aria-current={activeSlide === index ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSlide === index
                      ? 'w-7 bg-[#8b1e1e]'
                      : 'w-2 bg-[#8b1e1e]/20 hover:bg-[#8b1e1e]/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 sm:py-20 px-5 sm:px-6 bg-[#8b1e1e] text-white text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-full bg-white/10 text-2xl border border-white/20">
            <Users size={28} />
          </div>
          <h2 style={{ fontFamily: displayFont }} className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold mb-6">
            {t('landing.readyTitle')}
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">{t('landing.readyDesc')}</p>
          <button
            onClick={() => navigate('/assessment')}
            className="inline-flex items-center gap-3 min-h-[56px] px-12 bg-white text-[#8b1e1e] rounded-full font-bold text-lg shadow-lg transition-transform hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.98]"
          >
            {t('landing.startNow')}
            {Arrow}
          </button>
        </motion.div>
      </section>

      <footer className="py-10 px-6 bg-[#1a1a1a] text-white/60 text-center">
        <p className="text-sm italic">{t('footer.tagline')}</p>
        <p className="text-xs mt-2 text-white/30">{t('landing.program')}</p>
      </footer>

    </div>
  );
}
