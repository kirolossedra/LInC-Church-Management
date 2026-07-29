import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Play,
  Search,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import type { TutorialAudience } from './tutorialBuilder.types';
import { getTutorialCategoryMap } from './tutorialBuilder.utils';
import { useTutorials } from './TutorialContext';

interface TutorialLibraryProps {
  audience: TutorialAudience;
  locale: 'en' | 'ar';
}

export default function TutorialLibrary({
  audience,
  locale,
}: TutorialLibraryProps) {
  const location = useLocation();
  const {
    getPublishedTutorials,
    progress,
    startTutorial,
  } = useTutorials();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableTutorials = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return getPublishedTutorials(audience)
      .filter(tutorial => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          tutorial.title,
          tutorial.description,
          tutorial.category,
        ].some(value => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => {
        const firstMatchesRoute = first.steps.some(
          step => step.route === location.pathname,
        );
        const secondMatchesRoute = second.steps.some(
          step => step.route === location.pathname,
        );

        if (firstMatchesRoute !== secondMatchesRoute) {
          return firstMatchesRoute ? -1 : 1;
        }

        return first.title.localeCompare(second.title);
      });
  }, [
    audience,
    getPublishedTutorials,
    location.pathname,
    searchTerm,
  ]);

  const categoryMap = useMemo(
    () => getTutorialCategoryMap(availableTutorials),
    [availableTutorials],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tutorial-id="open-tutorial-library"
        className="relative flex items-center gap-1 rounded-full border border-violet-300 px-3 py-1.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-50"
        title={locale === 'ar' ? 'الدروس التفاعلية' : 'Interactive Tutorials'}
      >
        <BookOpen size={14} />
        <span className="hidden lg:inline">
          {locale === 'ar' ? 'الدروس' : 'Tutorials'}
        </span>
        {availableTutorials.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-700 px-1 text-[10px] text-white">
            {availableTutorials.length}
          </span>
        )}
      </button>

      {open && (
        <div
          data-tutorial-builder-root="true"
          className="fixed inset-0 z-[13500] flex items-center justify-center bg-black/60 p-4"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-violet-200 bg-[#fffdf9] shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-violet-800 to-fuchsia-800 px-6 py-5 text-white">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/15 p-3">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {locale === 'ar' ? 'الدروس التفاعلية' : 'Interactive Tutorials'}
                  </h2>
                  <p className="mt-1 text-sm text-white/75">
                    {locale === 'ar'
                      ? 'اختر درساً لرؤية ما تفعله عناصر النظام خطوة بخطوة.'
                      : 'Choose a tutorial to see what each part of the system does, step by step.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 hover:bg-white/15"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="border-b border-violet-100 bg-white p-4 sm:px-6">
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-stone-50 px-4 py-3">
                <Search size={18} className="text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder={locale === 'ar' ? 'البحث في الدروس...' : 'Search tutorials...'}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              {availableTutorials.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50 p-10 text-center">
                  <BookOpen size={34} className="mx-auto text-violet-400" />
                  <p className="mt-3 font-bold text-violet-900">
                    {locale === 'ar'
                      ? 'لا توجد دروس منشورة لهذا الدور.'
                      : 'No published tutorials are available for this role.'}
                  </p>
                </div>
              ) : (
                Object.entries(categoryMap).map(([category, tutorials]) => (
                  <section key={category}>
                    <h3 className="mb-3 text-lg font-bold text-violet-900">
                      {category}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {tutorials.map(tutorial => {
                        const tutorialProgress = progress[tutorial.id];
                        const completed = tutorialProgress?.completed;
                        const minutes = Math.max(1, Math.ceil(tutorial.steps.length * 0.6));
                        const relevantHere = tutorial.steps.some(
                          step => step.route === location.pathname,
                        );

                        return (
                          <article
                            key={tutorial.id}
                            className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {relevantHere && (
                                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                      {locale === 'ar' ? 'لهذه الشاشة' : 'For this screen'}
                                    </span>
                                  )}
                                  {completed && (
                                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                      <CheckCircle2 size={12} />
                                      {locale === 'ar' ? 'مكتمل' : 'Completed'}
                                    </span>
                                  )}
                                </div>
                                <h4 className="mt-3 text-lg font-bold text-gray-900">
                                  {tutorial.title}
                                </h4>
                              </div>
                            </div>

                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                              {tutorial.description}
                            </p>

                            <div className="mt-4 flex items-center gap-4 text-xs font-bold text-gray-500">
                              <span>{tutorial.steps.length} {locale === 'ar' ? 'خطوة' : 'steps'}</span>
                              <span className="flex items-center gap-1">
                                <Clock3 size={14} />
                                {minutes} {locale === 'ar' ? 'دقيقة' : 'min'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                void startTutorial(tutorial, false);
                              }}
                              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-bold text-white hover:bg-violet-800"
                            >
                              <Play size={17} />
                              {completed
                                ? locale === 'ar' ? 'إعادة الدرس' : 'Replay Tutorial'
                                : locale === 'ar' ? 'بدء الدرس' : 'Start Tutorial'}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
