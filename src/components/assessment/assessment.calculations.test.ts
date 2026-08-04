import { describe, expect, it } from 'vitest';
import { buildResult, calculationSourceSection, scoreMap } from './assessment.calculations';
import { initialAnswers, isUsableEmail, validate } from './assessment.forms';
import type { FormDef } from './assessment.types';

const form: FormDef = {
  id: 'test-assessment',
  sections: [
    {
      id: 'identity',
      type: 'fields',
      fields: [
        { id: 'name', type: 'text', required: true },
        { id: 'submittedAt', type: 'date', default: 'today' },
      ],
    },
    {
      id: 'pathways',
      type: 'groupedRating',
      groups: [
        {
          id: 'care',
          title: { en: 'Care' },
          result: { en: 'Caring for people' },
          fields: [
            { id: 'careListening', type: 'rating', default: 0 },
            { id: 'careHelping', type: 'rating', default: 0 },
          ],
        },
        {
          id: 'teaching',
          title: { en: 'Teaching' },
          result: { en: 'Teaching others' },
          fields: [
            { id: 'teachingBible', type: 'rating', default: 0 },
            { id: 'teachingExplaining', type: 'rating', default: 0 },
          ],
        },
      ],
    },
  ],
  calculations: [
    { id: 'pathwayScores', type: 'sumGroups', sourceSection: 'pathways' },
    { id: 'rankedPathways', type: 'rankGroups', sourceCalculation: 'pathwayScores' },
    { id: 'primaryPathway', type: 'topGroup', sourceCalculation: 'rankedPathways', rank: 1 },
  ],
  results: {
    display: {
      cards: [{ id: 'primary', valueFrom: 'calculations.primaryPathway' }],
      summary: { en: 'Your strongest pathway is {{primary}}.' },
    },
  },
};

const translate = (key: string) => key;

describe('assessment form helpers', () => {
  it('accepts real email addresses and rejects placeholders', () => {
    expect(isUsableEmail('person@example.com')).toBe(true);
    expect(isUsableEmail('N/A')).toBe(false);
    expect(isUsableEmail('not-an-email')).toBe(false);
  });

  it('creates defaults and enforces required answers', () => {
    const answers = initialAnswers(form);

    expect(answers.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(validate(form, answers)).toBe(false);

    expect(validate(form, { ...answers, name: 'Test User' })).toBe(true);
  });
});

describe('assessment calculations', () => {
  it('scores groups, ranks them, and builds localized result copy', () => {
    const result = buildResult(
      form,
      {
        name: 'Test User',
        careListening: 5,
        careHelping: 4,
        teachingBible: 2,
        teachingExplaining: 3,
      },
      translate,
      'en',
    );

    expect(scoreMap(result.calculations.pathwayScores)).toEqual({ care: 9, teaching: 5 });
    expect(result.calculations.rankedPathways).toEqual([
      { id: 'care', score: 9 },
      { id: 'teaching', score: 5 },
    ]);
    expect(result.cardValues.primary).toBe('Caring for people');
    expect(result.summary).toBe('Your strongest pathway is Caring for people.');
  });

  it('traces a derived calculation back to its source section', () => {
    expect(calculationSourceSection(form, 'primaryPathway')).toBe('pathways');
  });
});
