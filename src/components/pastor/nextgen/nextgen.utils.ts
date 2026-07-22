import {
  NEXTGEN_SURVEY_BINARY_QUESTIONS,
  NEXTGEN_SURVEY_RATING_QUESTIONS,
  NEXTGEN_SURVEY_RATING_VALUES,
} from './nextgen.constants';

import type {
  NextGenQuestion,
  NextGenRegistration,
  NextGenRegistrationStatus,
  NextGenRegistrationStatusFilter,
  NextGenSurveyAggregateResults,
  NextGenSurveyBinaryAnswer,
  NextGenSurveyRatingValue,
  NextGenVerse,
} from './nextgen.types';

export interface NextGenRegistrationDuplicateCounts {
  emailCounts: Record<string, number>;
  nameCounts: Record<string, number>;
}

function normalizeNumber(
  value: unknown,
): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function asRecord(
  value: unknown,
): Record<string, any> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, any>;
}

export function normalizeNextGenRegistrationStatus(
  value: unknown,
): NextGenRegistrationStatus {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (
    normalized === 'approved' ||
    normalized === 'rejected'
  ) {
    return normalized;
  }

  return 'pending';
}

export function normalizeNextGenRegistration(
  userId: string,
  value: unknown,
): NextGenRegistration {
  const record = asRecord(value);

  return {
    userId: String(
      record.userId ||
        record.normalizedUserId ||
        userId,
    )
      .trim()
      .toUpperCase(),

    fullName: String(
      record.fullName ||
        record.name ||
        '',
    ).trim(),

    email: String(
      record.email || '',
    ).trim(),

    status:
      normalizeNextGenRegistrationStatus(
        record.status,
      ),

    source: String(
      record.source ||
        'nextGenActivities',
    ).trim(),

    createdAt: normalizeNumber(
      record.createdAt,
    ),

    createdAtISO: String(
      record.createdAtISO || '',
    ).trim(),

    createdAtEasternTime: String(
      record.createdAtEasternTime || '',
    ).trim(),

    updatedAt: normalizeNumber(
      record.updatedAt,
    ),

    updatedAtISO: String(
      record.updatedAtISO || '',
    ).trim(),

    reviewedAt:
      normalizeNumber(
        record.reviewedAt,
      ) || undefined,

    reviewedAtISO:
      String(
        record.reviewedAtISO || '',
      ).trim() || undefined,

    reviewedBy:
      String(
        record.reviewedBy || '',
      ).trim() || undefined,
  };
}

export function normalizeDuplicateIdentityValue(
  value: string,
): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9\u0600-\u06ff]/g,
      '',
    );
}

export function normalizeNextGenQuestion(
  id: string,
  value: unknown,
): NextGenQuestion {
  const record = asRecord(value);

  const totalUpvotes =
    normalizeNumber(
      record.totalUpvotes,
    );

  const totalDownvotes =
    normalizeNumber(
      record.totalDownvotes,
    );

  const netVotes =
    typeof record.netVotes === 'number'
      ? normalizeNumber(
          record.netVotes,
        )
      : totalUpvotes -
        totalDownvotes;

  const verses: NextGenVerse[] =
    Array.isArray(record.verses)
      ? record.verses
          .map(
            (
              verse: unknown,
            ): NextGenVerse => {
              const verseRecord =
                asRecord(verse);

              return {
                reference: String(
                  verseRecord.reference ||
                    '',
                ).trim(),

                text: String(
                  verseRecord.text ||
                    '',
                ).trim(),
              };
            },
          )
          .filter(
            verse =>
              Boolean(
                verse.reference ||
                  verse.text,
              ),
          )
      : [];

  return {
    id,

    question: String(
      record.question || '',
    ).trim(),

    category: String(
      record.category || 'Other',
    ).trim(),

    verses,

    notes: String(
      record.notes || '',
    ).trim(),

    status: String(
      record.status ||
        'submittedForPastorReview',
    ).trim(),

    source: String(
      record.source ||
        'nextGenActivities',
    ).trim(),

    translation: String(
      record.translation ||
        'WEB',
    ).trim(),

    totalUpvotes,
    totalDownvotes,
    netVotes,

    createdAt: normalizeNumber(
      record.createdAt,
    ),

    updatedAt: normalizeNumber(
      record.updatedAt,
    ),
  };
}

export function sortNextGenQuestions(
  questions: NextGenQuestion[],
): NextGenQuestion[] {
  return [...questions].sort(
    (first, second) => {
      if (
        second.netVotes !==
        first.netVotes
      ) {
        return (
          second.netVotes -
          first.netVotes
        );
      }

      if (
        second.totalUpvotes !==
        first.totalUpvotes
      ) {
        return (
          second.totalUpvotes -
          first.totalUpvotes
        );
      }

      if (
        first.totalDownvotes !==
        second.totalDownvotes
      ) {
        return (
          first.totalDownvotes -
          second.totalDownvotes
        );
      }

      return (
        second.createdAt -
        first.createdAt
      );
    },
  );
}

export function isNextGenQuestionSelected(
  question: NextGenQuestion,
): boolean {
  const extendedQuestion =
    question as NextGenQuestion & {
      selectedForNextGenSession?: boolean;
    };

  return (
    question.status ===
      'selectedForNextGenSession' ||
    Boolean(
      extendedQuestion.selectedForNextGenSession,
    )
  );
}

export function getSelectedNextGenQuestions(
  questions: NextGenQuestion[],
): NextGenQuestion[] {
  return sortNextGenQuestions(
    questions,
  ).filter(
    isNextGenQuestionSelected,
  );
}

export function getSelectableNextGenQuestions(
  questions: NextGenQuestion[],
): NextGenQuestion[] {
  return sortNextGenQuestions(
    questions,
  ).filter(
    question =>
      !isNextGenQuestionSelected(
        question,
      ),
  );
}

export function sortNextGenRegistrations(
  registrations: NextGenRegistration[],
): NextGenRegistration[] {
  return [...registrations].sort(
    (first, second) => {
      if (
        second.createdAt !==
        first.createdAt
      ) {
        return (
          second.createdAt -
          first.createdAt
        );
      }

      return first.userId.localeCompare(
        second.userId,
      );
    },
  );
}

export function buildNextGenRegistrationDuplicateCounts(
  registrations: NextGenRegistration[],
): NextGenRegistrationDuplicateCounts {
  const emailCounts: Record<
    string,
    number
  > = {};

  const nameCounts: Record<
    string,
    number
  > = {};

  registrations.forEach(
    registration => {
      const normalizedEmail =
        registration.email
          .trim()
          .toLowerCase();

      const normalizedName =
        normalizeDuplicateIdentityValue(
          registration.fullName,
        );

      if (normalizedEmail) {
        emailCounts[
          normalizedEmail
        ] =
          (
            emailCounts[
              normalizedEmail
            ] || 0
          ) + 1;
      }

      if (normalizedName) {
        nameCounts[
          normalizedName
        ] =
          (
            nameCounts[
              normalizedName
            ] || 0
          ) + 1;
      }
    },
  );

  return {
    emailCounts,
    nameCounts,
  };
}

export function nextGenRegistrationHasDuplicate(
  registration: NextGenRegistration,
  duplicateCounts: NextGenRegistrationDuplicateCounts,
): boolean {
  const normalizedEmail =
    registration.email
      .trim()
      .toLowerCase();

  const normalizedName =
    normalizeDuplicateIdentityValue(
      registration.fullName,
    );

  return Boolean(
    (
      normalizedEmail &&
      duplicateCounts.emailCounts[
        normalizedEmail
      ] > 1
    ) ||
      (
        normalizedName &&
        duplicateCounts.nameCounts[
          normalizedName
        ] > 1
      ),
  );
}

export function getDuplicateNextGenRegistrations(
  registrations: NextGenRegistration[],
): NextGenRegistration[] {
  const duplicateCounts =
    buildNextGenRegistrationDuplicateCounts(
      registrations,
    );

  return registrations.filter(
    registration =>
      nextGenRegistrationHasDuplicate(
        registration,
        duplicateCounts,
      ),
  );
}

export function getNextGenRegistrationsByStatus(
  registrations: NextGenRegistration[],
  status: NextGenRegistrationStatus,
): NextGenRegistration[] {
  return registrations.filter(
    registration =>
      registration.status === status,
  );
}

export function filterAndSortNextGenRegistrations(
  registrations: NextGenRegistration[],
  searchTerm: string,
  statusFilter: NextGenRegistrationStatusFilter,
): NextGenRegistration[] {
  const normalizedSearch =
    searchTerm
      .trim()
      .toLowerCase();

  const duplicateCounts =
    buildNextGenRegistrationDuplicateCounts(
      registrations,
    );

  const statusOrder: Record<
    NextGenRegistrationStatus,
    number
  > = {
    pending: 0,
    approved: 1,
    rejected: 2,
  };

  return registrations
    .filter(registration => {
      if (
        statusFilter !== 'all' &&
        registration.status !==
          statusFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        registration.userId,
        registration.fullName,
        registration.email,
        registration.status,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(
            normalizedSearch,
          ),
      );
    })
    .sort((first, second) => {
      const duplicateDifference =
        Number(
          nextGenRegistrationHasDuplicate(
            second,
            duplicateCounts,
          ),
        ) -
        Number(
          nextGenRegistrationHasDuplicate(
            first,
            duplicateCounts,
          ),
        );

      if (
        duplicateDifference !== 0
      ) {
        return duplicateDifference;
      }

      const statusDifference =
        statusOrder[first.status] -
        statusOrder[second.status];

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      if (
        second.createdAt !==
        first.createdAt
      ) {
        return (
          second.createdAt -
          first.createdAt
        );
      }

      return first.userId.localeCompare(
        second.userId,
      );
    });
}

export function createEmptyNextGenSurveyResults(): NextGenSurveyAggregateResults {
  return {
    totalResponses: 0,

    binaryQuestions: {
      questionAnnouncement: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      postSessionMaterials: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      categoryStructure: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      subtopicStructure: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      sessionBalance: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      answerDepth: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      questionSelection: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },

      summaryLength: {
        totalResponses: 0,
        counts: {
          A: 0,
          B: 0,
        },
      },
    },

    pastorQualityRatings: {
      pastorClarity: {
        totalResponses: 0,

        counts: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },

        average: 0,
      },

      pastorDepth: {
        totalResponses: 0,

        counts: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },

        average: 0,
      },

      pastorEngagement: {
        totalResponses: 0,

        counts: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },

        average: 0,
      },
    },
  };
}

export function normalizeSurveyBinaryAnswer(
  value: unknown,
): NextGenSurveyBinaryAnswer | '' {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  return (
    normalized === 'A' ||
    normalized === 'B'
  )
    ? normalized
    : '';
}

export function normalizeSurveyRating(
  value: unknown,
): NextGenSurveyRatingValue | 0 {
  const parsedValue = Number(value);

  if (
    parsedValue === 1 ||
    parsedValue === 2 ||
    parsedValue === 3 ||
    parsedValue === 4 ||
    parsedValue === 5
  ) {
    return parsedValue;
  }

  return 0;
}

export function buildNextGenSurveyAggregateResults(
  rawResponses: unknown,
): NextGenSurveyAggregateResults {
  const results =
    createEmptyNextGenSurveyResults();

  if (
    !rawResponses ||
    typeof rawResponses !== 'object' ||
    Array.isArray(rawResponses)
  ) {
    return results;
  }

  Object.values(
    rawResponses as Record<
      string,
      unknown
    >,
  ).forEach(rawResponse => {
    const response =
      asRecord(rawResponse);

    if (
      Object.keys(response).length === 0
    ) {
      return;
    }

    const completionStatus =
      String(
        response.completionStatus ||
          '',
      )
        .trim()
        .toLowerCase();

    if (
      completionStatus &&
      completionStatus !==
        'completed'
    ) {
      return;
    }

    results.totalResponses += 1;

    NEXTGEN_SURVEY_BINARY_QUESTIONS.forEach(
      question => {
        const detailedAnswer =
          response.answerDetails
            ?.binaryQuestions
            ?.[question.id]
            ?.answer;

        const fallbackAnswer =
          response.answers
            ?.[question.id];

        const answer =
          normalizeSurveyBinaryAnswer(
            detailedAnswer ||
              fallbackAnswer,
          );

        if (!answer) {
          return;
        }

        results.binaryQuestions[
          question.id
        ].counts[answer] += 1;

        results.binaryQuestions[
          question.id
        ].totalResponses += 1;
      },
    );

    NEXTGEN_SURVEY_RATING_QUESTIONS.forEach(
      question => {
        const detailedRating =
          response.answerDetails
            ?.pastorQualityRatings
            ?.[question.id]
            ?.rating;

        const fallbackRating =
          response.answers
            ?.[question.id];

        const rating =
          normalizeSurveyRating(
            detailedRating ||
              fallbackRating,
          );

        if (!rating) {
          return;
        }

        results.pastorQualityRatings[
          question.id
        ].counts[rating] += 1;

        results.pastorQualityRatings[
          question.id
        ].totalResponses += 1;
      },
    );
  });

  NEXTGEN_SURVEY_RATING_QUESTIONS.forEach(
    question => {
      const aggregate =
        results.pastorQualityRatings[
          question.id
        ];

      const weightedTotal =
        NEXTGEN_SURVEY_RATING_VALUES.reduce(
          (sum, rating) =>
            sum +
            rating *
              aggregate.counts[
                rating
              ],
          0,
        );

      aggregate.average =
        aggregate.totalResponses > 0
          ? weightedTotal /
            aggregate.totalResponses
          : 0;
    },
  );

  return results;
}

export function getSurveyPercentage(
  count: number,
  total: number,
): number {
  if (total <= 0) {
    return 0;
  }

  return (
    count /
    total
  ) * 100;
}

export function formatSurveyPercentage(
  value: number,
): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const rounded =
    Math.round(value * 10) / 10;

  return `${
    Number.isInteger(rounded)
      ? rounded.toFixed(0)
      : rounded.toFixed(1)
  }%`;
}
