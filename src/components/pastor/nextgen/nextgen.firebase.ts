import {
  onValue,
  push,
  ref,
  update,
  type Unsubscribe,
} from 'firebase/database';

import { database } from '../../../firebase';

import { NEXTGEN_SURVEY_ID } from './nextgen.constants';

import type {
  NextGenQuestion,
  NextGenRegistration,
  NextGenSurveyAggregateResults,
} from './nextgen.types';

import {
  buildNextGenSurveyAggregateResults,
  createEmptyNextGenSurveyResults,
  normalizeNextGenQuestion,
  normalizeNextGenRegistration,
  sortNextGenQuestions,
  sortNextGenRegistrations,
} from './nextgen.utils';

type FirebaseErrorHandler = (
  error: Error,
) => void;

export interface NextGenRegistrationReviewLog {
  userId: string;
  fullName: string;
  email: string;
  previousStatus: string;
  status: string;
  reviewedBy: string;
  reviewedAt: number;
  reviewedAtISO: string;
}

export function subscribeToNextGenQuestions(
  onData: (
    questions: NextGenQuestion[],
  ) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const questionsRef = ref(
    database,
    'nextGenActivities/qaSessions/',
  );

  return onValue(
    questionsRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const questions = Object.entries(
        data,
      )
        .map(([id, value]) =>
          normalizeNextGenQuestion(
            id,
            value,
          ),
        )
        .filter(question =>
          Boolean(question.question),
        );

      onData(
        sortNextGenQuestions(
          questions,
        ),
      );
    },
    error => {
      console.error(
        'Failed to load NextGen questions:',
        error,
      );

      onData([]);
      onError?.(error);
    },
  );
}

export function subscribeToNextGenRegistrations(
  onData: (
    registrations: NextGenRegistration[],
  ) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const registrationsRef = ref(
    database,
    'nextGenUsers/',
  );

  return onValue(
    registrationsRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const registrations =
        Object.entries(data)
          .map(([userId, value]) =>
            normalizeNextGenRegistration(
              userId,
              value,
            ),
          )
          .filter(registration =>
            Boolean(
              registration.userId,
            ),
          );

      onData(
        sortNextGenRegistrations(
          registrations,
        ),
      );
    },
    error => {
      console.error(
        'Failed to load NextGen registrations:',
        error,
      );

      onData([]);
      onError?.(error);
    },
  );
}

export function subscribeToNextGenSurveyResults(
  onData: (
    results: NextGenSurveyAggregateResults,
  ) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const surveyResponsesRef = ref(
    database,
    `nextGenActivities/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/`,
  );

  return onValue(
    surveyResponsesRef,
    snapshot => {
      onData(
        buildNextGenSurveyAggregateResults(
          snapshot.val(),
        ),
      );
    },
    error => {
      console.error(
        'Failed to load NextGen survey results:',
        error,
      );

      onData(
        createEmptyNextGenSurveyResults(),
      );

      onError?.(error);
    },
  );
}

export async function updateNextGenRegistrationRecord(
  userId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  const normalizedUserId =
    String(userId || '')
      .trim()
      .toUpperCase();

  if (!normalizedUserId) {
    throw new Error(
      'NextGen user ID is missing.',
    );
  }

  await update(
    ref(
      database,
      `nextGenUsers/${normalizedUserId}`,
    ),
    changes,
  );
}

export async function createNextGenRegistrationReviewLog(
  log: NextGenRegistrationReviewLog,
): Promise<string> {
  const logRef = await push(
    ref(
      database,
      'nextGenActivities/registrationReviewLogs/',
    ),
    log,
  );

  return logRef.key || '';
}

export async function updateNextGenQuestionRecord(
  questionId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  const normalizedQuestionId =
    String(questionId || '').trim();

  if (!normalizedQuestionId) {
    throw new Error(
      'NextGen question ID is missing.',
    );
  }

  await update(
    ref(
      database,
      `nextGenActivities/qaSessions/${normalizedQuestionId}`,
    ),
    changes,
  );
}
