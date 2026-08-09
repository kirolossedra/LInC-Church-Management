import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LincLogo from './LincLogo';

describe('LincLogo', () => {
  it('provides accessible alternative text when used as meaningful branding', () => {
    render(<LincLogo label="LInC Ministry" />);

    expect(screen.getByRole('img', { name: 'LInC Ministry' })).toBeInTheDocument();
  });

  it('is decorative by default and supports responsive sizing', () => {
    const { container } = render(<LincLogo size="2.25rem" />);
    const logo = container.querySelector('img');

    expect(logo).toHaveAttribute('alt', '');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo?.style.width).toBe('2.25rem');
    expect(logo?.style.height).toBe('2.25rem');
  });
});
