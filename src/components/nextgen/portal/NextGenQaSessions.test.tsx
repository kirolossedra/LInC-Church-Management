import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getNextGenSession, getNextGenSessions, submitNextGenQuestion, submitNextGenVote } from '../../../services/nextGenPortal';
import { NextGenQaSessionList, NextGenQaSessionPage } from './NextGenQaSessions';

vi.mock('../../../services/nextGenPortal', () => ({
  getNextGenSessions: vi.fn(),
  getNextGenSession: vi.fn(),
  submitNextGenQuestion: vi.fn(),
  submitNextGenVote: vi.fn(),
}));

const session = {
  id: 'session-1',
  title: 'August Questions',
  description: 'A separate QA form.',
  theme: { en: 'Faith and service', ar: 'الإيمان والخدمة', sourceLanguage: 'en' as const },
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

  it('shows a closed session as disabled instead of hiding it', async () => {
    vi.mocked(getNextGenSessions).mockResolvedValue({
      sessions: [{ ...session, id: 'qa-session-1', title: 'QA Session 1', status: 'closed' }],
    });
    render(<MemoryRouter><NextGenQaSessionList /></MemoryRouter>);

    const closedSession = await screen.findByRole('button', { name: 'QA Session 1 is closed' });
    expect(closedSession).toBeDisabled();
    expect(screen.getByText('Closed session')).toBeInTheDocument();
    expect(screen.getByText('Voting closed')).toBeInTheDocument();
    expect(screen.getByText('0 open')).toBeInTheDocument();
  });

  it('retries a transient backend failure without reloading the page', async () => {
    vi.mocked(getNextGenSessions)
      .mockRejectedValueOnce(new Error('NextGen services are temporarily unavailable. (HTTP 503)'))
      .mockResolvedValueOnce({ sessions: [session] });
    render(<MemoryRouter><NextGenQaSessionList /></MemoryRouter>);

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('August Questions')).toBeInTheDocument();
  });

  it('keeps voted questions visible, reflects discussion selection, and allows changing a vote', async () => {
    vi.mocked(getNextGenSession).mockResolvedValue({
      session,
      questions: [{
        id: 'question-1',
        sessionId: session.id,
        prompt: 'Which topic?',
        options: [{ id: 'option-1', label: 'Upvote' }, { id: 'option-2', label: 'Downvote' }],
        createdAt: 2,
        selectedForDiscussion: true,
      }],
      currentVotes: { 'question-1': 'upvote' },
      view: 'all',
      questionLimit: 2,
      submittedQuestionCount: 1,
    });
    vi.mocked(submitNextGenVote).mockResolvedValue({ submitted: true, voteType: 'downvote' });
    render(
      <MemoryRouter initialEntries={['/nextgen-activities/qa/session-1']}>
        <Routes><Route path="/nextgen-activities/qa/:sessionId" element={<NextGenQaSessionPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Which topic?')).toBeInTheDocument();
    expect(screen.getByText('Selected for discussion')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Downvote/ }));
    await waitFor(() => expect(submitNextGenVote).toHaveBeenCalledWith('session-1', 'question-1', 'downvote'));
    expect(screen.getByText('Which topic?')).toBeInTheDocument();
    expect(screen.getByText(/change it at any time/)).toBeInTheDocument();
  });

  it('lets members submit questions and requests server-side filtered views', async () => {
    vi.mocked(getNextGenSession).mockResolvedValue({ session, questions: [], currentVotes: {}, view: 'all', questionLimit: 2, submittedQuestionCount: 0 });
    vi.mocked(submitNextGenQuestion).mockResolvedValue({
      question: {
        id: 'question-2', sessionId: session.id, prompt: 'Can we discuss service?',
        options: [{ id: 'option-1', label: 'Upvote' }, { id: 'option-2', label: 'Downvote' }],
        createdAt: 3, selectedForDiscussion: false,
      },
      review: { relevant: true, reason: 'On theme.', suggestedQuestion: '' },
      questionLimit: 2,
      submittedQuestionCount: 1,
    });
    const rendered = render(
      <MemoryRouter initialEntries={['/nextgen-activities/qa/session-1']}>
        <Routes><Route path="/nextgen-activities/qa/:sessionId" element={<NextGenQaSessionPage />} /></Routes>
      </MemoryRouter>,
    );

    const page = within(rendered.container);
    const composer = await page.findByPlaceholderText('What would you like the group to discuss?');
    fireEvent.change(composer, { target: { value: 'Can we discuss service?' } });
    fireEvent.click(page.getByRole('button', { name: 'Submit question' }));
    await waitFor(() => expect(submitNextGenQuestion).toHaveBeenCalledWith('session-1', 'Can we discuss service?'));

    fireEvent.click(page.getByRole('button', { name: 'Ranked by community' }));
    await waitFor(() => expect(getNextGenSession).toHaveBeenCalledWith('session-1', 'net-votes'));
    fireEvent.click(page.getByRole('button', { name: 'My upvotes' }));
    await waitFor(() => expect(getNextGenSession).toHaveBeenCalledWith('session-1', 'my-upvotes'));
  });
});
