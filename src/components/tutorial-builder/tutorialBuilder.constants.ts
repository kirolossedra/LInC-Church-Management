import type {
  TutorialAudience,
  TutorialPlacement,
  TutorialStepAction,
} from './tutorialBuilder.types';

export const TUTORIALS_PATH = 'tutorialBuilder/tutorials';
export const TUTORIAL_PROGRESS_PATH = 'tutorialBuilder/progress';

export const TUTORIAL_AUDIENCES: readonly TutorialAudience[] = [
  'all',
  'pastor',
  'superadmin',
  'congregation',
];

export const TUTORIAL_STEP_ACTIONS: readonly TutorialStepAction[] = [
  'explain',
  'simulate-click',
  'navigate',
  'information',
];

export const TUTORIAL_PLACEMENTS: readonly TutorialPlacement[] = [
  'auto',
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
  'center',
];

export const TUTORIAL_INTERACTIVE_SELECTOR = [
  '[data-tutorial-id]',
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const TUTORIAL_BUILDER_EXCLUSION_SELECTOR = [
  '[data-tutorial-builder-root="true"]',
  '[data-tutorial-player-ui="true"]',
  '[aria-hidden="true"]',
  '[disabled]',
].join(',');
