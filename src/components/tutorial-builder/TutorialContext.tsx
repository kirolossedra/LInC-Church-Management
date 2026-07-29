import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useLocation, useNavigate } from 'react-router-dom';

import { auth } from '../../firebase';

import {
  deleteTutorial as deleteTutorialFromFirebase,
  duplicateTutorial as duplicateTutorialInFirebase,
  markTutorialCompleted,
  markTutorialStarted,
  saveTutorial as saveTutorialToFirebase,
  setTutorialPublished,
  subscribeToTutorialProgress,
  subscribeToTutorials,
  updateTutorialProgress,
} from './tutorialBuilder.firebase';

import type {
  Tutorial,
  TutorialAudience,
  TutorialDraft,
  TutorialProgress,
  TutorialSimulationState,
} from './tutorialBuilder.types';

import { validateTutorialDraft } from './tutorialBuilder.utils';
import TutorialPlayer from './TutorialPlayer';
import TutorialSimulationLayer from './TutorialSimulationLayer';

interface TutorialContextValue {
  tutorials: Tutorial[];
  tutorialsLoading: boolean;
  progress: Record<string, TutorialProgress>;
  activeTutorial: Tutorial | null;
  previewMode: boolean;
  simulation: TutorialSimulationState | null;
  startTutorial: (
    tutorial: Tutorial,
    preview?: boolean,
    initialStepIndex?: number,
  ) => Promise<void>;
  stopTutorial: () => void;
  saveTutorial: (draft: TutorialDraft) => Promise<string>;
  deleteTutorial: (tutorial: Tutorial) => Promise<void>;
  duplicateTutorial: (tutorial: Tutorial) => Promise<string>;
  toggleTutorialPublished: (tutorial: Tutorial) => Promise<void>;
  getPublishedTutorials: (audience: TutorialAudience) => Tutorial[];
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, TutorialProgress>>({});
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [simulation, setSimulation] = useState<TutorialSimulationState | null>(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [initialStepIndex, setInitialStepIndex] = useState(0);

  useEffect(() => {
    setTutorialsLoading(true);

    return subscribeToTutorials(
      loadedTutorials => {
        setTutorials(loadedTutorials);
        setTutorialsLoading(false);
      },
      () => setTutorialsLoading(false),
    );
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProgress({});
      return undefined;
    }

    return subscribeToTutorialProgress(user.uid, setProgress);
  }, [user?.uid]);

  const stopTutorial = useCallback(() => {
    setActiveTutorial(null);
    setPreviewMode(false);
    setSimulation(null);
    setInitialStepIndex(0);
  }, []);

  const startTutorial = useCallback(
    async (
      tutorial: Tutorial,
      preview = false,
      requestedStepIndex = 0,
    ) => {
      if (tutorial.steps.length === 0) {
        throw new Error('This tutorial has no steps.');
      }

      const safeInitialStepIndex = Math.min(
        Math.max(0, requestedStepIndex),
        tutorial.steps.length - 1,
      );

      setSimulation(null);
      setPreviewMode(preview);
      setInitialStepIndex(safeInitialStepIndex);
      setActiveTutorial(tutorial);
      setPlayerKey(previous => previous + 1);

      if (!preview && user?.uid) {
        await markTutorialStarted(user.uid, tutorial.id);
      }
    },
    [user?.uid],
  );

  const saveTutorial = useCallback(
    async (draft: TutorialDraft) => {
      const validationErrors = validateTutorialDraft(draft);

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      return saveTutorialToFirebase({
        id: draft.id,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        audience: draft.audience,
        published: draft.published,
        steps: draft.steps,
        createdBy: user?.email || user?.uid || 'pastor',
      });
    },
    [user?.email, user?.uid],
  );

  const deleteTutorial = useCallback(async (tutorial: Tutorial) => {
    await deleteTutorialFromFirebase(tutorial.id);

    setActiveTutorial(current =>
      current?.id === tutorial.id ? null : current,
    );
  }, []);

  const duplicateTutorial = useCallback(
    async (tutorial: Tutorial) =>
      duplicateTutorialInFirebase(
        tutorial,
        user?.email || user?.uid || 'pastor',
      ),
    [user?.email, user?.uid],
  );

  const toggleTutorialPublished = useCallback(
    async (tutorial: Tutorial) => {
      await setTutorialPublished(tutorial.id, !tutorial.published);
    },
    [],
  );

  const getPublishedTutorials = useCallback(
    (audience: TutorialAudience) =>
      tutorials.filter(tutorial => {
        if (!tutorial.published) {
          return false;
        }

        if (tutorial.audience === 'all') {
          return true;
        }

        if (audience === 'superadmin') {
          return (
            tutorial.audience === 'superadmin' ||
            tutorial.audience === 'pastor'
          );
        }

        return tutorial.audience === audience;
      }),
    [tutorials],
  );

  const handleStepChange = useCallback(
    async (stepIndex: number) => {
      if (
        previewMode ||
        !user?.uid ||
        !activeTutorial?.id
      ) {
        return;
      }

      await updateTutorialProgress(
        user.uid,
        activeTutorial.id,
        stepIndex,
      );
    },
    [activeTutorial?.id, previewMode, user?.uid],
  );

  const handleComplete = useCallback(async () => {
    if (!previewMode && user?.uid && activeTutorial?.id) {
      await markTutorialCompleted(user.uid, activeTutorial.id);
    }

    stopTutorial();
  }, [activeTutorial?.id, previewMode, stopTutorial, user?.uid]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      tutorials,
      tutorialsLoading,
      progress,
      activeTutorial,
      previewMode,
      simulation,
      startTutorial,
      stopTutorial,
      saveTutorial,
      deleteTutorial,
      duplicateTutorial,
      toggleTutorialPublished,
      getPublishedTutorials,
    }),
    [
      activeTutorial,
      deleteTutorial,
      duplicateTutorial,
      getPublishedTutorials,
      previewMode,
      progress,
      saveTutorial,
      simulation,
      startTutorial,
      stopTutorial,
      toggleTutorialPublished,
      tutorials,
      tutorialsLoading,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {activeTutorial && (
        <TutorialPlayer
          key={`${activeTutorial.id}-${playerKey}`}
          tutorial={activeTutorial}
          preview={previewMode}
          initialStepIndex={initialStepIndex}
          currentPath={`${location.pathname}${location.search}`}
          navigate={navigate}
          onSimulationChange={setSimulation}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          onStop={stopTutorial}
        />
      )}
      <TutorialSimulationLayer simulation={simulation} preview={previewMode} />
    </TutorialContext.Provider>
  );
}

export function useTutorials(): TutorialContextValue {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error('useTutorials must be used within TutorialProvider.');
  }

  return context;
}
