import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCongregationGroupAccess } from './congregationGroupNotes';

describe('Congregation group access service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { profile: { identifier: 'MEMBER-1', group: 'teachers' }, assignments: [], schedules: [] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  });

  it('sends only the submitted identifier to the Hono portal', async () => {
    await getCongregationGroupAccess('MEMBER-1');

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/people-development/portal');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ identifier: 'MEMBER-1' });
  });
});
