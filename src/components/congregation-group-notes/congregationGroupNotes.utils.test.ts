import { describe, expect, it } from 'vitest';
import { getGroupLabel } from './congregationGroupNotes.config';
import {
  extractResponseValue,
  formatAttachmentSize,
  normalizeAssignment,
  normalizePeopleDevelopmentGroup,
} from './congregationGroupNotes.utils';

describe('congregation group note utilities', () => {
  it('finds identifiers inside nested legacy form responses', () => {
    const response = {
      fields: {
        member: {
          linkedUserIdentifier: { value: ' LINC-1234 ' },
        },
      },
    };

    expect(extractResponseValue(response, ['linkedUserIdentifier'])).toBe('LINC-1234');
  });

  it('normalizes supported group aliases', () => {
    expect(normalizePeopleDevelopmentGroup('Pastoral')).toBe('pastors');
    expect(normalizePeopleDevelopmentGroup('facilitation')).toBe('facilitators');
    expect(normalizePeopleDevelopmentGroup('unknown group')).toBe('');
  });

  it('normalizes a shared assignment and its PDF attachment', () => {
    const assignment = normalizeAssignment(
      'assignment-1',
      {
        groups: ['teachers', 'helpers'],
        text: 'Prepare the next discussion.',
        createdAt: 1_700_000_000_000,
        attachments: {
          document: {
            fileName: 'discussion.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            encoding: 'base64',
            data: 'cGRm',
          },
        },
      },
      'en',
    );

    expect(assignment).toMatchObject({
      id: 'assignment-1',
      group: 'teachers',
      groups: ['teachers', 'helpers'],
      text: 'Prepare the next discussion.',
    });
    expect(assignment?.attachments).toEqual([
      expect.objectContaining({
        name: 'discussion.pdf',
        type: 'application/pdf',
        size: 2048,
        base64: 'cGRm',
      }),
    ]);
  });

  it('rejects assignments without a valid group or content', () => {
    expect(normalizeAssignment('missing-group', { text: 'Note' }, 'en')).toBeNull();
    expect(normalizeAssignment('missing-content', { group: 'teachers' }, 'en')).toBeNull();
  });

  it('formats attachment sizes and returns readable Arabic group labels', () => {
    expect(formatAttachmentSize(2048)).toBe('2.0 KB');
    expect(getGroupLabel('teachers', 'ar')).toBe('المعلمون');
  });
});
