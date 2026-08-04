import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NextGenActivityMenu from './NextGenActivityMenu';

describe('NextGenActivityMenu', () => {
  it('shows completion status and reports the selected activity', () => {
    const onSelect = vi.fn();
    render(
      <NextGenActivityMenu
        activePanel={null}
        isArabic={false}
        isSurveyCompleted
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add Question/i }));
    expect(onSelect).toHaveBeenCalledWith('question');
  });
});
