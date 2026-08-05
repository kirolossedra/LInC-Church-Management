import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import LincOneHero from './LincOneHero';
import SpiritualProgramFeature from './SpiritualProgramFeature';

vi.mock('motion/react', async importOriginal => {
  const original = await importOriginal<typeof import('motion/react')>();
  return { ...original, useReducedMotion: () => true };
});

vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

describe('LINC One landing navigation', () => {
  it('shows the five agreed top-level destinations', () => {
    render(
      <MemoryRouter>
        <LincOneHero isAr={false} dir="ltr" onToggleLocale={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Spiritual Gifts Program/ })).toHaveAttribute('href', '#spiritual-gifts-program');
    expect(screen.getByRole('link', { name: /NextGen/ })).toHaveAttribute('href', '/nextgen-activities');
    expect(screen.getByRole('link', { name: /About Us/ })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Pastor Login' })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: 'Administrator Panel' })).toHaveAttribute('href', '/administrator');
  });

  it('keeps assessment, booking, and group notes inside the featured program', () => {
    render(
      <MemoryRouter>
        <SpiritualProgramFeature isAr={false} dir="ltr" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Take the Assessment/ })).toHaveAttribute('href', '/assessment');
    expect(screen.getByRole('link', { name: /Book a Meeting with the Pastor/ })).toHaveAttribute('href', '/booking');
    expect(screen.getByRole('link', { name: /My Group Notes/ })).toHaveAttribute('href', '/group-notes');
  });
});
