import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Star,
  Users,
} from 'lucide-react';

import {
  NEXTGEN_SURVEY_BINARY_QUESTIONS,
  NEXTGEN_SURVEY_RATING_QUESTIONS,
  NEXTGEN_SURVEY_RATING_VALUES,
} from './nextgen.constants';

import type {
  NextGenSurveyResultsSectionProps,
} from './nextgen.types';

import {
  formatSurveyPercentage,
  getSurveyPercentage,
} from './nextgen.utils';

function getBinaryQuestionText(
  question: (typeof NEXTGEN_SURVEY_BINARY_QUESTIONS)[number],
  locale: 'en' | 'ar',
): string {
  return locale === 'ar'
    ? question.questionAr
    : question.questionEn;
}

function getBinaryOptionText(
  question: (typeof NEXTGEN_SURVEY_BINARY_QUESTIONS)[number],
  answer: 'A' | 'B',
  locale: 'en' | 'ar',
): string {
  if (answer === 'A') {
    return locale === 'ar'
      ? question.optionAAr
      : question.optionAEn;
  }

  return locale === 'ar'
    ? question.optionBAr
    : question.optionBEn;
}

function getRatingQuestionText(
  question: (typeof NEXTGEN_SURVEY_RATING_QUESTIONS)[number],
  locale: 'en' | 'ar',
): string {
  return locale === 'ar'
    ? question.questionAr
    : question.questionEn;
}

export default function NextGenSurveyResultsSection({
  results,
  expanded,
  loading,
  error,
  locale,
  onToggleExpanded,
}: NextGenSurveyResultsSectionProps) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full flex-col gap-4 text-start sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-800">
            <BarChart3 size={18} />

            {locale === 'ar'
              ? 'نتائج استبيان جلسات NextGen'
              : 'NextGen Session Survey Results'}

            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {results.totalResponses}
            </span>
          </h3>

          <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
            {locale === 'ar'
              ? 'نتائج مجمعة فقط بدون عرض هوية المشاركين أو إجاباتهم الفردية'
              : 'Aggregate results only, without participant identities or individual answers'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Users size={13} />

            {locale === 'ar'
              ? `${results.totalResponses} استجابة`
              : `${results.totalResponses} responses`}
          </span>

          {expanded ? (
            <ChevronUp
              size={18}
              className="text-gray-500"
            />
          ) : (
            <ChevronDown
              size={18}
              className="text-gray-500"
            />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-stone-50 px-5 py-12 text-sm font-semibold text-gray-500">
              <LoaderCircle
                size={20}
                className="animate-spin"
              />

              {locale === 'ar'
                ? 'جارٍ تحميل نتائج الاستبيان...'
                : 'Loading survey results...'}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : results.totalResponses === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-stone-50 px-5 py-12 text-center text-sm text-gray-500">
              {locale === 'ar'
                ? 'لا توجد استجابات مكتملة للاستبيان حتى الآن.'
                : 'There are no completed survey responses yet.'}
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <div className="mb-4">
                  <h4 className="text-base font-black text-gray-900">
                    {locale === 'ar'
                      ? 'تفضيلات تنظيم الجلسات'
                      : 'Session Format Preferences'}
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    {locale === 'ar'
                      ? 'النسب محسوبة من عدد الإجابات المسجلة لكل سؤال.'
                      : 'Percentages are calculated from the recorded answers for each question.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {NEXTGEN_SURVEY_BINARY_QUESTIONS.map(
                    (question, index) => {
                      const aggregate =
                        results.binaryQuestions[
                          question.id
                        ];

                      const optionAPercentage =
                        getSurveyPercentage(
                          aggregate.counts.A,
                          aggregate.totalResponses,
                        );

                      const optionBPercentage =
                        getSurveyPercentage(
                          aggregate.counts.B,
                          aggregate.totalResponses,
                        );

                      return (
                        <article
                          key={question.id}
                          className="rounded-2xl border border-gray-100 bg-stone-50 p-5"
                        >
                          <div className="mb-4 flex items-start gap-3">
                            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-700 px-2 text-sm font-black text-white">
                              {index + 1}
                            </span>

                            <div className="min-w-0">
                              <h5 className="text-sm font-black leading-relaxed text-gray-900">
                                {getBinaryQuestionText(
                                  question,
                                  locale,
                                )}
                              </h5>

                              <p className="mt-1 text-xs text-gray-400">
                                {locale === 'ar'
                                  ? `${aggregate.totalResponses} إجابة`
                                  : `${aggregate.totalResponses} answers`}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {(['A', 'B'] as const).map(
                              answer => {
                                const count =
                                  aggregate.counts[
                                    answer
                                  ];

                                const percentage =
                                  answer === 'A'
                                    ? optionAPercentage
                                    : optionBPercentage;

                                return (
                                  <div
                                    key={answer}
                                    className="rounded-xl border border-gray-100 bg-white p-4"
                                  >
                                    <div className="mb-2 flex items-start justify-between gap-4">
                                      <div className="flex min-w-0 items-start gap-2">
                                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                                          {answer}
                                        </span>

                                        <span className="text-sm font-semibold leading-relaxed text-gray-700">
                                          {getBinaryOptionText(
                                            question,
                                            answer,
                                            locale,
                                          )}
                                        </span>
                                      </div>

                                      <div className="shrink-0 text-end">
                                        <div className="text-sm font-black text-emerald-800">
                                          {formatSurveyPercentage(
                                            percentage,
                                          )}
                                        </div>

                                        <div className="text-xs text-gray-400">
                                          {count}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                      <div
                                        className="h-full rounded-full bg-emerald-600 transition-all"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            Math.max(
                                              0,
                                              percentage,
                                            ),
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <h4 className="text-base font-black text-gray-900">
                    {locale === 'ar'
                      ? 'تقييم جودة الجلسات'
                      : 'Session Quality Ratings'}
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    {locale === 'ar'
                      ? 'متوسطات التقييم من 1 إلى 5 مع توزيع كل درجة.'
                      : 'Average ratings from 1 to 5 with the distribution of each score.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {NEXTGEN_SURVEY_RATING_QUESTIONS.map(
                    (question, index) => {
                      const aggregate =
                        results.pastorQualityRatings[
                          question.id
                        ];

                      return (
                        <article
                          key={question.id}
                          className="rounded-2xl border border-gray-100 bg-stone-50 p-5"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-500 px-2 text-sm font-black text-white">
                                {index + 1}
                              </span>

                              <div>
                                <h5 className="text-sm font-black leading-relaxed text-gray-900">
                                  {getRatingQuestionText(
                                    question,
                                    locale,
                                  )}
                                </h5>

                                <p className="mt-1 text-xs text-gray-400">
                                  {locale === 'ar'
                                    ? `${aggregate.totalResponses} تقييم`
                                    : `${aggregate.totalResponses} ratings`}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-amber-700">
                                <Star
                                  size={16}
                                  fill="currentColor"
                                />

                                <span className="text-xl font-black">
                                  {aggregate.average.toFixed(
                                    2,
                                  )}
                                </span>
                              </div>

                              <div className="text-xs font-bold text-amber-700">
                                {locale === 'ar'
                                  ? 'من 5'
                                  : 'out of 5'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 space-y-2">
                            {NEXTGEN_SURVEY_RATING_VALUES.map(
                              rating => {
                                const count =
                                  aggregate.counts[
                                    rating
                                  ];

                                const percentage =
                                  getSurveyPercentage(
                                    count,
                                    aggregate.totalResponses,
                                  );

                                return (
                                  <div
                                    key={rating}
                                    className="grid grid-cols-[48px_minmax(0,1fr)_72px] items-center gap-3"
                                  >
                                    <div className="flex items-center gap-1 text-xs font-black text-gray-600">
                                      {rating}

                                      <Star
                                        size={11}
                                        fill="currentColor"
                                      />
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                      <div
                                        className="h-full rounded-full bg-amber-500 transition-all"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            Math.max(
                                              0,
                                              percentage,
                                            ),
                                          )}%`,
                                        }}
                                      />
                                    </div>

                                    <div className="text-end text-xs font-bold text-gray-600">
                                      {formatSurveyPercentage(
                                        percentage,
                                      )}

                                      <span className="ms-1 text-gray-400">
                                        ({count})
                                      </span>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
