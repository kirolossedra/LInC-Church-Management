import YAML from 'yaml';
import fiveServicePathwaysYaml from '../forms/five-service-pathways.yml?raw';
import spiritualGiftsDiscoveryYaml from '../forms/spiritual-gifts-discovery.yml?raw';
import type { AnswerValue, Answers, FieldDef, FormDef, GroupDef, Lang, LocalText, ResultCardDef, SectionDef } from './assessment.types';

export const FORMS = [fiveServicePathwaysYaml, spiritualGiftsDiscoveryYaml]
  .map(raw => YAML.parse(raw) as FormDef)
  .filter(form => form.status !== 'disabled');

export function isUsableEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 3 && trimmed !== 'N/A' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function localText(value: LocalText | undefined, lang: Lang, fallback = ''): string {
  return value?.[lang] || value?.en || value?.ar || fallback;
}

export function humanizeId(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function translateOrText(t: (key: string) => string, key: string | undefined, text: LocalText | undefined, lang: Lang, fallback: string): string {
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return localText(text, lang, fallback);
}

export function template(text: string, values: Record<string, string>): string {
  return text.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => values[key] || '');
}

export function ratingRange(form: FormDef, section?: SectionDef): number[] {
  const min = section?.ratingScale?.min ?? form.defaults?.ratingScale?.min ?? 1;
  const max = section?.ratingScale?.max ?? form.defaults?.ratingScale?.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function allFields(form: FormDef): FieldDef[] {
  return form.sections.flatMap(section =>
    section.groups?.length ? section.groups.flatMap(group => group.fields || []) : section.fields || [],
  );
}

export function getSection(form: FormDef, id?: string): SectionDef | undefined {
  return form.sections.find(section => section.id === id);
}

export function getGroup(form: FormDef, groupId: string): GroupDef | undefined {
  return form.sections.flatMap(section => section.groups || []).find(group => group.id === groupId);
}

export function getField(form: FormDef, fieldId: string): FieldDef | undefined {
  return allFields(form).find(field => field.id === fieldId);
}

export function fieldLabel(t: (key: string) => string, field: FieldDef, lang: Lang): string {
  return translateOrText(t, field.labelKey, field.label, lang, field.id);
}

export function sectionTitle(t: (key: string) => string, section: SectionDef, lang: Lang): string {
  return translateOrText(t, section.titleKey, section.title, lang, section.id);
}

export function groupTitle(t: (key: string) => string, group: GroupDef, lang: Lang): string {
  return translateOrText(t, group.titleKey, group.title, lang, group.id);
}

export function cardTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.card?.titleKey, form.card?.title, lang, humanizeId(form.id));
}

export function cardDescription(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.card?.descriptionKey, form.card?.description, lang, '');
}

export function pageTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.page?.titleKey, form.page?.title, lang, cardTitle(form, t, lang));
}

export function pageSubtitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.page?.subtitleKey, form.page?.subtitle, lang, '');
}

export function resultTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.results?.display?.titleKey, form.results?.display?.title, lang, 'Assessment Results');
}

export function resultCardLabel(t: (key: string) => string, card: ResultCardDef, lang: Lang): string {
  return translateOrText(t, card.labelKey, card.label, lang, card.id);
}

export function initialAnswers(form: FormDef): Answers {
  return Object.fromEntries(
    allFields(form).map(field => [
      field.id,
      field.default === 'today' ? new Date().toISOString().split('T')[0] : field.default ?? '',
    ]),
  );
}

export function isFilled(value: AnswerValue | undefined): boolean {
  return typeof value === 'number' ? value > 0 : String(value ?? '').trim().length > 0;
}

export function numberValue(value: AnswerValue | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validate(form: FormDef, answers: Answers): boolean {
  return allFields(form).every(field => !field.required || isFilled(answers[field.id]));
}


