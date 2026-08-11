import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn().mockResolvedValue('firebase-token'),
}));

vi.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken } },
}));

import {
  createPeopleDevelopmentMeetingSchedule,
  createPeoplePersonalNote,
  updatePeopleDevelopmentMeetingSchedule,
} from './peopleDevelopment';

function successfulResponse(id = 'created-id') {
  return new Response(JSON.stringify({ success: true, data: { id } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('People Development backend service', () => {
  beforeEach(() => {
    getIdToken.mockClear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(successfulResponse())));
  });

  it('sends only pastor-entered personal-note fields and leaves audit fields to Hono', async () => {
    await createPeoplePersonalNote({
      identifier: 'MEMBER-1', memberKey: 'member-1', fullName: 'Member', email: 'member@example.com',
      group: 'teachers', groupLabel: 'Teachers', type: 'strength', text: 'Strong teacher',
      source: 'pastorCalendar', date: '1999-01-01', createdAt: 1, createdAtISO: 'client-value',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({ identifier: 'MEMBER-1', memberKey: 'member-1', text: 'Strong teacher' });
    expect(payload).not.toHaveProperty('date');
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload).not.toHaveProperty('createdAtISO');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer firebase-token' });
  });

  it('strips schedule audit fields from create and update requests', async () => {
    await createPeopleDevelopmentMeetingSchedule({
      audience: 'group', group: 'teachers', ordinal: 2, weekday: 3,
      startTime: '19:00', startDate: '2026-08-01', endDate: '', active: true,
      durationMinutes: 90,
      createdAt: 1, createdAtISO: 'client-created', updatedAt: 2, updatedAtISO: 'client-updated',
    });
    await updatePeopleDevelopmentMeetingSchedule('schedule-1', {
      active: false, updatedAt: 3, updatedAtISO: 'client-update',
    });

    const fetchMock = vi.mocked(fetch);
    const createPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;
    const updatePayload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as Record<string, unknown>;
    expect(createPayload).not.toHaveProperty('id');
    expect(createPayload).not.toHaveProperty('createdAt');
    expect(createPayload).not.toHaveProperty('updatedAt');
    expect(updatePayload).toEqual({ active: false });
  });
});
