import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BezalelChat, { type BezalelTravelRequest } from './BezalelChat';

const messages = [{ role: 'assistant' as const, content: 'How may I help?', timestamp: '2026-08-17T15:00:00.000Z' }];

function CalendarHarness({
  travelRequest,
  onPrepareTravelTarget,
  onTravelComplete,
}: {
  travelRequest?: BezalelTravelRequest;
  onPrepareTravelTarget: (target: BezalelTravelRequest['targets'][number]) => void;
  onTravelComplete: (requestId: number) => void;
}) {
  return (
    <>
      <button type="button" data-calendar-date="2026-08-20">August 20</button>
      <button type="button" data-calendar-date="2026-08-21">August 21</button>
      <BezalelChat
        title="Bezalel"
        subtitle="Calendar steward"
        messages={messages}
        activity="acting"
        onSend={vi.fn()}
        participant="Pastor Test"
        participantRole="Pastor"
        travelRequest={travelRequest}
        onPrepareTravelTarget={onPrepareTravelTarget}
        onTravelComplete={onTravelComplete}
      />
    </>
  );
}

describe('Bezalel calendar journey', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('closes the chat and visits every requested calendar day in order', () => {
    vi.useFakeTimers();
    const onPrepareTravelTarget = vi.fn();
    const onTravelComplete = vi.fn();
    const rendered = render(
      <CalendarHarness
        onPrepareTravelTarget={onPrepareTravelTarget}
        onTravelComplete={onTravelComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Bezalel/i }));
    expect(screen.getByRole('heading', { name: 'Bezalel' })).toBeInTheDocument();

    const travelRequest: BezalelTravelRequest = {
      id: 7,
      targets: [
        {
          date: '2026-08-20',
          targetSelector: '[data-calendar-date="2026-08-20"]',
          ariaLabel: 'Bezalel is working on August 20',
        },
        {
          date: '2026-08-21',
          targetSelector: '[data-calendar-date="2026-08-21"]',
          ariaLabel: 'Bezalel is working on August 21',
        },
      ],
    };

    rendered.rerender(
      <CalendarHarness
        travelRequest={travelRequest}
        onPrepareTravelTarget={onPrepareTravelTarget}
        onTravelComplete={onTravelComplete}
      />,
    );

    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole('heading', { name: 'Bezalel' })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Bezalel is working on August 20' })).toBeInTheDocument();
    expect(onPrepareTravelTarget).toHaveBeenNthCalledWith(1, travelRequest.targets[0]);

    act(() => vi.advanceTimersByTime(3300));
    expect(screen.getByRole('status', { name: 'Bezalel is working on August 21' })).toBeInTheDocument();
    expect(onPrepareTravelTarget).toHaveBeenNthCalledWith(2, travelRequest.targets[1]);
    expect(onTravelComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onTravelComplete).toHaveBeenCalledWith(7);
  });
});
