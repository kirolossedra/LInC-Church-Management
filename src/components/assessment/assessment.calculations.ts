import type { Answers, CalculationValue, FormDef, Lang, RankedItem, ResultItem, RuntimeResult } from './assessment.types';
import {
  getField,
  getGroup,
  getSection,
  localText,
  numberValue,
  template,
  translateOrText,
} from './assessment.forms';

function rankValues(value: CalculationValue, order: 'ascending' | 'descending' = 'descending'): RankedItem[] {
  if (!value || Array.isArray(value) || 'id' in value) return Array.isArray(value) ? value as RankedItem[] : [];
  return Object.entries(value)
    .map(([id, score]) => ({ id, score: Number(score) || 0 }))
    .sort((a, b) => (order === 'ascending' ? a.score - b.score : b.score - a.score));
}

export function calculationSourceSection(form: FormDef, calculationId: string): string | undefined {
  const rule = form.calculations?.find(item => item.id === calculationId);
  if (!rule) return undefined;
  if (rule.sourceSection) return rule.sourceSection;
  if (rule.sourceCalculation) return calculationSourceSection(form, rule.sourceCalculation);
  return undefined;
}

function runCalculations(form: FormDef, answers: Answers): Record<string, CalculationValue> {
  const calculations: Record<string, CalculationValue> = {};

  for (const rule of form.calculations || []) {
    if (rule.type === 'sumGroups') {
      const section = getSection(form, rule.sourceSection);
      calculations[rule.id] = Object.fromEntries(
        (section?.groups || []).map(group => [
          group.id,
          (group.fields || []).reduce((sum, field) => sum + numberValue(answers[field.id]), 0),
        ]),
      );
    }

    if (rule.type === 'fieldScores') {
      const section = getSection(form, rule.sourceSection);
      calculations[rule.id] = Object.fromEntries(
        (section?.fields || []).map(field => [field.id, numberValue(answers[field.id])]),
      );
    }

    if (rule.type === 'rankGroups' || rule.type === 'rankFields') {
      calculations[rule.id] = rankValues(calculations[rule.sourceCalculation || ''], rule.order || 'descending');
    }

    if (rule.type === 'topGroup') {
      const ranked = rankValues(calculations[rule.sourceCalculation || ''], rule.order || 'descending');
      const selected = ranked[Math.max((rule.rank || 1) - 1, 0)];
      const group = selected ? getGroup(form, selected.id) : undefined;
      calculations[rule.id] = selected
        ? {
            id: selected.id,
            score: selected.score,
            result: group?.result,
            title: group?.title,
            titleKey: group?.titleKey,
            sourceSection: calculationSourceSection(form, rule.sourceCalculation || ''),
            sourceType: 'group',
          }
        : null;
    }

    if (rule.type === 'topField') {
      const ranked = rankValues(calculations[rule.sourceCalculation || ''], rule.order || 'descending');
      const selected = ranked[Math.max((rule.rank || 1) - 1, 0)];
      const field = selected ? getField(form, selected.id) : undefined;
      calculations[rule.id] = selected
        ? {
            id: selected.id,
            score: selected.score,
            result: field?.result,
            label: field?.label,
            labelKey: field?.labelKey,
            sourceSection: calculationSourceSection(form, rule.sourceCalculation || ''),
            sourceType: 'field',
          }
        : null;
    }
  }

  return calculations;
}

function isResultItem(value: CalculationValue): value is ResultItem {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false;
  }

  return 'id' in value && 'sourceType' in value;
}

function calculationDisplayValue(t: (key: string) => string, value: CalculationValue, lang: Lang): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(item => item.id).join(', ');
  if (isResultItem(value)) {
    const fallbackId = String(value.id);
    if (value.result) return localText(value.result, lang, fallbackId);
    if (value.label || value.labelKey) return translateOrText(t, value.labelKey, value.label, lang, fallbackId);
    if (value.title || value.titleKey) return translateOrText(t, value.titleKey, value.title, lang, fallbackId);
    return fallbackId;
  }
  return '';
}

export function buildResult(form: FormDef, answers: Answers, t: (key: string) => string, lang: Lang): RuntimeResult {
  const calculations = runCalculations(form, answers);
  const cardValues = Object.fromEntries(
    (form.results?.display?.cards || []).map(card => {
      const calculationId = (card.valueFrom || `calculations.${card.id}`).replace('calculations.', '');
      return [card.id, calculationDisplayValue(t, calculations[calculationId], lang)];
    }),
  );

  const summaryTemplate = localText(form.results?.display?.summary, lang, '');
  const summary = summaryTemplate ? template(summaryTemplate, cardValues) : Object.values(cardValues).filter(Boolean).join(' / ');

  return { calculations, cardValues, summary };
}

export function scoreMap(value: CalculationValue): Record<string, number> {
  if (!value || Array.isArray(value) || 'id' in value) return {};
  return Object.fromEntries(Object.entries(value).map(([key, score]) => [key, Number(score) || 0]));
}

