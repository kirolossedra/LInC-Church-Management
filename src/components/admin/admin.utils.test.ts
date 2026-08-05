import { describe, expect, it } from 'vitest';

import { normalizeAdminAuthority } from './admin.utils';

describe('administrator authority normalization', () => {
  it('keeps archive access disabled for legacy authority records', () => {
    expect(normalizeAdminAuthority({ manageAttendance: true })).toEqual({
      manageAssessmentForms: false,
      manageCarousel: false,
      manageAttendance: true,
      manageArchives: false,
    });
  });

  it('recognizes an explicit LInC Archives allocation', () => {
    expect(normalizeAdminAuthority({ manageArchives: true }).manageArchives).toBe(true);
  });
});
