import { useEffect, useState } from 'react';
import { Crosshair, MousePointer2, X } from 'lucide-react';

import { TUTORIAL_INTERACTIVE_SELECTOR } from './tutorialBuilder.constants';

import type { TutorialTargetCandidate } from './tutorialBuilder.types';

import {
  getTutorialElementLabel,
  getTutorialSelector,
  isTutorialCandidateVisible,
} from './tutorialBuilder.utils';

interface TutorialTargetPickerProps {
  active: boolean;
  locale: 'en' | 'ar';
  onSelect: (candidate: TutorialTargetCandidate) => void;
  onCancel: () => void;
}

interface HighlightState {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

export default function TutorialTargetPicker({
  active,
  locale,
  onSelect,
  onCancel,
}: TutorialTargetPickerProps) {
  const [highlight, setHighlight] = useState<HighlightState | null>(null);

  useEffect(() => {
    if (!active) {
      setHighlight(null);
      return undefined;
    }

    const findTarget = (eventTarget: EventTarget | null) => {
      const element = eventTarget instanceof Element
        ? eventTarget.closest<HTMLElement>(TUTORIAL_INTERACTIVE_SELECTOR)
        : null;

      if (
        !element ||
        element.closest('[data-tutorial-builder-root="true"]') ||
        element.closest('[data-tutorial-player-ui="true"]') ||
        !isTutorialCandidateVisible(element)
      ) {
        return null;
      }

      return element;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const element = findTarget(event.target);

      if (!element) {
        setHighlight(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setHighlight({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        label: getTutorialElementLabel(element),
      });
    };

    const handleClick = (event: MouseEvent) => {
      const element = findTarget(event.target);

      if (!element) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      onSelect({
        selector: getTutorialSelector(element),
        label: getTutorialElementLabel(element),
        element,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [active, onCancel, onSelect]);

  if (!active) {
    return null;
  }

  return (
    <div
      data-tutorial-builder-root="true"
      className="fixed inset-0 z-[15000] pointer-events-none"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <div className="pointer-events-auto absolute left-1/2 top-4 flex w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-3xl border border-sky-200 bg-white px-5 py-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <Crosshair size={22} />
          </div>
          <div>
            <p className="font-bold text-gray-900">
              {locale === 'ar'
                ? 'اختر عنصراً من الشاشة'
                : 'Select an element on this screen'}
            </p>
            <p className="text-sm text-gray-500">
              {locale === 'ar'
                ? 'حرّك المؤشر فوق الزر أو الحقل، ثم اضغط عليه. لن يتم تنفيذ الإجراء الحقيقي.'
                : 'Hover over a button or field, then click it. The real action will not run.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label={locale === 'ar' ? 'إلغاء' : 'Cancel'}
        >
          <X size={20} />
        </button>
      </div>

      {highlight && (
        <>
          <div
            className="absolute rounded-2xl border-4 border-sky-500 bg-sky-300/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.42)]"
            style={{
              top: highlight.top - 6,
              left: highlight.left - 6,
              width: highlight.width + 12,
              height: highlight.height + 12,
            }}
          />
          <div
            className="absolute flex max-w-[320px] items-center gap-2 rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white shadow-xl"
            style={{
              top: Math.max(92, highlight.top - 50),
              left: Math.max(8, highlight.left),
            }}
          >
            <MousePointer2 size={16} />
            <span className="truncate">{highlight.label}</span>
          </div>
        </>
      )}
    </div>
  );
}
