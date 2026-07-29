import { useEffect, useMemo, useRef } from 'react';
import { Joyride } from 'react-joyride';
import type { NavigateFunction } from 'react-router-dom';

import type {
  Tutorial,
  TutorialSimulationState,
  TutorialStep,
} from './tutorialBuilder.types';

import { waitForTutorialTarget } from './tutorialBuilder.utils';

interface TutorialPlayerProps {
  tutorial: Tutorial;
  preview: boolean;
  initialStepIndex: number;
  currentPath: string;
  navigate: NavigateFunction;
  onSimulationChange: (
    simulation: TutorialSimulationState | null,
  ) => void;
  onStepChange: (stepIndex: number) => Promise<void>;
  onComplete: () => Promise<void>;
  onStop: () => void;
}

function TutorialStepContent({
  step,
  preview,
}: {
  step: TutorialStep;
  preview: boolean;
}) {
  return (
    <div
      data-tutorial-player-ui="true"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <p style={{ margin: 0, lineHeight: 1.55 }}>
        {step.description}
      </p>

      {step.action === 'simulate-click' && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: '#f8eeee',
            border: '1px solid #e5b9b9',
          }}
        >
          <strong style={{ display: 'block', color: '#7a1717' }}>
            {step.simulationTitle || 'What happens after clicking'}
          </strong>
          <span style={{ display: 'block', marginTop: 4 }}>
            {step.simulationDescription}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: 8,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Demonstration only — no real data operation is executed.
          </span>
        </div>
      )}

      {preview && (
        <span
          style={{
            display: 'inline-block',
            marginTop: 10,
            padding: '3px 8px',
            borderRadius: 999,
            background: '#e0f2fe',
            color: '#0369a1',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Builder preview
        </span>
      )}
    </div>
  );
}

export default function TutorialPlayer({
  tutorial,
  preview,
  initialStepIndex,
  currentPath,
  navigate,
  onSimulationChange,
  onStepChange,
  onComplete,
  onStop,
}: TutorialPlayerProps) {
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  const clearSimulatedTarget = () => {
    highlightedElementRef.current?.removeAttribute(
      'data-tutorial-simulated',
    );
    highlightedElementRef.current = null;
  };

  useEffect(
    () => () => {
      clearSimulatedTarget();
      onSimulationChange(null);
    },
    [onSimulationChange],
  );

  const steps = useMemo(
    () =>
      tutorial.steps.map(step => {
        const usePageTarget =
          step.action === 'information' || !step.target.trim();

        return {
          id: step.id,
          target: usePageTarget ? 'body' : step.target,
          title: step.title,
          content: (
            <TutorialStepContent step={step} preview={preview} />
          ),
          placement: usePageTarget ? 'center' : step.placement,
          skipBeacon: true,
          blockTargetInteraction: true,
          spotlightPadding: 10,
          spotlightRadius: 14,
          beforeTimeout: 6500,
          targetWaitTimeout: 5000,
          before: async () => {
            clearSimulatedTarget();
            onSimulationChange(null);

            const desiredRoute = step.route.trim();

            if (desiredRoute && desiredRoute !== currentPath) {
              navigate(desiredRoute);
              await new Promise(resolve => window.setTimeout(resolve, 180));
            }

            if (!usePageTarget) {
              const target = await waitForTutorialTarget(step.target);

              if (target && step.action === 'simulate-click') {
                target.setAttribute('data-tutorial-simulated', 'true');
                highlightedElementRef.current = target;
              }
            }

            if (step.action === 'simulate-click') {
              onSimulationChange({
                stepId: step.id,
                title:
                  step.simulationTitle ||
                  'Simulated click result',
                description: step.simulationDescription,
                targetLabel: step.targetLabel,
              });
            }
          },
          data: {
            tutorialStepId: step.id,
          },
        };
      }),
    [
      currentPath,
      navigate,
      onSimulationChange,
      preview,
      tutorial.steps,
    ],
  );

  return (
    <>
      <style>{`
        [data-tutorial-simulated="true"] {
          animation: tutorial-simulated-click 1.15s ease-in-out infinite;
        }

        @keyframes tutorial-simulated-click {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(0.97);
            filter: brightness(1.15);
          }
        }
      `}</style>
      <Joyride
        continuous
        initialStepIndex={initialStepIndex}
        run
        scrollToFirstStep
        steps={steps}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          nextWithProgress: 'Next ({current} of {total})',
          open: 'Open tutorial step',
          skip: 'Skip',
        }}
        options={{
          backgroundColor: '#fffdf9',
          textColor: '#2b1717',
          primaryColor: '#7a1717',
          arrowColor: '#fffdf9',
          overlayColor: '#201010b8',
          showProgress: true,
          buttons: ['back', 'skip', 'close', 'primary'],
          width: 430,
          zIndex: 13000,
          blockTargetInteraction: true,
          overlayClickAction: false,
          dismissKeyAction: 'close',
          closeButtonAction: 'skip',
          scrollDuration: 450,
          scrollOffset: 100,
        }}
        onEvent={(data: {
          index: number;
          status: string;
          type: string;
        }) => {
          if (data.type === 'step:before') {
            void onStepChange(data.index);
          }

          if (data.type === 'tour:end') {
            clearSimulatedTarget();
            onSimulationChange(null);

            if (data.status === 'finished') {
              void onComplete();
            } else {
              onStop();
            }
          }
        }}
      />
    </>
  );
}
