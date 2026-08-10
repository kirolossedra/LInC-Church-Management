import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getNextGenSession, getNextGenSessions } from '../../../services/nextGenPortal';
import { NextGenQaSessionList, NextGenQaSessionPage } from './NextGenQaSessions';

vi.mock('../../../services/nextGenPortal', () => ({
  getNextGenSessions: vi.fn(),
  getNextGenSession: vi.fn(),
  submitNextGenVote: vi.fn(),
}));

const session = {
  id: 'session-1',
  title: 'August Questions',
  description: 'A separate QA form.',
  status: 'open' as const,
  createdAt: 1,
  updatedAt: 1,
};

describe('NextGen QA session pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists each open session as its own form', async () => {
    vi.mocked(getNextGenSessions).mockResolvedValue({ sessions: [session] });
    render(<MemoryRouter><NextGenQaSessionList /></MemoryRouter>);
    expect(await screen.findByText('August Questions')).toBeInTheDocument();
    expect(screen.getByText('Open form')).toBeInTheDocument();
  });

  it('shows a completed question as immutable when the email already voted', async () => {
    vi.mocked(getNextGenSession).mockResolvedValue({
      session,
      questions: [{
        id: 'question-1',
        sessionId: session.id,
        prompt: 'Which topic?',
        options: [{ id: 'option-1', label: 'Faith' }, { id: 'option-2', label: 'Service' }],
        createdAt: 2,
      }],
      votedQuestionIds: ['question-1'],
    });
    render(
      <MemoryRouter initialEntries={['/nextgen-activities/qa/session-1']}>
        <Routes><Route path="/nextgen-activities/qa/:sessionId" element={<NextGenQaSessionPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Vote recorded. It cannot be submitted again.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
