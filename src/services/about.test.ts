import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPublicAboutPeople } from './about';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('About Us public service', () => {
  it('returns people from the public backend contract', async () => {
    const people = [{
      id: 'person-1',
      photoUrl: 'data:image/png;base64,YQ==',
      nameEn: 'Grace Hopper',
      nameAr: '',
      roleEn: 'Ministry advisor',
      roleAr: '',
      descriptionEn: 'Supports leaders.',
      descriptionAr: '',
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ success: true, data: { people } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    await expect(getPublicAboutPeople()).resolves.toEqual(people);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/about/people');
  });

  it('surfaces the meaningful backend error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({
        success: false,
        error: { message: 'The About Us directory is temporarily unavailable.' },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    ));

    await expect(getPublicAboutPeople()).rejects.toThrow(
      'The About Us directory is temporarily unavailable.',
    );
  });
});
