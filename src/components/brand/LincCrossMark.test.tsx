import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LincCrossMark from './LincCrossMark';

describe('LincCrossMark', () => {
  it('exposes an accessible image when a title is supplied', () => {
    render(<LincCrossMark title="LInC One" />);

    expect(screen.getByRole('img', { name: 'LInC One' })).toBeInTheDocument();
  });

  it('is decorative by default and accepts responsive sizing', () => {
    const { container } = render(<LincCrossMark size="2.25rem" palette="ivory" />);
    const mark = container.querySelector('svg');

    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark?.style.width).toBe('2.25rem');
    expect(mark?.style.height).toBe('2.25rem');
  });
});
