import { describe, expect, it } from 'vitest';

import { buildBezalelExportHtml } from './bezalelExport';

describe('Bezalel session export', () => {
  it('includes the identified conversation, timestamps, and rollback action ledger', () => {
    const html = buildBezalelExportHtml({
      participant: 'Pastor Example',
      participantRole: 'Pastor',
      context: 'Pastor Calendar steward',
      exportedAt: '2026-08-17T16:30:00.000Z',
      messages: [
        { role: 'user', content: 'Open August 20 at 10:00.', timestamp: '2026-08-17T16:00:00.000Z' },
        { role: 'assistant', content: 'The time is open.', timestamp: '2026-08-17T16:00:03.000Z' },
      ],
      actions: [{
        id: 'action-1',
        requestedAt: '2026-08-17T16:00:02.000Z',
        completedAt: '2026-08-17T16:00:03.000Z',
        status: 'succeeded',
        action: 'open_availability',
        date: '2026-08-20',
        targetId: '',
        resultTargetId: 'availability-123',
        details: { startTime: '10:00', endTime: '11:00' },
      }],
    });

    expect(html).toContain('Pastor Example');
    expect(html).toContain('Pastor Calendar steward');
    expect(html).toContain('Open August 20 at 10:00.');
    expect(html).toContain('open_availability');
    expect(html).toContain('availability-123');
    expect(html).toContain('America/Toronto');
    expect(html).toContain('&quot;formatVersion&quot;: 1');
  });

  it('escapes chat content and records failed actions without executable markup', () => {
    const html = buildBezalelExportHtml({
      participant: '<script>person()</script>',
      participantRole: 'Administrator',
      context: 'Calendar',
      messages: [{ role: 'user', content: '<img src=x onerror=alert(1)>', timestamp: '2026-08-17T16:00:00.000Z' }],
      actions: [{
        id: 'action-2', requestedAt: '2026-08-17T16:00:01.000Z', status: 'failed',
        action: 'delete_group_schedule', date: '2026-08-20', targetId: 'schedule-1',
        details: {}, error: '<script>failure()</script>',
      }],
    });

    expect(html).not.toContain('<script>person()</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>failure()</script>');
    expect(html).toContain('&lt;script&gt;person()&lt;/script&gt;');
    expect(html).toContain('failed');
  });
});
