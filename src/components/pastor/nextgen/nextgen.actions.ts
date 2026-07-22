import {
  createNextGenRegistrationReviewLog,
  updateNextGenQuestionRecord,
  updateNextGenRegistrationRecord,
} from './nextgen.firebase';

import type {
  NextGenQuestion,
  NextGenRegistration,
  UpdateNextGenQuestionSelectionParams,
  UpdateNextGenRegistrationStatusParams,
} from './nextgen.types';

export interface NextGenRegistrationStatusUpdateResult {
  registration: NextGenRegistration;
  previousStatus: NextGenRegistration['status'];
  nextStatus: NextGenRegistration['status'];
  reviewedAt: number;
  reviewedAtISO: string;
}

export interface NextGenQuestionSelectionUpdateResult {
  question: NextGenQuestion;
  selected: boolean;
  status: string;
  updatedAt: number;
}

export async function updateNextGenRegistrationStatus(
  params: UpdateNextGenRegistrationStatusParams,
): Promise<NextGenRegistrationStatusUpdateResult> {
  const {
    registration,
    nextStatus,
    reviewedBy = 'pastorCalendar',
  } = params;

  const userId = String(
    registration.userId || '',
  )
    .trim()
    .toUpperCase();

  if (!userId) {
    throw new Error(
      'NextGen user ID is missing.',
    );
  }

  const reviewedAt = Date.now();
  const reviewedAtISO =
    new Date(reviewedAt).toISOString();

  await updateNextGenRegistrationRecord(
    userId,
    {
      status: nextStatus,
      reviewedAt,
      reviewedAtISO,
      reviewedBy,
      updatedAt: reviewedAt,
      updatedAtISO: reviewedAtISO,
    },
  );

  await createNextGenRegistrationReviewLog({
    userId,
    fullName: registration.fullName,
    email: registration.email,
    previousStatus: registration.status,
    status: nextStatus,
    reviewedBy,
    reviewedAt,
    reviewedAtISO,
  });

  const updatedRegistration: NextGenRegistration = {
    ...registration,
    userId,
    status: nextStatus,
    reviewedAt,
    reviewedAtISO,
    reviewedBy,
    updatedAt: reviewedAt,
    updatedAtISO: reviewedAtISO,
  };

  return {
    registration: updatedRegistration,
    previousStatus: registration.status,
    nextStatus,
    reviewedAt,
    reviewedAtISO,
  };
}

export async function updateNextGenQuestionSelection(
  params: UpdateNextGenQuestionSelectionParams,
): Promise<NextGenQuestionSelectionUpdateResult> {
  const {
    question,
    selected,
  } = params;

  const questionId = String(
    question.id || '',
  ).trim();

  if (!questionId) {
    throw new Error(
      'NextGen question ID is missing.',
    );
  }

  const updatedAt = Date.now();

  const status = selected
    ? 'selectedForNextGenSession'
    : 'submittedForPastorReview';

  await updateNextGenQuestionRecord(
    questionId,
    {
      status,
      selectedForNextGenSession:
        selected,
      selectedAt: selected
        ? updatedAt
        : null,
      updatedAt,
    },
  );

  const updatedQuestion: NextGenQuestion = {
    ...question,
    id: questionId,
    status,
    updatedAt,
  };

  return {
    question: updatedQuestion,
    selected,
    status,
    updatedAt,
  };
}
