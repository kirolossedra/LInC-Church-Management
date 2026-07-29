import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database';

import { database } from '../../firebase';

import {
  TUTORIAL_PROGRESS_PATH,
  TUTORIALS_PATH,
} from './tutorialBuilder.constants';

import type {
  Tutorial,
  TutorialProgress,
  TutorialSaveInput,
} from './tutorialBuilder.types';

import {
  normalizeTutorial,
  normalizeTutorialSteps,
} from './tutorialBuilder.utils';

type FirebaseErrorHandler = (error: Error) => void;

export function subscribeToTutorials(
  onData: (tutorials: Tutorial[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  return onValue(
    ref(database, `${TUTORIALS_PATH}/`),
    snapshot => {
      const data = snapshot.val();

      if (!data || typeof data !== 'object') {
        onData([]);
        return;
      }

      const tutorials = Object.entries(data)
        .map(([id, value]) => normalizeTutorial(id, value))
        .sort((first, second) => second.updatedAt - first.updatedAt);

      onData(tutorials);
    },
    error => {
      console.error('Failed to load tutorials:', error);
      onData([]);
      onError?.(error);
    },
  );
}

export async function saveTutorial(
  input: TutorialSaveInput,
): Promise<string> {
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const steps = normalizeTutorialSteps(input.steps);

  if (input.id) {
    await update(ref(database, `${TUTORIALS_PATH}/${input.id}`), {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim() || 'General',
      audience: input.audience,
      published: input.published,
      steps,
      updatedAt: now,
      updatedAtISO: nowISO,
    });

    return input.id;
  }

  const tutorialRef = push(ref(database, `${TUTORIALS_PATH}/`));

  await set(tutorialRef, {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim() || 'General',
    audience: input.audience,
    published: input.published,
    steps,
    createdBy: input.createdBy,
    createdAt: now,
    createdAtISO: nowISO,
    updatedAt: now,
    updatedAtISO: nowISO,
  });

  return tutorialRef.key || '';
}

export async function deleteTutorial(tutorialId: string): Promise<void> {
  await remove(ref(database, `${TUTORIALS_PATH}/${tutorialId}`));
}

export async function setTutorialPublished(
  tutorialId: string,
  published: boolean,
): Promise<void> {
  const now = Date.now();

  await update(ref(database, `${TUTORIALS_PATH}/${tutorialId}`), {
    published,
    updatedAt: now,
    updatedAtISO: new Date(now).toISOString(),
  });
}

export async function duplicateTutorial(
  tutorial: Tutorial,
  createdBy: string,
): Promise<string> {
  return saveTutorial({
    title: `${tutorial.title} Copy`,
    description: tutorial.description,
    category: tutorial.category,
    audience: tutorial.audience,
    published: false,
    steps: tutorial.steps.map(step => ({
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    createdBy,
  });
}

export function subscribeToTutorialProgress(
  userId: string,
  onData: (progress: Record<string, TutorialProgress>) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  if (!userId) {
    onData({});
    return () => undefined;
  }

  return onValue(
    ref(database, `${TUTORIAL_PROGRESS_PATH}/${userId}/`),
    snapshot => {
      const data = snapshot.val();

      if (!data || typeof data !== 'object') {
        onData({});
        return;
      }

      onData(data as Record<string, TutorialProgress>);
    },
    error => {
      console.error('Failed to load tutorial progress:', error);
      onData({});
      onError?.(error);
    },
  );
}

export async function markTutorialStarted(
  userId: string,
  tutorialId: string,
): Promise<void> {
  if (!userId || !tutorialId) {
    return;
  }

  const now = Date.now();

  await update(
    ref(database, `${TUTORIAL_PROGRESS_PATH}/${userId}/${tutorialId}`),
    {
      tutorialId,
      lastStartedAt: now,
      lastStartedAtISO: new Date(now).toISOString(),
      lastStepIndex: 0,
    },
  );
}

export async function updateTutorialProgress(
  userId: string,
  tutorialId: string,
  lastStepIndex: number,
): Promise<void> {
  if (!userId || !tutorialId) {
    return;
  }

  await update(
    ref(database, `${TUTORIAL_PROGRESS_PATH}/${userId}/${tutorialId}`),
    { lastStepIndex },
  );
}

export async function markTutorialCompleted(
  userId: string,
  tutorialId: string,
): Promise<void> {
  if (!userId || !tutorialId) {
    return;
  }

  const now = Date.now();

  await update(
    ref(database, `${TUTORIAL_PROGRESS_PATH}/${userId}/${tutorialId}`),
    {
      tutorialId,
      completed: true,
      completedAt: now,
      completedAtISO: new Date(now).toISOString(),
      lastStepIndex: 0,
    },
  );
}
