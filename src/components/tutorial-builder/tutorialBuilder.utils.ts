import {
  TUTORIAL_AUDIENCES,
  TUTORIAL_INTERACTIVE_SELECTOR,
  TUTORIAL_PLACEMENTS,
  TUTORIAL_STEP_ACTIONS,
} from './tutorialBuilder.constants';

import type {
  Tutorial,
  TutorialAudience,
  TutorialDraft,
  TutorialPlacement,
  TutorialStep,
  TutorialStepAction,
  TutorialTargetCandidate,
} from './tutorialBuilder.types';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return value === 'true' || value === 1;
}

function normalizeAudience(value: unknown): TutorialAudience {
  const normalized = String(value || '').trim() as TutorialAudience;
  return TUTORIAL_AUDIENCES.includes(normalized)
    ? normalized
    : 'all';
}

function normalizeAction(value: unknown): TutorialStepAction {
  const normalized = String(value || '').trim() as TutorialStepAction;
  return TUTORIAL_STEP_ACTIONS.includes(normalized)
    ? normalized
    : 'explain';
}

function normalizePlacement(value: unknown): TutorialPlacement {
  const normalized = String(value || '').trim() as TutorialPlacement;
  return TUTORIAL_PLACEMENTS.includes(normalized)
    ? normalized
    : 'bottom';
}

export function createTutorialStep(
  order: number,
  route = window.location.pathname,
): TutorialStep {
  const now = Date.now();

  return {
    id: `step-${now}-${Math.random().toString(36).slice(2, 8)}`,
    order,
    title: '',
    description: '',
    route,
    target: 'body',
    targetLabel: '',
    action: 'explain',
    placement: 'bottom',
    simulationTitle: '',
    simulationDescription: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function createTutorialDraft(): TutorialDraft {
  return {
    title: '',
    description: '',
    category: 'General',
    audience: 'all',
    published: false,
    steps: [],
  };
}

export function tutorialToDraft(tutorial: Tutorial): TutorialDraft {
  return {
    id: tutorial.id,
    title: tutorial.title,
    description: tutorial.description,
    category: tutorial.category,
    audience: tutorial.audience,
    published: tutorial.published,
    steps: tutorial.steps.map(step => ({ ...step })),
  };
}

export function normalizeTutorialStep(
  value: unknown,
  fallbackId: string,
  fallbackOrder: number,
): TutorialStep {
  const step = asRecord(value);
  const createdAt = normalizeNumber(step.createdAt) || Date.now();

  return {
    id: String(step.id || fallbackId).trim() || fallbackId,
    order: normalizeNumber(step.order) || fallbackOrder,
    title: String(step.title || '').trim(),
    description: String(step.description || '').trim(),
    route: String(step.route || '/').trim() || '/',
    target: String(step.target || 'body').trim() || 'body',
    targetLabel: String(step.targetLabel || '').trim(),
    action: normalizeAction(step.action),
    placement: normalizePlacement(step.placement),
    simulationTitle: String(step.simulationTitle || '').trim(),
    simulationDescription: String(
      step.simulationDescription || '',
    ).trim(),
    createdAt,
    updatedAt: normalizeNumber(step.updatedAt) || createdAt,
  };
}

export function normalizeTutorial(
  id: string,
  value: unknown,
): Tutorial {
  const tutorial = asRecord(value);
  const rawSteps = tutorial.steps;
  const stepValues = Array.isArray(rawSteps)
    ? rawSteps
    : Object.values(asRecord(rawSteps));

  const steps = stepValues
    .map((step, index) =>
      normalizeTutorialStep(step, `${id}-step-${index + 1}`, index + 1),
    )
    .sort((first, second) => first.order - second.order)
    .map((step, index) => ({ ...step, order: index + 1 }));

  const createdAt = normalizeNumber(tutorial.createdAt) || Date.now();

  return {
    id,
    title: String(tutorial.title || 'Untitled Tutorial').trim(),
    description: String(tutorial.description || '').trim(),
    category: String(tutorial.category || 'General').trim() || 'General',
    audience: normalizeAudience(tutorial.audience),
    published: normalizeBoolean(tutorial.published),
    steps,
    createdBy: String(tutorial.createdBy || '').trim(),
    createdAt,
    createdAtISO: String(
      tutorial.createdAtISO || new Date(createdAt).toISOString(),
    ).trim(),
    updatedAt: normalizeNumber(tutorial.updatedAt) || createdAt,
    updatedAtISO: String(
      tutorial.updatedAtISO || new Date(createdAt).toISOString(),
    ).trim(),
  };
}

export function normalizeTutorialSteps(
  steps: TutorialStep[],
): TutorialStep[] {
  return steps
    .map((step, index) => ({
      ...step,
      order: index + 1,
      updatedAt: Date.now(),
    }))
    .sort((first, second) => first.order - second.order);
}

export function validateTutorialDraft(draft: TutorialDraft): string[] {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push('Tutorial title is required.');
  }

  if (!draft.category.trim()) {
    errors.push('Tutorial category is required.');
  }

  if (draft.steps.length === 0) {
    errors.push('Add at least one tutorial step.');
  }

  draft.steps.forEach((step, index) => {
    if (!step.title.trim()) {
      errors.push(`Step ${index + 1} needs a title.`);
    }

    if (!step.description.trim()) {
      errors.push(`Step ${index + 1} needs an explanation.`);
    }

    if (step.action !== 'information' && !step.target.trim()) {
      errors.push(`Step ${index + 1} needs a target.`);
    }

    if (
      step.action === 'simulate-click' &&
      !step.simulationDescription.trim()
    ) {
      errors.push(`Step ${index + 1} needs a simulated result.`);
    }
  });

  return errors;
}

export function tutorialMatchesAudience(
  tutorial: Tutorial,
  audience: TutorialAudience,
): boolean {
  if (tutorial.audience === 'all') {
    return true;
  }

  if (audience === 'superadmin') {
    return tutorial.audience === 'superadmin' || tutorial.audience === 'pastor';
  }

  return tutorial.audience === audience;
}

export function getTutorialElementLabel(element: HTMLElement): string {
  const explicitLabel =
    element.getAttribute('data-tutorial-label') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title');

  if (explicitLabel?.trim()) {
    return explicitLabel.trim();
  }

  if (element instanceof HTMLInputElement) {
    return (
      element.labels?.[0]?.textContent ||
      element.placeholder ||
      element.name ||
      element.type ||
      'Input'
    ).trim();
  }

  if (element instanceof HTMLSelectElement) {
    return (
      element.labels?.[0]?.textContent ||
      element.name ||
      'Selection field'
    ).trim();
  }

  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  return text?.slice(0, 100) || element.tagName.toLowerCase();
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getElementPositionSelector(element: HTMLElement): string {
  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const id = current.id;

    if (id) {
      segments.unshift(`#${CSS.escape(id)}`);
      break;
    }

    const tutorialId = current.getAttribute('data-tutorial-id');

    if (tutorialId) {
      segments.unshift(
        `[data-tutorial-id="${escapeAttributeValue(tutorialId)}"]`,
      );
      break;
    }

    const parentElement: HTMLElement | null = current.parentElement;
    const currentTagName: string = current.tagName;
    const tagName = currentTagName.toLowerCase();

    if (!parentElement) {
      segments.unshift(tagName);
      break;
    }

    const sameTagSiblings: Element[] = Array.from(
      parentElement.children,
    ).filter(
      (child: Element): boolean => child.tagName === currentTagName,
    );

    const position = sameTagSiblings.indexOf(current) + 1;
    segments.unshift(`${tagName}:nth-of-type(${position})`);
    current = parentElement;
  }

  return segments.join(' > ') || 'body';
}

export function getTutorialSelector(element: HTMLElement): string {
  const tutorialId = element.getAttribute('data-tutorial-id');

  if (tutorialId) {
    return `[data-tutorial-id="${escapeAttributeValue(tutorialId)}"]`;
  }

  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  return getElementPositionSelector(element);
}

export function isTutorialCandidateVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

export function scanTutorialTargets(): TutorialTargetCandidate[] {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(TUTORIAL_INTERACTIVE_SELECTOR),
  );

  const candidates: TutorialTargetCandidate[] = [];
  const usedSelectors = new Set<string>();

  elements.forEach(element => {
    if (
      element.closest('[data-tutorial-builder-root="true"]') ||
      element.closest('[data-tutorial-player-ui="true"]') ||
      element.hasAttribute('disabled') ||
      !isTutorialCandidateVisible(element)
    ) {
      return;
    }

    const selector = getTutorialSelector(element);

    if (usedSelectors.has(selector)) {
      return;
    }

    usedSelectors.add(selector);
    candidates.push({
      selector,
      label: getTutorialElementLabel(element),
      element,
    });
  });

  return candidates;
}

export async function waitForTutorialTarget(
  selector: string,
  timeout = 4500,
): Promise<HTMLElement | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const element = document.querySelector<HTMLElement>(selector);

    if (element && isTutorialCandidateVisible(element)) {
      return element;
    }

    await new Promise(resolve => window.setTimeout(resolve, 80));
  }

  return null;
}

export function getCurrentRoute(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function getTutorialCategoryMap(
  tutorials: Tutorial[],
): Record<string, Tutorial[]> {
  return tutorials.reduce<Record<string, Tutorial[]>>((groups, tutorial) => {
    const category = tutorial.category || 'General';
    groups[category] = [...(groups[category] || []), tutorial];
    return groups;
  }, {});
}
