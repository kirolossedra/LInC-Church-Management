import { MousePointerClick, ShieldCheck } from 'lucide-react';

import type { TutorialSimulationState } from './tutorialBuilder.types';

interface TutorialSimulationLayerProps {
  simulation: TutorialSimulationState | null;
  preview: boolean;
}

export default function TutorialSimulationLayer({
  simulation,
  preview,
}: TutorialSimulationLayerProps) {
  if (!simulation) {
    return null;
  }

  return (
    <div
      data-tutorial-player-ui="true"
      className="fixed top-20 right-4 z-[12500] w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-[#d8aaaa] bg-[#fffdf9] p-5 shadow-2xl"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#f8eeee] p-3 text-[#7a1717]">
          <MousePointerClick size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#2b1717]">
              {simulation.title}
            </h3>
            {preview && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                Preview
              </span>
            )}
          </div>
          {simulation.targetLabel && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#7a1717]">
              {simulation.targetLabel}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-gray-700">
            {simulation.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
        <ShieldCheck size={15} />
        Safe simulation: no save, send, approval, or delete action runs.
      </div>
    </div>
  );
}
