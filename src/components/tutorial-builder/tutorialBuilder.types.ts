export type TutorialAudience =
  | 'all'
  | 'pastor'
  | 'congregation';

export type TutorialStepAction =
  | 'explain'
  | 'simulate-click'
  | 'navigate'
  | 'information';

export type TutorialPlacement =
  | 'auto'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'center';

export interface TutorialStep {
  id: string;
  order: number;
  title: string;
  description: string;
  route: string;
  target: string;
  targetLabel: string;
  action: TutorialStepAction;
  placement: TutorialPlacement;
  simulationTitle: string;
  simulationDescription: string;
  createdAt: number;
  updatedAt: number;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  audience: TutorialAudience;
  published: boolean;
  steps: TutorialStep[];
  createdBy: string;
  createdAt: number;
  createdAtISO: string;
  updatedAt: number;
  updatedAtISO: string;
}

export interface TutorialDraft {
  id?: string;
  title: string;
  description: string;
  category: string;
  audience: TutorialAudience;
  published: boolean;
  steps: TutorialStep[];
}

export interface TutorialProgress {
  tutorialId: string;
  completed: boolean;
  completedAt: number;
  completedAtISO: string;
  lastStartedAt: number;
  lastStartedAtISO: string;
  lastStepIndex: number;
}

export interface TutorialSimulationState {
  stepId: string;
  title: string;
  description: string;
  targetLabel: string;
}

export interface TutorialTargetCandidate {
  selector: string;
  label: string;
  element: HTMLElement;
}

export interface TutorialSaveInput {
  id?: string;
  title: string;
  description: string;
  category: string;
  audience: TutorialAudience;
  published: boolean;
  steps: TutorialStep[];
  createdBy: string;
}
