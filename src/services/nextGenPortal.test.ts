import { describe, expect, it } from 'vitest';

import { vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
}));

import { nextGenResponseError } from './nextGenPortal';

describe('NextGen backend response diagnostics', () => {
  it('identifies an undeployed backend endpoint', () => {
    expect(nextGenResponseError(404)).toBe(
      'The NextGen backend endpoint is not deployed or does not exist (HTTP 404).',
    );
  });

  it('preserves a meaningful backend JSON error with its HTTP status', () => {
    expect(nextGenResponseError(503, {
      code: 'NEXTGEN_SERVICE_UNAVAILABLE',
      message: 'NextGen services are temporarily unavailable.',
    })).toBe('NextGen services are temporarily unavailable. (HTTP 503)');
  });

  it('provides useful authentication and authorization errors', () => {
    expect(nextGenResponseError(401)).toContain('Firebase login expired');
    expect(nextGenResponseError(403)).toContain('cannot use');
  });
});
