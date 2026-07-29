import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Crosshair,
  Eye,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import {
  TUTORIAL_AUDIENCES,
  TUTORIAL_PLACEMENTS,
  TUTORIAL_STEP_ACTIONS,
} from './tutorialBuilder.constants';

import type {
  Tutorial,
  TutorialDraft,
  TutorialStep,
  TutorialTargetCandidate,
} from './tutorialBuilder.types';

import {
  createTutorialDraft,
  createTutorialStep,
  getCurrentRoute,
  normalizeTutorialSteps,
  tutorialToDraft,
  validateTutorialDraft,
} from './tutorialBuilder.utils';

import TutorialTargetPicker from './TutorialTargetPicker';

interface TutorialEditorModalProps {
  open: boolean;
  tutorial: Tutorial | null;
  locale: 'en' | 'ar';
  saving: boolean;
  suspended?: boolean;
  onClose: () => void;
  onSave: (draft: TutorialDraft) => Promise<void>;
  onPreview: (
    draft: TutorialDraft,
    initialStepIndex: number,
  ) => Promise<void>;
}

function copyFor(locale: 'en' | 'ar') {
  return locale === 'ar'
    ? {
        titleNew: 'إنشاء درس تفاعلي',
        titleEdit: 'تعديل الدرس التفاعلي',
        subtitle: 'نظّم الشرح إلى خطوات وحدد ما الذي سيظهر عند محاكاة الضغط.',
        details: 'بيانات الدرس',
        title: 'العنوان',
        description: 'الوصف',
        category: 'التصنيف',
        audience: 'الجمهور',
        published: 'منشور للمستخدمين',
        steps: 'خطوات الدرس',
        addStep: 'إضافة الحركة التالية',
        addInformationStep: 'إضافة خطوة معلومات',
        noSteps: 'لا توجد خطوات بعد. أضف أول خطوة لبدء الدرس.',
        step: 'خطوة',
        stepTitle: 'عنوان الخطوة',
        explanation: 'ما الذي يفعله هذا العنصر؟',
        route: 'مسار الشاشة',
        action: 'نوع الخطوة',
        placement: 'مكان صندوق الشرح',
        target: 'هدف العنصر',
        pick: 'اختيار من الشاشة',
        targetLabel: 'اسم العنصر',
        simulationTitle: 'عنوان النتيجة المحاكية',
        simulationDescription: 'ما الذي سيحدث بعد الضغط؟',
        duplicate: 'نسخ الخطوة',
        delete: 'حذف الخطوة',
        preview: 'معاينة من الخطوة الحالية',
        previewFromBeginning: 'معاينة من البداية',
        save: 'حفظ الدرس',
        cancel: 'إلغاء',
        error: 'يرجى تصحيح الآتي:',
      }
    : {
        titleNew: 'Create Interactive Tutorial',
        titleEdit: 'Edit Interactive Tutorial',
        subtitle: 'Organize the explanation into steps and define what a simulated click should show.',
        details: 'Tutorial Details',
        title: 'Title',
        description: 'Description',
        category: 'Category',
        audience: 'Audience',
        published: 'Published for users',
        steps: 'Tutorial Steps',
        addStep: 'Add Next Move',
        addInformationStep: 'Add Information Step',
        noSteps: 'No steps yet. Add the first step to begin the tutorial.',
        step: 'Step',
        stepTitle: 'Step title',
        explanation: 'What does this element do?',
        route: 'Screen route',
        action: 'Step type',
        placement: 'Tooltip placement',
        target: 'Element target',
        pick: 'Pick from screen',
        targetLabel: 'Element name',
        simulationTitle: 'Simulated result title',
        simulationDescription: 'What happens after clicking?',
        duplicate: 'Duplicate step',
        delete: 'Delete step',
        preview: 'Preview from Current Step',
        previewFromBeginning: 'Preview from Beginning',
        save: 'Save Tutorial',
        cancel: 'Cancel',
        error: 'Please fix the following:',
      };
}

export default function TutorialEditorModal({
  open,
  tutorial,
  locale,
  saving,
  suspended = false,
  onClose,
  onSave,
  onPreview,
}: TutorialEditorModalProps) {
  const labels = useMemo(() => copyFor(locale), [locale]);
  const [draft, setDraft] = useState<TutorialDraft>(createTutorialDraft);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [targetStepId, setTargetStepId] = useState<string | null>(null);
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const targetPickerActive =
    targetStepId !== null || pendingInsertIndex !== null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextDraft = tutorial
      ? tutorialToDraft(tutorial)
      : createTutorialDraft();

    setDraft(nextDraft);
    setExpandedStepId(nextDraft.steps[0]?.id || null);
    setTargetStepId(null);
    setPendingInsertIndex(null);
    setErrors([]);
  }, [open, tutorial]);

  const updateStep = (
    stepId: string,
    updateValue: Partial<TutorialStep>,
  ) => {
    setDraft(previous => ({
      ...previous,
      steps: previous.steps.map(step =>
        step.id === stepId
          ? { ...step, ...updateValue, updatedAt: Date.now() }
          : step,
      ),
    }));
  };

  const getInsertIndexAfterCurrentStep = () => {
    const currentIndex = expandedStepId
      ? draft.steps.findIndex(step => step.id === expandedStepId)
      : -1;

    return currentIndex >= 0 ? currentIndex + 1 : draft.steps.length;
  };

  const beginAddStep = () => {
    setPendingInsertIndex(getInsertIndexAfterCurrentStep());
    setTargetStepId(null);
    setErrors([]);
  };

  const addInformationStep = () => {
    const insertIndex = getInsertIndexAfterCurrentStep();
    const step = {
      ...createTutorialStep(insertIndex + 1),
      action: 'information' as const,
      target: 'body',
      targetLabel: locale === 'ar' ? 'معلومات الصفحة' : 'Page information',
      route: getCurrentRoute(),
    };

    setDraft(previous => {
      const nextSteps = [...previous.steps];
      nextSteps.splice(insertIndex, 0, step);

      return {
        ...previous,
        steps: normalizeTutorialSteps(nextSteps),
      };
    });
    setExpandedStepId(step.id);
    setErrors([]);
  };

  const deleteStep = (stepId: string) => {
    setDraft(previous => ({
      ...previous,
      steps: normalizeTutorialSteps(
        previous.steps.filter(step => step.id !== stepId),
      ),
    }));
    setExpandedStepId(previous =>
      previous === stepId ? null : previous,
    );
  };

  const duplicateStep = (step: TutorialStep) => {
    const now = Date.now();
    const duplicate: TutorialStep = {
      ...step,
      id: `step-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${step.title} Copy`,
      createdAt: now,
      updatedAt: now,
    };

    const index = draft.steps.findIndex(item => item.id === step.id);
    const nextSteps = [...draft.steps];
    nextSteps.splice(index + 1, 0, duplicate);

    setDraft(previous => ({
      ...previous,
      steps: normalizeTutorialSteps(nextSteps),
    }));
    setExpandedStepId(duplicate.id);
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    const currentIndex = draft.steps.findIndex(step => step.id === stepId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draft.steps.length) {
      return;
    }

    const nextSteps = [...draft.steps];
    const [movedStep] = nextSteps.splice(currentIndex, 1);
    nextSteps.splice(nextIndex, 0, movedStep);

    setDraft(previous => ({
      ...previous,
      steps: normalizeTutorialSteps(nextSteps),
    }));
  };

  const handleTargetSelect = (candidate: TutorialTargetCandidate) => {
    if (pendingInsertIndex !== null) {
      const insertIndex = Math.min(
        Math.max(0, pendingInsertIndex),
        draft.steps.length,
      );
      const step = {
        ...createTutorialStep(insertIndex + 1),
        target: candidate.selector,
        targetLabel: candidate.label,
        route: getCurrentRoute(),
      };

      setDraft(previous => {
        const nextSteps = [...previous.steps];
        nextSteps.splice(insertIndex, 0, step);

        return {
          ...previous,
          steps: normalizeTutorialSteps(nextSteps),
        };
      });
      setExpandedStepId(step.id);
      setPendingInsertIndex(null);
      setTargetStepId(null);
      return;
    }

    if (!targetStepId) {
      setTargetStepId(null);
      return;
    }

    updateStep(targetStepId, {
      target: candidate.selector,
      targetLabel: candidate.label,
      route: getCurrentRoute(),
    });
    setExpandedStepId(targetStepId);
    setTargetStepId(null);
  };

  const validate = () => {
    const validationErrors = validateTutorialDraft(draft);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    await onSave({
      ...draft,
      steps: normalizeTutorialSteps(draft.steps),
    });
  };

  const handlePreview = async (fromBeginning = false) => {
    if (!validate()) {
      return;
    }

    const currentStepIndex = expandedStepId
      ? draft.steps.findIndex(step => step.id === expandedStepId)
      : 0;
    const initialStepIndex = fromBeginning
      ? 0
      : Math.max(0, currentStepIndex);

    await onPreview(
      {
        ...draft,
        steps: normalizeTutorialSteps(draft.steps),
      },
      initialStepIndex,
    );
  };

  if (!open) {
    return null;
  }

  return (
    <>
      {!targetPickerActive && (
        <div
          data-tutorial-builder-root="true"
          className={`fixed inset-0 z-[14000] items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8 ${
            suspended ? 'hidden' : 'flex'
          }`}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#ead9d0] bg-[#fffdf9] shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-[#7a1717] px-6 py-5 text-white">
              <div>
                <h2 className="text-2xl font-bold">
                  {tutorial ? labels.titleEdit : labels.titleNew}
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  {labels.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 hover:bg-white/15"
                aria-label={labels.cancel}
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[76vh] space-y-6 overflow-y-auto p-5 sm:p-7">
              {errors.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <p className="font-bold">{labels.error}</p>
                  <ul className="mt-2 list-disc space-y-1 px-5 text-sm">
                    {errors.map(error => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="rounded-3xl border border-[#ead9d0] bg-white p-5">
                <h3 className="mb-4 text-lg font-bold text-[#7a1717]">
                  {labels.details}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-bold text-gray-700">{labels.title}</span>
                    <input
                      value={draft.title}
                      onChange={event =>
                        setDraft(previous => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 outline-none focus:border-[#7a1717]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-bold text-gray-700">{labels.category}</span>
                    <input
                      value={draft.category}
                      onChange={event =>
                        setDraft(previous => ({
                          ...previous,
                          category: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 outline-none focus:border-[#7a1717]"
                      placeholder="People Development"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-bold text-gray-700">{labels.description}</span>
                    <textarea
                      value={draft.description}
                      onChange={event =>
                        setDraft(previous => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 outline-none focus:border-[#7a1717]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-bold text-gray-700">{labels.audience}</span>
                    <select
                      value={draft.audience}
                      onChange={event =>
                        setDraft(previous => ({
                          ...previous,
                          audience: event.target.value as TutorialDraft['audience'],
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 outline-none focus:border-[#7a1717]"
                    >
                      {TUTORIAL_AUDIENCES.map(audience => (
                        <option key={audience} value={audience}>
                          {audience}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-stone-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={event =>
                        setDraft(previous => ({
                          ...previous,
                          published: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-[#7a1717]"
                    />
                    <span className="text-sm font-bold text-gray-700">{labels.published}</span>
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#7a1717]">{labels.steps}</h3>
                    <p className="text-sm text-gray-500">
                      {draft.steps.length} {labels.steps.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={addInformationStep}
                      className="flex items-center gap-2 rounded-xl border border-[#d7b7b7] bg-white px-4 py-3 text-sm font-bold text-[#7a1717] hover:bg-[#fff7f7]"
                    >
                      <Plus size={17} />
                      {labels.addInformationStep}
                    </button>
                    <button
                      type="button"
                      onClick={beginAddStep}
                      className="flex items-center gap-2 rounded-xl bg-[#7a1717] px-4 py-3 font-bold text-white hover:bg-[#641414]"
                    >
                      <Crosshair size={18} />
                      {labels.addStep}
                    </button>
                  </div>
                </div>

                {draft.steps.length === 0 && (
                  <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                    {labels.noSteps}
                  </div>
                )}

                {draft.steps.map((step, index) => {
                  const expanded = expandedStepId === step.id;

                  return (
                    <article
                      key={step.id}
                      className="overflow-hidden rounded-3xl border border-[#ead9d0] bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedStepId(expanded ? null : step.id)}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-stone-50"
                      >
                        <GripVertical size={19} className="text-gray-400" />
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8eeee] font-bold text-[#7a1717]">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-gray-900">
                            {step.title || `${labels.step} ${index + 1}`}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {step.targetLabel || step.target}
                          </span>
                        </span>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-gray-600">
                          {step.action}
                        </span>
                      </button>

                      {expanded && (
                        <div className="space-y-4 border-t border-gray-100 bg-[#fffdf9] p-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-1">
                              <span className="text-sm font-bold text-gray-700">{labels.stepTitle}</span>
                              <input
                                value={step.title}
                                onChange={event =>
                                  updateStep(step.id, { title: event.target.value })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm font-bold text-gray-700">{labels.route}</span>
                              <input
                                value={step.route}
                                onChange={event =>
                                  updateStep(step.id, { route: event.target.value })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                                placeholder="/calendar"
                              />
                            </label>

                            <label className="space-y-1 md:col-span-2">
                              <span className="text-sm font-bold text-gray-700">{labels.explanation}</span>
                              <textarea
                                value={step.description}
                                onChange={event =>
                                  updateStep(step.id, { description: event.target.value })
                                }
                                rows={3}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm font-bold text-gray-700">{labels.action}</span>
                              <select
                                value={step.action}
                                onChange={event =>
                                  updateStep(step.id, {
                                    action: event.target.value as TutorialStep['action'],
                                    target:
                                      event.target.value === 'information'
                                        ? 'body'
                                        : step.target,
                                  })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                              >
                                {TUTORIAL_STEP_ACTIONS.map(action => (
                                  <option key={action} value={action}>
                                    {action}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm font-bold text-gray-700">{labels.placement}</span>
                              <select
                                value={step.placement}
                                onChange={event =>
                                  updateStep(step.id, {
                                    placement: event.target.value as TutorialStep['placement'],
                                  })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                              >
                                {TUTORIAL_PLACEMENTS.map(placement => (
                                  <option key={placement} value={placement}>
                                    {placement}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-1 md:col-span-2">
                              <span className="text-sm font-bold text-gray-700">{labels.target}</span>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                  value={step.target}
                                  onChange={event =>
                                    updateStep(step.id, { target: event.target.value })
                                  }
                                  disabled={step.action === 'information'}
                                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#7a1717] disabled:bg-gray-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => setTargetStepId(step.id)}
                                  disabled={step.action === 'information'}
                                  className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 font-bold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Crosshair size={18} />
                                  {labels.pick}
                                </button>
                              </div>
                            </label>

                            <label className="space-y-1 md:col-span-2">
                              <span className="text-sm font-bold text-gray-700">{labels.targetLabel}</span>
                              <input
                                value={step.targetLabel}
                                onChange={event =>
                                  updateStep(step.id, { targetLabel: event.target.value })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                              />
                            </label>

                            {step.action === 'simulate-click' && (
                              <>
                                <label className="space-y-1 md:col-span-2">
                                  <span className="text-sm font-bold text-gray-700">{labels.simulationTitle}</span>
                                  <input
                                    value={step.simulationTitle}
                                    onChange={event =>
                                      updateStep(step.id, { simulationTitle: event.target.value })
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                                  />
                                </label>

                                <label className="space-y-1 md:col-span-2">
                                  <span className="text-sm font-bold text-gray-700">{labels.simulationDescription}</span>
                                  <textarea
                                    value={step.simulationDescription}
                                    onChange={event =>
                                      updateStep(step.id, { simulationDescription: event.target.value })
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7a1717]"
                                  />
                                </label>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                            <button
                              type="button"
                              onClick={() => moveStep(step.id, -1)}
                              disabled={index === 0}
                              className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(step.id, 1)}
                              disabled={index === draft.steps.length - 1}
                              className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateStep(step)}
                              className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                              <Copy size={16} />
                              {labels.duplicate}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStep(step.id)}
                              className="ml-auto flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={16} />
                              {labels.delete}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#ead9d0] bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handlePreview(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-700 hover:bg-gray-50"
              >
                <Eye size={18} />
                {labels.previewFromBeginning}
              </button>
              <button
                type="button"
                onClick={() => void handlePreview(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 font-bold text-sky-700 hover:bg-sky-100"
              >
                <Eye size={18} />
                {labels.preview}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#7a1717] px-6 py-3 font-bold text-white hover:bg-[#641414] disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? '...' : labels.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <TutorialTargetPicker
        active={!suspended && targetPickerActive}
        locale={locale}
        onSelect={handleTargetSelect}
        onCancel={() => {
          setTargetStepId(null);
          setPendingInsertIndex(null);
        }}
      />
    </>
  );
}
