import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  XCircle,
} from 'lucide-react';

import type {
  NextGenQuestion,
  NextGenQuestionsSectionProps,
} from './nextgen.types';

import {
  isNextGenQuestionSelected,
  sortNextGenQuestions,
} from './nextgen.utils';

function getQuestionStatusLabel(
  question: NextGenQuestion,
  locale: 'en' | 'ar',
): string {
  if (isNextGenQuestionSelected(question)) {
    return locale === 'ar'
      ? 'مختار للجلسة القادمة'
      : 'Selected for next session';
  }

  return locale === 'ar'
    ? 'بانتظار اختيار القس'
    : 'Awaiting pastor selection';
}

function getSelectionButtonLabel(
  selected: boolean,
  locale: 'en' | 'ar',
): string {
  if (selected) {
    return locale === 'ar'
      ? 'إزالة من الجلسة القادمة'
      : 'Remove from next session';
  }

  return locale === 'ar'
    ? 'اختيار للجلسة القادمة'
    : 'Select for next session';
}

export default function NextGenQuestionsSection({
  questions,
  expanded,
  loadingQuestionId,
  locale,
  onToggleExpanded,
  onSelectionChange,
}: NextGenQuestionsSectionProps) {
  const rankedQuestions =
    sortNextGenQuestions(questions);

  const selectedCount =
    rankedQuestions.filter(
      isNextGenQuestionSelected,
    ).length;

  const pendingCount =
    rankedQuestions.length -
    selectedCount;

  const handleSelectionChange = (
    question: NextGenQuestion,
  ) => {
    if (loadingQuestionId) {
      return;
    }

    void onSelectionChange(
      question,
      !isNextGenQuestionSelected(
        question,
      ),
    );
  };

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full flex-col gap-4 text-start sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-amber-700">
            <Trophy size={18} />

            {locale === 'ar'
              ? 'أسئلة NextGen حسب التصويت'
              : 'NextGen Questions Ranked by Votes'}

            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {rankedQuestions.length}
            </span>
          </h3>

          <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
            {locale === 'ar'
              ? 'الترتيب حسب صافي التصويت، ثم إجمالي التصويت الإيجابي، ثم الأقل تصويتاً سلبياً'
              : 'Sorted by net votes, then total upvotes, then fewer downvotes'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            {locale === 'ar'
              ? `المختارة: ${selectedCount}`
              : `Selected: ${selectedCount}`}
          </span>

          <span className="rounded-full border border-gray-100 bg-stone-50 px-3 py-1 text-xs font-bold text-gray-600">
            {locale === 'ar'
              ? `المتبقية: ${pendingCount}`
              : `Remaining: ${pendingCount}`}
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
        <div className="mt-5 space-y-4">
          {rankedQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-stone-50 px-5 py-10 text-center text-sm text-gray-500">
              {locale === 'ar'
                ? 'لا توجد أسئلة NextGen حتى الآن.'
                : 'There are no NextGen questions yet.'}
            </div>
          ) : (
            rankedQuestions.map(
              (question, index) => {
                const selected =
                  isNextGenQuestionSelected(
                    question,
                  );

                const isUpdating =
                  loadingQuestionId ===
                  question.id;

                return (
                  <article
                    key={question.id}
                    className={`rounded-2xl border p-5 ${
                      selected
                        ? 'border-green-200 bg-green-50/40'
                        : 'border-gray-100 bg-stone-50'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#7a1717] px-2 text-sm font-black text-white">
                            {index + 1}
                          </span>

                          <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            {question.category ||
                              (locale === 'ar'
                                ? 'أخرى'
                                : 'Other')}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${
                              selected
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : 'border-gray-200 bg-white text-gray-600'
                            }`}
                          >
                            {getQuestionStatusLabel(
                              question,
                              locale,
                            )}
                          </span>
                        </div>

                        <h4 className="break-words text-base font-black leading-relaxed text-gray-900">
                          {question.question}
                        </h4>

                        {question.notes && (
                          <p className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-white p-3 text-sm leading-relaxed text-gray-600">
                            {question.notes}
                          </p>
                        )}

                        {question.verses.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {question.verses.map(
                              (
                                verse,
                                verseIndex,
                              ) => (
                                <blockquote
                                  key={`${question.id}-${verse.reference}-${verseIndex}`}
                                  className="rounded-xl border-s-4 border-[#7a1717] bg-white px-4 py-3"
                                >
                                  {verse.reference && (
                                    <div className="mb-1 text-xs font-black text-[#7a1717]">
                                      {
                                        verse.reference
                                      }
                                    </div>
                                  )}

                                  {verse.text && (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                      {verse.text}
                                    </p>
                                  )}
                                </blockquote>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 lg:w-56">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-center">
                            <ThumbsUp
                              size={15}
                              className="mx-auto mb-1 text-green-700"
                            />

                            <div className="text-sm font-black text-green-800">
                              {
                                question.totalUpvotes
                              }
                            </div>
                          </div>

                          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                            <ThumbsDown
                              size={15}
                              className="mx-auto mb-1 text-red-700"
                            />

                            <div className="text-sm font-black text-red-800">
                              {
                                question.totalDownvotes
                              }
                            </div>
                          </div>

                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                            <Trophy
                              size={15}
                              className="mx-auto mb-1 text-amber-700"
                            />

                            <div className="text-sm font-black text-amber-800">
                              {question.netVotes}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(
                            loadingQuestionId,
                          )}
                          onClick={() =>
                            handleSelectionChange(
                              question,
                            )
                          }
                          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-[#7a1717] text-white hover:bg-[#5f1111]'
                          }`}
                        >
                          {selected ? (
                            <XCircle size={15} />
                          ) : (
                            <CheckCircle
                              size={15}
                            />
                          )}

                          {isUpdating
                            ? locale === 'ar'
                              ? 'جارٍ التحديث...'
                              : 'Updating...'
                            : getSelectionButtonLabel(
                                selected,
                                locale,
                              )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              },
            )
          )}
        </div>
      )}
    </section>
  );
}
