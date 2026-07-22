import React, { useMemo, useState } from 'react';
import YAML from 'yaml';
import emailjs from '@emailjs/browser';
import { database } from '../firebase';
import { ref, push, get, update, remove } from 'firebase/database';
import { motion } from 'motion/react';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '../i18n';
import fiveServicePathwaysYaml from './forms/five-service-pathways.yml?raw';
import spiritualGiftsDiscoveryYaml from './forms/spiritual-gifts-discovery.yml?raw';

const EMAILJS_SERVICE_ID = 'service_v47g6or';
const EMAILJS_TEMPLATE_ID = 'template_a0iy1xy';
const EMAILJS_PUBLIC_KEY = 'x_Xx3UHe3-yE1I13_';
const USER_LINKAGE_PASSCODE = '9910';
const SUPPORTED_LINKAGE_FORM_IDS = ['0', '1'];
const IDENTIFIER_EMAIL_SUBJECT = 'LinC Mentorship Identifier';
const DIRECT_SIGNUP_FORM_ID = 'directSignup';

type Lang = 'en' | 'ar';
type InterfaceLang = 'English' | 'Arabic';
type AnswerValue = string | number;
type Answers = Record<string, AnswerValue>;
type LocalText = { en?: string; ar?: string };
type CalculationValue = Record<string, number> | RankedItem[] | ResultItem | null;

interface FieldDef {
  id: string;
  type: string;
  required?: boolean;
  default?: string | number;
  labelKey?: string;
  label?: LocalText;
  result?: LocalText;
}

interface GroupDef {
  id: string;
  titleKey?: string;
  title?: LocalText;
  result?: LocalText;
  fields?: FieldDef[];
}

interface SectionDef {
  id: string;
  type: 'fields' | 'groupedRating' | 'ratingList';
  titleKey?: string;
  title?: LocalText;
  layout?: 'twoColumns' | 'singleColumn';
  guideKeys?: string[];
  guide?: LocalText;
  ratingScale?: { min?: number; max?: number };
  fields?: FieldDef[];
  groups?: GroupDef[];
}

interface CalculationDef {
  id: string;
  type: 'sumGroups' | 'fieldScores' | 'rankGroups' | 'rankFields' | 'topGroup' | 'topField';
  sourceSection?: string;
  sourceCalculation?: string;
  order?: 'ascending' | 'descending';
  rank?: number;
}

interface ResultCardDef {
  id: string;
  labelKey?: string;
  label?: LocalText;
  valueFrom?: string;
}

interface ScoreBlockDef {
  id: string;
  titleKey?: string;
  title?: LocalText;
  sourceCalculation: string;
  maxScore?: number;
}

interface FormDef {
  id: string;
  status?: string;
  firebase?: { path?: string; tableNameEquivalent?: string };
  page?: { titleKey?: string; subtitleKey?: string; confidentialKey?: string; title?: LocalText; subtitle?: LocalText };
  card?: { titleKey?: string; descriptionKey?: string; title?: LocalText; description?: LocalText };
  email?: { enabled?: boolean; recipients?: string[]; includeSubmitter?: boolean; subject?: LocalText };
  defaults?: { timezone?: string; ratingScale?: { min?: number; max?: number } };
  sections: SectionDef[];
  validation?: { errorKey?: string };
  calculations?: CalculationDef[];
  results?: {
    display?: {
      titleKey?: string;
      title?: LocalText;
      summary?: LocalText;
      cards?: ResultCardDef[];
      scoreBlocks?: ScoreBlockDef[];
      interpretation?: LocalText | { en?: string[]; ar?: string[] };
    };
  };
}

interface RankedItem {
  id: string;
  score: number;
}

interface ResultItem {
  id: string;
  score: number;
  result?: LocalText;
  label?: LocalText;
  labelKey?: string;
  title?: LocalText;
  titleKey?: string;
  sourceSection?: string;
  sourceType: 'group' | 'field';
}

interface RuntimeResult {
  calculations: Record<string, CalculationValue>;
  cardValues: Record<string, string>;
  summary: string;
}

interface LinkageRow {
  key: string;
  formId: string;
  path: string;
  fullName: string;
  email: string;
  userIdentifier: string;
  databaseFormId: string;
  fillingLanguage: InterfaceLang;
  identifierEmailSentAt?: number;
  createdAt: number;
  createdAtEasternTime: string;
  raw: Record<string, unknown>;
}

const FORMS = [fiveServicePathwaysYaml, spiritualGiftsDiscoveryYaml]
  .map(raw => YAML.parse(raw) as FormDef)
  .filter(form => form.status !== 'disabled');

const DIRECT_SIGNUP_TARGET_FORM = FORMS[0];

const DIRECT_SIGNUP_FORM: FormDef = {
  id: DIRECT_SIGNUP_FORM_ID,
  firebase: {
    path: DIRECT_SIGNUP_TARGET_FORM?.firebase?.path || 'form',
    tableNameEquivalent: DIRECT_SIGNUP_TARGET_FORM?.firebase?.tableNameEquivalent || DIRECT_SIGNUP_TARGET_FORM?.id || 'form',
  },
  defaults: DIRECT_SIGNUP_TARGET_FORM?.defaults,
  card: {
    title: { en: 'Direct Sign-Up', ar: 'التسجيل المباشر' },
    description: {
      en: 'People added through the direct sign-up shortcut are stored in the same backend path as normal form responses.',
      ar: 'الأشخاص الذين تتم إضافتهم من التسجيل المباشر يتم حفظهم في نفس مسار قاعدة البيانات الخاص بردود النماذج العادية.',
    },
  },
  page: {
    title: { en: 'Direct Sign-Up', ar: 'التسجيل المباشر' },
    subtitle: {
      en: 'Sign up with name and email only. The row is saved in the main form-response path so other services can use it.',
      ar: 'التسجيل بالاسم والبريد الإلكتروني فقط. يتم حفظ الصف في مسار ردود النماذج الأساسي حتى تستخدمه باقي الخدمات.',
    },
  },
  sections: [],
};

const LINKAGE_SOURCES: FormDef[] = FORMS;

function firebaseResponsePath(form: FormDef): string {
  return form.firebase?.path || 'form';
}

function directSignupTargetForm(): FormDef {
  return DIRECT_SIGNUP_TARGET_FORM || DIRECT_SIGNUP_FORM;
}

function directSignupTargetFormId(): string {
  return DIRECT_SIGNUP_TARGET_FORM?.id || DIRECT_SIGNUP_FORM_ID;
}

function linkageDraftKey(formId: string, responseKey: string): string {
  return `${formId}-${responseKey}`;
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function unwrapStoredValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value !== 'object' || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;
  for (const key of ['value', 'answer', 'currentValue', 'userIdentifier', 'linkedUserIdentifier']) {
    const nested = record[key];
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim();
  }

  return '';
}

function extractResponseValue(value: unknown, candidateKeys: string[]): string {
  const wantedKeys = new Set(candidateKeys.map(normalizeLookupKey));

  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) return '';

    if (typeof current === 'string' || typeof current === 'number') {
      return wantedKeys.has(normalizeLookupKey(currentKey)) ? String(current).trim() : '';
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, currentKey);
        if (found) return found;
      }
      return '';
    }

    if (typeof current !== 'object') return '';

    const record = current as Record<string, unknown>;

    for (const [key, nested] of Object.entries(record)) {
      if (wantedKeys.has(normalizeLookupKey(key))) {
        const directValue = unwrapStoredValue(nested);
        if (directValue) return directValue;

        const nestedValue = visit(nested, key);
        if (nestedValue) return nestedValue;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      const found = visit(nested, key);
      if (found) return found;
    }

    return '';
  };

  return visit(value);
}


function normalizeInterfaceLanguage(value: string): InterfaceLang {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'ar' || normalized.includes('arabic') || normalized.includes('عربي')) {
    return 'Arabic';
  }

  return 'English';
}

function detectResponseLanguage(raw: Record<string, unknown>): InterfaceLang {
  const languageValue = extractResponseValue(raw, [
    'interfaceLanguageUsed',
    'requesterLanguage',
    'requesterLocale',
    'languageUsed',
    'locale',
    'lang',
  ]);

  return normalizeInterfaceLanguage(languageValue || 'English');
}

function isUsableEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 3 && trimmed !== 'N/A' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function uniqueRowsWithCurrentIdentifier(rows: LinkageRow[]): LinkageRow[] {
  const seenIdentifiers = new Set<string>();
  const uniqueRows: LinkageRow[] = [];

  for (const row of rows) {
    const identifier = row.userIdentifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();

    if (!identifier || !isUsableEmail(row.email) || seenIdentifiers.has(normalizedIdentifier)) continue;

    seenIdentifiers.add(normalizedIdentifier);
    uniqueRows.push(row);
  }

  return uniqueRows;
}

function buildLinkageRows(form: FormDef, snapshotValue: unknown): LinkageRow[] {
  if (!snapshotValue || typeof snapshotValue !== 'object' || Array.isArray(snapshotValue)) return [];

  return Object.entries(snapshotValue as Record<string, Record<string, unknown>>)
    .map(([key, raw]) => {
      const fullName = extractResponseValue(raw, ['fullName', 'full_name', 'name', 'firstName', 'lastName']);
      const email = extractResponseValue(raw, ['email', 'emailAddress', 'userEmail']);
      const userIdentifier = extractResponseValue(raw, ['userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId']);
      const rawDatabaseFormId = extractResponseValue(raw, ['databaseFormId', 'linkedFormId', 'supportedFormId', 'formNumber', 'formNumericId', 'formId']);
      const databaseFormId = SUPPORTED_LINKAGE_FORM_IDS.includes(rawDatabaseFormId) ? rawDatabaseFormId : '';
      const fillingLanguage = detectResponseLanguage(raw);
      const identifierEmailSentAt = Number(raw.identifierEmailSentAt || 0) || undefined;
      const createdAt = Number(raw.createdAt || 0);
      const createdAtEasternTime = String(raw.createdAtEasternTime || raw.createdAtISO || '');

      return {
        key,
        formId: form.id,
        path: firebaseResponsePath(form),
        fullName: fullName || 'N/A',
        email: email || 'N/A',
        userIdentifier,
        databaseFormId,
        fillingLanguage,
        identifierEmailSentAt,
        createdAt,
        createdAtEasternTime,
        raw,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function localText(value: LocalText | undefined, lang: Lang, fallback = ''): string {
  return value?.[lang] || value?.en || value?.ar || fallback;
}

function humanizeId(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function translateOrText(t: (key: string) => string, key: string | undefined, text: LocalText | undefined, lang: Lang, fallback: string): string {
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return localText(text, lang, fallback);
}

function template(text: string, values: Record<string, string>): string {
  return text.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => values[key] || '');
}

function getEasternTime(form: FormDef): string {
  return new Date().toLocaleString('en-CA', {
    timeZone: form.defaults?.timezone || 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ratingRange(form: FormDef, section?: SectionDef): number[] {
  const min = section?.ratingScale?.min ?? form.defaults?.ratingScale?.min ?? 1;
  const max = section?.ratingScale?.max ?? form.defaults?.ratingScale?.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function allFields(form: FormDef): FieldDef[] {
  return form.sections.flatMap(section =>
    section.groups?.length ? section.groups.flatMap(group => group.fields || []) : section.fields || [],
  );
}

function getSection(form: FormDef, id?: string): SectionDef | undefined {
  return form.sections.find(section => section.id === id);
}

function getGroup(form: FormDef, groupId: string): GroupDef | undefined {
  return form.sections.flatMap(section => section.groups || []).find(group => group.id === groupId);
}

function getField(form: FormDef, fieldId: string): FieldDef | undefined {
  return allFields(form).find(field => field.id === fieldId);
}

function fieldLabel(t: (key: string) => string, field: FieldDef, lang: Lang): string {
  return translateOrText(t, field.labelKey, field.label, lang, field.id);
}

function sectionTitle(t: (key: string) => string, section: SectionDef, lang: Lang): string {
  return translateOrText(t, section.titleKey, section.title, lang, section.id);
}

function groupTitle(t: (key: string) => string, group: GroupDef, lang: Lang): string {
  return translateOrText(t, group.titleKey, group.title, lang, group.id);
}

function cardTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.card?.titleKey, form.card?.title, lang, humanizeId(form.id));
}

function cardDescription(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.card?.descriptionKey, form.card?.description, lang, '');
}

function pageTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.page?.titleKey, form.page?.title, lang, cardTitle(form, t, lang));
}

function pageSubtitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.page?.subtitleKey, form.page?.subtitle, lang, '');
}

function resultTitle(form: FormDef, t: (key: string) => string, lang: Lang): string {
  return translateOrText(t, form.results?.display?.titleKey, form.results?.display?.title, lang, 'Assessment Results');
}

function resultCardLabel(t: (key: string) => string, card: ResultCardDef, lang: Lang): string {
  return translateOrText(t, card.labelKey, card.label, lang, card.id);
}

function initialAnswers(form: FormDef): Answers {
  return Object.fromEntries(
    allFields(form).map(field => [
      field.id,
      field.default === 'today' ? new Date().toISOString().split('T')[0] : field.default ?? '',
    ]),
  );
}

function isFilled(value: AnswerValue | undefined): boolean {
  return typeof value === 'number' ? value > 0 : String(value ?? '').trim().length > 0;
}

function numberValue(value: AnswerValue | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validate(form: FormDef, answers: Answers): boolean {
  return allFields(form).every(field => !field.required || isFilled(answers[field.id]));
}

function rankValues(value: CalculationValue, order: 'ascending' | 'descending' = 'descending'): RankedItem[] {
  if (!value || Array.isArray(value) || 'id' in value) return Array.isArray(value) ? value as RankedItem[] : [];
  return Object.entries(value)
    .map(([id, score]) => ({ id, score: Number(score) || 0 }))
    .sort((a, b) => (order === 'ascending' ? a.score - b.score : b.score - a.score));
}

function calculationSourceSection(form: FormDef, calculationId: string): string | undefined {
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

function buildResult(form: FormDef, answers: Answers, t: (key: string) => string, lang: Lang): RuntimeResult {
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

function scoreMap(value: CalculationValue): Record<string, number> {
  if (!value || Array.isArray(value) || 'id' in value) return {};
  return Object.fromEntries(Object.entries(value).map(([key, score]) => [key, Number(score) || 0]));
}

function buildFieldsPayload(form: FormDef, answers: Answers, t: (key: string) => string, lang: Lang) {
  return Object.fromEntries(
    form.sections.map(section => {
      if (section.type === 'groupedRating') {
        return [
          section.id,
          Object.fromEntries(
            (section.groups || []).map(group => [
              group.id,
              {
                sectionEnglish: groupTitle(t, group, lang),
                sectionArabic: groupTitle(t, group, lang),
                questions: Object.fromEntries(
                  (group.fields || []).map(field => [
                    field.id,
                    {
                      questionEnglish: fieldLabel(t, field, lang),
                      questionArabic: fieldLabel(t, field, lang),
                      score: numberValue(answers[field.id]),
                    },
                  ]),
                ),
              },
            ]),
          ),
        ];
      }

      if (section.type === 'ratingList') {
        return [
          section.id,
          Object.fromEntries(
            (section.fields || []).map(field => [
              field.id,
              {
                areaEnglish: fieldLabel(t, field, lang),
                areaArabic: fieldLabel(t, field, lang),
                score: numberValue(answers[field.id]),
              },
            ]),
          ),
        ];
      }

      return [
        section.id,
        Object.fromEntries(
          (section.fields || []).map(field => [
            field.id,
            section.id === 'trainee'
              ? {
                  fieldEnglish: fieldLabel(t, field, lang),
                  fieldArabic: fieldLabel(t, field, lang),
                  value: answers[field.id] || '',
                }
              : {
                  questionEnglish: fieldLabel(t, field, lang),
                  questionArabic: fieldLabel(t, field, lang),
                  answer: answers[field.id] || '',
                },
          ]),
        ),
      ];
    }),
  );
}

function buildFullReportHtml(params: {
  form: FormDef;
  answers: Answers;
  result: RuntimeResult;
  lang: InterfaceLang;
  langCode: Lang;
  submittedAt: string;
  t: (key: string) => string;
}): string {
  const { form, answers, result, lang, langCode, submittedAt, t } = params;
  const isArabic = lang === 'Arabic';

  const labels = isArabic
    ? {
        submittedAt: 'وقت الإرسال',
        interfaceLanguageUsed: 'لغة النموذج المستخدمة',
        results: 'النتائج',
        section: 'القسم',
        answer: 'الإجابة',
        score: 'الدرجة',
        totalScore: 'الدرجة الإجمالية',
        notAvailable: 'غير متوفر',
      }
    : {
        submittedAt: 'Submitted At',
        interfaceLanguageUsed: 'Interface Language Used',
        results: 'Results',
        section: 'Section',
        answer: 'Answer',
        score: 'Score',
        totalScore: 'Total Score',
        notAvailable: 'N/A',
      };

  const direction = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';
  const borderSide = isArabic ? 'border-right' : 'border-left';
  const maxScore = form.defaults?.ratingScale?.max || 5;

  const infoRows = [
    { label: labels.submittedAt, value: submittedAt },
    { label: labels.interfaceLanguageUsed, value: lang },
  ];

  const resultCardsHtml = (form.results?.display?.cards || [])
    .map(card => `
      <div style="background-color:#fffafa; border:1px solid #ead1d1; border-radius:14px; padding:14px;">
        <div style="font-size:12px; color:#777777; font-weight:700; margin-bottom:4px;">${escapeHtml(resultCardLabel(t, card, langCode))}</div>
        <div style="font-size:15px; color:#641414; font-weight:800;">${escapeHtml(result.cardValues[card.id] || labels.notAvailable)}</div>
      </div>
    `)
    .join('');

  const sectionsHtml = form.sections.map(section => {
    const title = sectionTitle(t, section, langCode);

    if (section.type === 'fields') {
      const rows = (section.fields || []).map(field => `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #eeeeee; color:#555555; font-weight:700; width:42%;">${escapeHtml(fieldLabel(t, field, langCode))}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #eeeeee; color:#242424;">${escapeHtml(String(answers[field.id] || labels.notAvailable))}</td>
        </tr>
      `).join('');

      return `
        <div style="margin-top:18px; border:1px solid #ead1d1; border-radius:16px; overflow:hidden; background-color:#ffffff;">
          <div style="padding:13px 15px; background-color:#f8eeee; color:#641414; font-weight:800; font-size:15px;">${escapeHtml(title)}</div>
          <table role="presentation" style="width:100%; border-collapse:collapse;">${rows}</table>
        </div>
      `;
    }

    if (section.type === 'groupedRating') {
      const totalCalculation = form.calculations?.find(rule => rule.type === 'sumGroups' && rule.sourceSection === section.id)?.id || '';
      const totals = scoreMap(result.calculations[totalCalculation]);

      const groupsHtml = (section.groups || []).map(group => {
        const groupMax = (section.ratingScale?.max || maxScore) * (group.fields || []).length;
        const questionsHtml = (group.fields || []).map(field => `
          <div style="padding:10px 12px; border-top:1px solid #eeeeee;">
            <div style="font-weight:700; color:#333333; margin-bottom:6px;">${escapeHtml(field.id)}. ${escapeHtml(fieldLabel(t, field, langCode))}</div>
            <div style="display:inline-block; padding:5px 10px; background-color:#f8eeee; border-radius:999px; color:#641414; font-size:12px; font-weight:800;">${labels.score}: ${numberValue(answers[field.id])}/${section.ratingScale?.max || maxScore}</div>
          </div>
        `).join('');

        return `
          <div style="margin:12px 0; border:1px solid #eeeeee; border-radius:14px; overflow:hidden; background-color:#ffffff;">
            <div style="padding:12px; background-color:#fffafa;">
              <div style="font-weight:800; color:#641414; font-size:14px;">${escapeHtml(groupTitle(t, group, langCode))}</div>
              <div style="margin-top:6px; display:inline-block; padding:5px 10px; background-color:#8b1e1e; color:#ffffff; border-radius:999px; font-size:12px; font-weight:800;">${labels.totalScore}: ${totals[group.id] || 0}/${groupMax}</div>
            </div>
            ${questionsHtml}
          </div>
        `;
      }).join('');

      return `
        <div style="margin-top:18px; border:1px solid #ead1d1; border-radius:16px; overflow:hidden; background-color:#ffffff;">
          <div style="padding:13px 15px; background-color:#f8eeee; color:#641414; font-weight:800; font-size:15px;">${escapeHtml(title)}</div>
          <div style="padding:12px;">${groupsHtml}</div>
        </div>
      `;
    }

    const ratingRows = (section.fields || []).map(field => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #eeeeee; color:#333333; font-weight:700;">${escapeHtml(field.id)}. ${escapeHtml(fieldLabel(t, field, langCode))}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #eeeeee; color:#641414; font-weight:800; white-space:nowrap;">${numberValue(answers[field.id])}/${section.ratingScale?.max || maxScore}</td>
      </tr>
    `).join('');

    return `
      <div style="margin-top:18px; border:1px solid #ead1d1; border-radius:16px; overflow:hidden; background-color:#ffffff;">
        <div style="padding:13px 15px; background-color:#f8eeee; color:#641414; font-weight:800; font-size:15px;">${escapeHtml(title)}</div>
        <table role="presentation" style="width:100%; border-collapse:collapse;">${ratingRows}</table>
      </div>
    `;
  }).join('');

  return `
    <div dir="${direction}" style="text-align:${align};">
      <div style="padding:16px; background-color:#fffafa; ${borderSide}:5px solid #8b1e1e; border-radius:14px; margin-bottom:16px;">
        <div style="color:#8b1e1e; font-size:16px; font-weight:800; margin-bottom:10px;">${labels.results}</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-bottom:12px;">${resultCardsHtml}</div>
        <div style="padding:12px; background-color:#ffffff; border:1px solid #ead1d1; border-radius:12px; color:#641414; font-weight:700;">${escapeHtml(result.summary)}</div>
      </div>

      <table role="presentation" style="width:100%; border-collapse:collapse; border:1px solid #ead1d1; border-radius:14px; overflow:hidden; margin-bottom:16px;">
        ${infoRows.map(row => `
          <tr>
            <td style="padding:10px 12px; background-color:#f8eeee; color:#641414; font-weight:800; width:42%; border-bottom:1px solid #ead1d1;">${escapeHtml(row.label)}</td>
            <td style="padding:10px 12px; color:#242424; border-bottom:1px solid #eeeeee;">${escapeHtml(row.value)}</td>
          </tr>
        `).join('')}
      </table>

      ${sectionsHtml}
    </div>
  `;
}

function buildAssessmentEmailHtml(params: {
  form: FormDef;
  lang: InterfaceLang;
  fullName: string;
  surveyDate: string;
  interfaceLanguageUsed: string;
  submittedAt: string;
  cards: { label: string; value: string }[];
  fullReportHtml: string;
}): string {
  const isArabic = params.lang === 'Arabic';
  const labels = isArabic
    ? {
        title: 'نتيجة التقييم',
        subtitle: 'تم إرسال نموذج تقييم جديد',
        fullName: 'الاسم الكامل',
        surveyDate: 'تاريخ التقييم',
        languageUsed: 'لغة النموذج المستخدمة',
        submittedAt: 'وقت الإرسال',
        assessmentResult: 'نتيجة التقييم',
        fullResponseReport: 'التقرير الكامل للإجابة',
        footer: 'تم إنشاء هذا البريد الإلكتروني تلقائياً بعد إرسال نموذج تقييم جديد.',
      }
    : {
        title: 'New LINC Assessment Response',
        subtitle: 'A new assessment form response was submitted',
        fullName: 'Full Name',
        surveyDate: 'Survey Date',
        languageUsed: 'Language Used',
        submittedAt: 'Submitted At',
        assessmentResult: 'Assessment Result',
        fullResponseReport: 'Full Response Report',
        footer: 'This email was automatically generated after a new form response was submitted.',
      };

  const direction = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';
  const borderSide = isArabic ? 'border-right' : 'border-left';

  return `
<div dir="${direction}" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #242424; line-height: 1.6; text-align: ${align};">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">${labels.title}</h2>
    <div style="margin-top: 6px; font-size: 13px;">${labels.subtitle}</div>
  </div>
  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
      <tr><td style="padding: 8px 0; width: 190px; color: #666666; font-weight: 700;">${labels.fullName}</td><td style="padding: 8px 0;">${escapeHtml(params.fullName)}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.surveyDate}</td><td style="padding: 8px 0;">${escapeHtml(params.surveyDate)}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.languageUsed}</td><td style="padding: 8px 0;">${escapeHtml(params.interfaceLanguageUsed)}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.submittedAt}</td><td style="padding: 8px 0;">${escapeHtml(params.submittedAt)}</td></tr>
    </table>
    <div style="margin: 20px 0; padding: 16px; background-color: #f8eeee; ${borderSide}: 5px solid #8b1e1e; border-radius: 10px;">
      <h3 style="margin: 0 0 10px; color: #641414; font-size: 17px;">${labels.assessmentResult}</h3>
      ${params.cards.map(card => `<div style="margin-bottom: 8px;"><strong>${escapeHtml(card.label)}:</strong> ${escapeHtml(card.value)}</div>`).join('')}
    </div>
    <div style="margin-top: 22px;">
      <h3 style="margin: 0 0 10px; color: #8b1e1e; font-size: 17px;">${labels.fullResponseReport}</h3>
      <div style="padding: 0; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 14px; font-size: 14px; overflow: hidden;">${params.fullReportHtml}</div>
    </div>
    <div style="margin-top: 22px; color: #777777; font-size: 12px;">${labels.footer}</div>
  </div>
</div>`;
}


function buildIdentifierSharingEmailHtml(params: {
  row: LinkageRow;
  userIdentifier: string;
  lang: InterfaceLang;
}): string {
  const isArabic = params.lang === 'Arabic';
  const isDirectSignup = params.row.formId === DIRECT_SIGNUP_FORM_ID || params.row.raw.signupType === 'directWithoutAssessmentForm';
  const name = params.row.fullName && params.row.fullName !== 'N/A' ? params.row.fullName : '';

  const labels = isArabic
    ? {
        title: 'برنامج ارشاد وتلمذة الخدام',
        greeting: name ? `مرحباً ${name}،` : 'مرحباً،',
        thankYou: isDirectSignup ? 'شكراً للتسجيل في برنامج ارشاد وتلمذة الخدام.' : 'شكراً لتعبئة النموذج.',
        intro: 'هذا هو رمز العبور الشخصي الخاص في برنامج ارشاد وتلمذة الخدام',
        identifierLabel: 'رمز العبور الشخصي',
        saveNote: 'يرجى حفظ رمز العبور الشخصي في مكان آمن، لأنه سيتم استخدامه في جميع الأنشطة اللاحقة في برنامج ارشاد وتلمذة الخدام.',
        footer: 'تم إرسال هذه الرسالة تلقائياً من نظام برنامج ارشاد وتلمذة الخدام.',
      }
    : {
        title: 'LinC Mentorship Identifier',
        greeting: name ? `Hello ${name},` : 'Hello,',
        thankYou: isDirectSignup ? 'Thank you for signing up for the LinC Spiritual Mentorship program.' : 'Thank you for filling out the LinC Spiritual Mentorship form.',
        intro: 'This is your LinC Mentorship identifier:',
        identifierLabel: 'Your Identifier',
        saveNote: 'Please save this identifier somewhere safe because it will be used in all subsequent spiritual mentorship program activities.',
        footer: 'This email was automatically sent by the LinC Mentorship system.',
      };

  const direction = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';
  const borderSide = isArabic ? 'border-right' : 'border-left';

  return `
<div dir="${direction}" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #242424; line-height: 1.7; text-align: ${align};">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">${escapeHtml(labels.title)}</h2>
  </div>
  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <p style="margin: 0 0 12px; font-weight: 700;">${escapeHtml(labels.greeting)}</p>
    <p style="margin: 0 0 12px;">${escapeHtml(labels.thankYou)}</p>
    <p style="margin: 0 0 16px;">${escapeHtml(labels.intro)}</p>

    <div style="margin: 18px 0; padding: 18px; background-color: #f8eeee; ${borderSide}: 5px solid #8b1e1e; border-radius: 12px;">
      <div style="font-size: 13px; color: #641414; font-weight: 800; margin-bottom: 6px;">${escapeHtml(labels.identifierLabel)}</div>
      <div style="font-size: 28px; color: #641414; font-weight: 900; letter-spacing: 0.06em;">${escapeHtml(params.userIdentifier)}</div>
    </div>

    <p style="margin: 0 0 14px; font-weight: 700; color: #641414;">${escapeHtml(labels.saveNote)}</p>
    <div style="margin-top: 22px; color: #777777; font-size: 12px;">${escapeHtml(labels.footer)}</div>
  </div>
</div>`;
}

async function sendEmailViaEmailJs(params: {
  to: string;
  subject: string;
  fullName: string;
  htmlBody: string;
  replyToEmail?: string;
}) {
  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: params.to,
      subject: params.subject,
      fullName: params.fullName,
      message_html: params.htmlBody,
      reply_to: params.replyToEmail || '',
    },
    EMAILJS_PUBLIC_KEY,
  );
}

export default function AssessmentForm() {
  const { t, dir } = useI18n();
  const langCode: Lang = dir === 'rtl' ? 'ar' : 'en';
  const interfaceLanguage: InterfaceLang = dir === 'rtl' ? 'Arabic' : 'English';
  const isArabicUI = dir === 'rtl';

  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const selectedForm = FORMS.find(item => item.id === selectedFormId) || null;
  const [answersByForm, setAnswersByForm] = useState<Record<string, Answers>>(() =>
    Object.fromEntries(FORMS.map(item => [item.id, initialAnswers(item)])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<'assessmentChoices' | 'userLinkage'>('assessmentChoices');
  const [linkagePasscode, setLinkagePasscode] = useState('');
  const [isLinkageUnlocked, setIsLinkageUnlocked] = useState(false);
  const [selectedLinkageFormId, setSelectedLinkageFormId] = useState<string | null>(null);
  const [linkageRowsByForm, setLinkageRowsByForm] = useState<Record<string, LinkageRow[]>>({});
  const [identifierDrafts, setIdentifierDrafts] = useState<Record<string, string>>({});
  const [formIdDrafts, setFormIdDrafts] = useState<Record<string, string>>({});
  const [linkageLoading, setLinkageLoading] = useState(false);
  const [linkageSavingKey, setLinkageSavingKey] = useState<string | null>(null);
  const [linkageDeletingKey, setLinkageDeletingKey] = useState<string | null>(null);
  const [linkageEmailSendingKey, setLinkageEmailSendingKey] = useState<string | null>(null);
  const [linkageEmailSendingAll, setLinkageEmailSendingAll] = useState(false);
  const [expandedPreviewKeys, setExpandedPreviewKeys] = useState<Record<string, boolean>>({});
  const [linkageError, setLinkageError] = useState<string | null>(null);
  const [linkageMessage, setLinkageMessage] = useState<string | null>(null);
  const [directSignupName, setDirectSignupName] = useState('');
  const [directSignupEmail, setDirectSignupEmail] = useState('');
  const [directSignupLoading, setDirectSignupLoading] = useState(false);
  const [directSignupError, setDirectSignupError] = useState<string | null>(null);
  const [directSignupMessage, setDirectSignupMessage] = useState<string | null>(null);

  const answers = selectedForm ? answersByForm[selectedForm.id] || initialAnswers(selectedForm) : {};
  const result = useMemo(
    () => selectedForm ? buildResult(selectedForm, answers, t, langCode) : null,
    [selectedForm, answers, t, langCode],
  );

  const setAnswer = (fieldId: string, value: AnswerValue) => {
    if (!selectedForm) return;
    setAnswersByForm(previous => ({
      ...previous,
      [selectedForm.id]: {
        ...(previous[selectedForm.id] || {}),
        [fieldId]: value,
      },
    }));
  };

  const selectForm = (formId: string) => {
    setActivePage('assessmentChoices');
    setSelectedFormId(formId);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForRetake = () => {
    if (!selectedForm) return;
    setAnswersByForm(previous => ({ ...previous, [selectedForm.id]: initialAnswers(selectedForm) }));
    setSubmitted(false);
    setError(null);
  };

  const handleBackToAssessmentChoices = () => {
    setActivePage('assessmentChoices');
    setSelectedFormId(null);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openUserLinkage = () => {
    setActivePage('userLinkage');
    setSelectedFormId(null);
    setSubmitted(false);
    setError(null);
    setLinkageError(null);
    setLinkageMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDirectSignup = async (event: React.FormEvent) => {
    event.preventDefault();

    const fullName = directSignupName.trim();
    const email = directSignupEmail.trim();

    setDirectSignupError(null);
    setDirectSignupMessage(null);

    if (!fullName) {
      setDirectSignupError(isArabicUI ? 'أدخل الاسم الكامل أولاً.' : 'Enter the full name first.');
      return;
    }

    if (!isUsableEmail(email)) {
      setDirectSignupError(isArabicUI ? 'أدخل بريد إلكتروني صالح.' : 'Enter a valid email address.');
      return;
    }

    setDirectSignupLoading(true);

    try {
      const targetForm = directSignupTargetForm();
      const targetFormId = directSignupTargetFormId();
      const targetPath = firebaseResponsePath(targetForm);
      const createdAt = Date.now();
      const createdAtISO = new Date().toISOString();
      const createdAtEasternTime = getEasternTime(targetForm);

      await push(ref(database, `${targetPath}/`), {
        tableNameEquivalent: targetForm.firebase?.tableNameEquivalent || targetFormId,
        signupType: 'directWithoutAssessmentForm',
        submissionMode: 'directSignupStoredAsFormResponse',
        createdAt,
        createdAtISO,
        createdAtEasternTime,
        interfaceLanguageUsed: interfaceLanguage,
        formId: targetFormId,
        sourceFormId: DIRECT_SIGNUP_FORM_ID,
        fullName,
        email,
        fields: {
          trainee: {
            fullName: {
              fieldEnglish: 'Full Name',
              fieldArabic: 'الاسم الكامل',
              value: fullName,
            },
            email: {
              fieldEnglish: 'Email',
              fieldArabic: 'البريد الإلكتروني',
              value: email,
            },
            requestType: {
              fieldEnglish: 'Request Type',
              fieldArabic: 'نوع الطلب',
              value: 'Direct sign-up without assessment form',
            },
          },
          directSignup: {
            fullName: {
              fieldEnglish: 'Full Name',
              fieldArabic: 'الاسم الكامل',
              value: fullName,
            },
            email: {
              fieldEnglish: 'Email',
              fieldArabic: 'البريد الإلكتروني',
              value: email,
            },
            requestType: {
              fieldEnglish: 'Request Type',
              fieldArabic: 'نوع الطلب',
              value: 'Direct sign-up without assessment form',
            },
            storedBackendPath: {
              fieldEnglish: 'Stored Backend Path',
              fieldArabic: 'مسار الحفظ في قاعدة البيانات',
              value: targetPath,
            },
          },
        },
        scores: {},
        results: {
          English: { summary: 'Direct sign-up saved as a form-response row. No assessment answers were submitted.' },
          Arabic: { summary: 'تم حفظ التسجيل المباشر كصف ضمن ردود النماذج. لم يتم إرسال إجابات تقييم.' },
        },
      });

      setDirectSignupName('');
      setDirectSignupEmail('');
      setDirectSignupMessage(
        isArabicUI
          ? `تم إرسال التسجيل وحفظه في نفس مسار ردود النماذج: ${targetPath}`
          : `Sign-up submitted and saved in the same form-response path: ${targetPath}`,
      );
    } catch (err) {
      console.error(err);
      setDirectSignupError(isArabicUI ? 'تعذر إرسال طلب التسجيل.' : 'Unable to submit the sign-up request.');
    } finally {
      setDirectSignupLoading(false);
    }
  };

  const handleUserLinkagePasscode = (event: React.FormEvent) => {
    event.preventDefault();
    setLinkageMessage(null);

    if (linkagePasscode.trim() !== USER_LINKAGE_PASSCODE) {
      setIsLinkageUnlocked(false);
      setLinkageError(isArabicUI ? 'رمز المرور غير صحيح.' : 'Incorrect passcode.');
      return;
    }

    setIsLinkageUnlocked(true);
    setLinkageError(null);
  };

  const loadLinkageRows = async (form: FormDef) => {
    setSelectedLinkageFormId(form.id);
    setLinkageLoading(true);
    setLinkageError(null);
    setLinkageMessage(null);

    try {
      const snapshot = await get(ref(database, `${firebaseResponsePath(form)}/`));
      const rows = buildLinkageRows(form, snapshot.val());

      setLinkageRowsByForm(previous => ({ ...previous, [form.id]: rows }));
      setIdentifierDrafts(previous => ({
        ...previous,
        ...Object.fromEntries(rows.map(row => [linkageDraftKey(row.formId, row.key), row.userIdentifier])),
      }));
      setFormIdDrafts(previous => ({
        ...previous,
        ...Object.fromEntries(rows.map(row => [linkageDraftKey(row.formId, row.key), row.databaseFormId])),
      }));
    } catch (err) {
      console.error(err);
      setLinkageError(isArabicUI ? 'تعذر تحميل ردود النموذج من قاعدة البيانات.' : 'Unable to load form responses from the database.');
    } finally {
      setLinkageLoading(false);
    }
  };

  const saveUserIdentifier = async (row: LinkageRow) => {
    const draftKey = linkageDraftKey(row.formId, row.key);
    const userIdentifier = String(identifierDrafts[draftKey] ?? '').trim();
    const databaseFormId = String(formIdDrafts[draftKey] ?? '').trim();

    if (!userIdentifier && !databaseFormId) {
      setLinkageError(isArabicUI ? 'أدخل معرّف المستخدم أو اختر رقم النموذج قبل الحفظ.' : 'Enter a user identifier or choose a form ID before saving.');
      return;
    }

    if (databaseFormId && !SUPPORTED_LINKAGE_FORM_IDS.includes(databaseFormId)) {
      setLinkageError(isArabicUI ? 'رقم النموذج المدعوم يجب أن يكون 0 أو 1 فقط.' : 'Supported form ID must be 0 or 1 only.');
      return;
    }

    setLinkageSavingKey(draftKey);
    setLinkageError(null);
    setLinkageMessage(null);

    try {
      const updatedAt = Date.now();
      const updatedAtISO = new Date().toISOString();
      const updates: Record<string, unknown> = {
        userLinkage: {
          userIdentifier,
          databaseFormId,
          updatedAt,
          updatedAtISO,
        },
      };

      if (userIdentifier) {
        updates.userIdentifier = userIdentifier;
        updates.linkedUserIdentifier = userIdentifier;
        updates['fields/userLinkage/userIdentifier'] = {
          fieldEnglish: 'User Identifier',
          fieldArabic: 'معرّف المستخدم',
          value: userIdentifier,
          updatedAt,
          updatedAtISO,
        };
      }

      if (databaseFormId) {
        updates.formId = databaseFormId;
        updates.databaseFormId = databaseFormId;
        updates.linkedFormId = databaseFormId;
        updates['fields/userLinkage/formId'] = {
          fieldEnglish: 'Form ID',
          fieldArabic: 'رقم النموذج',
          value: databaseFormId,
          updatedAt,
          updatedAtISO,
        };
      }

      await update(ref(database, `${row.path}/${row.key}`), updates);

      setLinkageRowsByForm(previous => ({
        ...previous,
        [row.formId]: (previous[row.formId] || []).map(item =>
          item.key === row.key ? { ...item, userIdentifier: userIdentifier || item.userIdentifier, databaseFormId: databaseFormId || item.databaseFormId } : item,
        ),
      }));
      setLinkageMessage(isArabicUI ? 'تم حفظ بيانات الربط.' : 'Linkage data saved.');
    } catch (err) {
      console.error(err);
      setLinkageError(isArabicUI ? 'تعذر حفظ بيانات الربط.' : 'Unable to save the linkage data.');
    } finally {
      setLinkageSavingKey(null);
    }
  };


  const toggleResponsePreview = (row: LinkageRow) => {
    const draftKey = linkageDraftKey(row.formId, row.key);
    setExpandedPreviewKeys(previous => ({
      ...previous,
      [draftKey]: !previous[draftKey],
    }));
  };

  const deleteLinkageRow = async (row: LinkageRow) => {
    const draftKey = linkageDraftKey(row.formId, row.key);
    const confirmMessage = isArabicUI
      ? `هل أنت متأكد من حذف رد ${row.fullName || row.email || row.key}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Delete the response for ${row.fullName || row.email || row.key}? This cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    setLinkageDeletingKey(draftKey);
    setLinkageError(null);
    setLinkageMessage(null);

    try {
      await remove(ref(database, `${row.path}/${row.key}`));

      setLinkageRowsByForm(previous => ({
        ...previous,
        [row.formId]: (previous[row.formId] || []).filter(item => item.key !== row.key),
      }));

      setIdentifierDrafts(previous => {
        const next = { ...previous };
        delete next[draftKey];
        return next;
      });

      setFormIdDrafts(previous => {
        const next = { ...previous };
        delete next[draftKey];
        return next;
      });

      setExpandedPreviewKeys(previous => {
        const next = { ...previous };
        delete next[draftKey];
        return next;
      });

      setLinkageMessage(isArabicUI ? 'تم حذف الرد.' : 'Response deleted.');
    } catch (err) {
      console.error(err);
      setLinkageError(isArabicUI ? 'تعذر حذف الرد.' : 'Unable to delete the response.');
    } finally {
      setLinkageDeletingKey(null);
    }
  };


  const sendIdentifierEmailForRow = async (row: LinkageRow, options?: { silent?: boolean }): Promise<boolean> => {
    const draftKey = linkageDraftKey(row.formId, row.key);
    const userIdentifier = row.userIdentifier.trim();
    const email = row.email.trim();

    if (!userIdentifier) {
      if (!options?.silent) setLinkageError(isArabicUI ? 'لا يوجد معرّف حالي لهذا الصف. احفظ المعرّف أولاً.' : 'This row has no current identifier. Save the identifier first.');
      return false;
    }

    if (!isUsableEmail(email)) {
      if (!options?.silent) setLinkageError(isArabicUI ? 'لا يوجد بريد إلكتروني صالح لهذا الصف.' : 'This row does not have a valid email address.');
      return false;
    }

    setLinkageEmailSendingKey(draftKey);
    if (!options?.silent) {
      setLinkageError(null);
      setLinkageMessage(null);
    }

    try {
      const sentAt = Date.now();
      const sentAtISO = new Date().toISOString();
      const language = row.fillingLanguage || 'English';
      const htmlBody = buildIdentifierSharingEmailHtml({ row, userIdentifier, lang: language });

      const emailJsResponse = await sendEmailViaEmailJs({
        to: email,
        subject: IDENTIFIER_EMAIL_SUBJECT,
        fullName: row.fullName === 'N/A' ? '' : row.fullName,
        htmlBody,
        replyToEmail: '',
      });

      await update(ref(database, `${row.path}/${row.key}`), {
        identifierEmailSentAt: sentAt,
        identifierEmailSentAtISO: sentAtISO,
        identifierEmailLanguage: language,
        identifierEmailSubject: IDENTIFIER_EMAIL_SUBJECT,
        userLinkage: {
          ...(row.raw.userLinkage && typeof row.raw.userLinkage === 'object' && !Array.isArray(row.raw.userLinkage) ? row.raw.userLinkage as Record<string, unknown> : {}),
          identifierEmailSentAt: sentAt,
          identifierEmailSentAtISO: sentAtISO,
          identifierEmailLanguage: language,
        },
      });

      await push(ref(database, 'emailJsSendLogs/'), {
        recipientEmail: email,
        subject: IDENTIFIER_EMAIL_SUBJECT,
        fullName: row.fullName,
        sentUsing: 'EmailJS',
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID,
        formId: row.databaseFormId || row.formId,
        responseKey: row.key,
        emailType: 'identifierSharing',
        userIdentifier,
        language,
        sentAt,
        sentAtISO,
        emailJsResponse: {
          status: emailJsResponse.status,
          text: emailJsResponse.text,
        },
      });

      setLinkageRowsByForm(previous => ({
        ...previous,
        [row.formId]: (previous[row.formId] || []).map(item =>
          item.key === row.key ? { ...item, identifierEmailSentAt: sentAt } : item,
        ),
      }));

      if (!options?.silent) setLinkageMessage(isArabicUI ? 'تم إرسال بريد المعرّف.' : 'Identifier email sent.');
      return true;
    } catch (err) {
      console.error(err);
      if (!options?.silent) setLinkageError(isArabicUI ? 'تعذر إرسال بريد المعرّف.' : 'Unable to send the identifier email.');
      return false;
    } finally {
      setLinkageEmailSendingKey(null);
    }
  };

  const sendIdentifierEmailsToAll = async () => {
    if (!selectedLinkageFormId) return;

    const rows = uniqueRowsWithCurrentIdentifier(linkageRowsByForm[selectedLinkageFormId] || []);

    if (rows.length === 0) {
      setLinkageError(isArabicUI ? 'لا توجد صفوف فريدة تحتوي على معرّف حالي وبريد إلكتروني صالح.' : 'No unique rows found with a current identifier and valid email.');
      return;
    }

    const confirmMessage = isArabicUI
      ? `سيتم إرسال بريد المعرّف إلى ${rows.length} صف/معرّف فريد. هل تريد المتابعة؟`
      : `Send identifier emails to ${rows.length} unique current identifiers?`;

    if (!window.confirm(confirmMessage)) return;

    setLinkageEmailSendingAll(true);
    setLinkageError(null);
    setLinkageMessage(null);

    let sentCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      const sent = await sendIdentifierEmailForRow(row, { silent: true });
      if (sent) sentCount += 1;
      else failedCount += 1;
    }

    setLinkageEmailSendingAll(false);

    if (failedCount > 0) {
      setLinkageError(isArabicUI ? `تم إرسال ${sentCount} بريد، وفشل إرسال ${failedCount}.` : `${sentCount} emails sent, ${failedCount} failed.`);
      return;
    }

    setLinkageMessage(isArabicUI ? `تم إرسال ${sentCount} بريد معرّف بنجاح.` : `${sentCount} identifier emails sent successfully.`);
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedForm || !result) return;

    setError(null);

    if (!validate(selectedForm, answers)) {
      setError(t(selectedForm.validation?.errorKey || 'assessment.completeFields'));
      return;
    }

    setLoading(true);

    try {
      const submittedAt = getEasternTime(selectedForm);
      const englishResult = buildResult(selectedForm, answers, t, 'en');
      const arabicResult = buildResult(selectedForm, answers, t, 'ar');
      const fields = buildFieldsPayload(selectedForm, answers, t, langCode);

      const record = {
        tableNameEquivalent: selectedForm.firebase?.tableNameEquivalent || selectedForm.id,
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        createdAtEasternTime: submittedAt,
        interfaceLanguageUsed: interfaceLanguage,
        formId: selectedForm.id,
        fields,
        scores: Object.fromEntries(
          (selectedForm.calculations || [])
            .filter(rule => rule.type === 'sumGroups' || rule.type === 'fieldScores')
            .map(rule => [rule.id, scoreMap(result.calculations[rule.id])]),
        ),
        results: {
          English: {
            ...englishResult.cardValues,
            summary: englishResult.summary,
          },
          Arabic: {
            ...arabicResult.cardValues,
            summary: arabicResult.summary,
          },
        },
      };

      await push(ref(database, `${selectedForm.firebase?.path || 'form'}/`), record);

      const emailField = String(answers.email || '').trim();
      if (selectedForm.email?.enabled && emailField) {
        const fullName = String(answers.fullName || answers.name || '');
        const formName = cardTitle(selectedForm, t, langCode);
        const emailSubject = formName;

        const fullReportHtml = buildFullReportHtml({
          form: selectedForm,
          answers,
          result,
          lang: interfaceLanguage,
          langCode,
          submittedAt,
          t,
        });

        const cards = (selectedForm.results?.display?.cards || []).map(card => ({
          label: resultCardLabel(t, card, langCode),
          value: result.cardValues[card.id] || '',
        }));

        const htmlBody = buildAssessmentEmailHtml({
          form: selectedForm,
          lang: interfaceLanguage,
          fullName,
          surveyDate: String(answers.surveyDate || ''),
          interfaceLanguageUsed: interfaceLanguage,
          submittedAt,
          cards,
          fullReportHtml,
        });

        const recipients = Array.from(
          new Set([
            ...(selectedForm.email.recipients || []),
            ...(selectedForm.email.includeSubmitter ? [emailField] : []),
          ].filter(Boolean)),
        );

        for (const recipientEmail of recipients) {
          const emailJsResponse = await sendEmailViaEmailJs({
            to: recipientEmail,
            subject: emailSubject,
            fullName,
            htmlBody,
            replyToEmail: emailField,
          });

          await push(ref(database, 'emailJsSendLogs/'), {
            recipientEmail,
            subject: emailSubject,
            fullName,
            sentUsing: 'EmailJS',
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID,
            formId: selectedForm.id,
            sentAt: Date.now(),
            sentAtISO: new Date().toISOString(),
            sentAtEasternTime: getEasternTime(selectedForm),
            emailJsResponse: {
              status: emailJsResponse.status,
              text: emailJsResponse.text,
            },
          });
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError('The form was saved, but EmailJS sending failed. Check the EmailJS service ID, template ID, public key, and browser console.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FieldDef, section?: SectionDef) => {
    if (!selectedForm) return null;

    const baseClass = 'w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]';

    if (field.type === 'textarea') {
      return (
        <textarea
          required={Boolean(field.required)}
          className={baseClass}
          style={{ minHeight: '112px', resize: 'vertical' }}
          value={String(answers[field.id] || '')}
          onChange={event => setAnswer(field.id, event.target.value)}
        />
      );
    }

    if (field.type === 'rating') {
      return (
        <div className="grid grid-cols-5 gap-[10px]">
          {ratingRange(selectedForm, section).map(num => (
            <label
              key={num}
              className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                answers[field.id] === num
                  ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]'
                  : 'bg-[#fafafa] border-[#ddd]'
              }`}
            >
              <input
                type="radio"
                name={`${selectedForm.id}-${field.id}`}
                value={num}
                className="absolute opacity-0 pointer-events-none"
                checked={answers[field.id] === num}
                onChange={() => setAnswer(field.id, num)}
              />
              <span className={`grid place-items-center w-full h-full font-bold ${answers[field.id] === num ? 'text-white' : 'text-[#444]'}`}>
                {num}
              </span>
            </label>
          ))}
        </div>
      );
    }

    return (
      <input
        required={Boolean(field.required)}
        type={field.type === 'email' || field.type === 'number' || field.type === 'date' ? field.type : 'text'}
        className={baseClass}
        value={String(answers[field.id] || '')}
        onChange={event => setAnswer(field.id, event.target.value)}
      />
    );
  };

  const renderSection = (section: SectionDef) => {
    if (!selectedForm) return null;

    return (
      <section key={section.id} className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
        <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">
          {sectionTitle(t, section, langCode)}
        </h2>

        {section.guide && (
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {localText(section.guide, langCode)}
          </div>
        )}

        {(section.guideKeys || []).map(key => (
          <div key={key} className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {t(key)}
          </div>
        ))}

        {section.type === 'groupedRating' ? (
          (section.groups || []).map(group => (
            <div key={group.id} className="mt-[18px]">
              <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold">
                {groupTitle(t, group, langCode)}
              </h3>

              {(group.fields || []).map(field => (
                <div key={field.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                  <p className="font-bold m-0 mb-[14px] text-[#333]">
                    {field.id}. {fieldLabel(t, field, langCode)}
                  </p>
                  {renderField(field, section)}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className={section.layout === 'twoColumns' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-[22px]'}>
            {(section.fields || []).map(field => (
              <div
                key={field.id}
                className={section.type === 'ratingList'
                  ? 'border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]'
                  : 'mb-[18px]'}
              >
                <label className="block font-bold mb-[7px] text-[#333]">
                  {section.type === 'ratingList' ? `${field.id}. ` : ''}
                  {fieldLabel(t, field, langCode)}
                  {field.required && <span className="text-[#8b1e1e]"> *</span>}
                </label>
                {renderField(field, section)}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  if (!selectedForm && activePage === 'userLinkage') {
    const selectedLinkageForm = LINKAGE_SOURCES.find(item => item.id === selectedLinkageFormId) || null;
    const linkageRows = selectedLinkageFormId ? linkageRowsByForm[selectedLinkageFormId] || [] : [];

    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <PageTitle title={isArabicUI ? 'ربط المستخدمين' : 'User Linkage'} subtitle={isArabicUI ? 'ربط ردود النماذج بمعرّف مستخدم واحد.' : 'Member Linking: connect form responses using one user identifier.'} icon={<ClipboardList size={22} />} />

        <button
          type="button"
          onClick={handleBackToAssessmentChoices}
          className="mb-[18px] min-h-[46px] px-5 py-3 rounded-[16px] border border-[rgba(139,30,30,0.18)] bg-white text-[#8b1e1e] font-bold cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[1px] hover:bg-[#fffafa]"
        >
          {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[rgba(139,30,30,0.12)] rounded-[24px] p-[clamp(20px,4vw,34px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
        >
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="m-0 text-[#8b1e1e] text-[clamp(1.35rem,4vw,1.9rem)] font-bold">
              {isArabicUI ? 'ربط الأعضاء' : 'Member Linking'}
            </h2>
            <p className="mt-3 mb-0 text-[#666] text-[1rem] leading-relaxed">
              {isArabicUI
                ? 'اعرض ردود النموذجين كصفوف، ثم أضف أو عدّل معرّف المستخدم لربط نفس الشخص عبر النماذج.'
                : 'View both form responses as rows, then add or modify a user identifier to link the same person across forms.'}
            </p>
          </div>

          {!isLinkageUnlocked ? (
            <form onSubmit={handleUserLinkagePasscode} className="max-w-md mx-auto bg-[#fffafa] border border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px]">
              <label className="block font-bold mb-[7px] text-[#333]">
                {isArabicUI ? 'رمز المرور' : 'Passcode'}
              </label>
              <input
                type="password"
                value={linkagePasscode}
                onChange={event => setLinkagePasscode(event.target.value)}
                className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
              />
              {linkageError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold mt-4">{linkageError}</div>}
              <button
                type="submit"
                className="w-full min-h-[52px] mt-5 border-none bg-[#8b1e1e] text-white py-3 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.02rem]"
              >
                {isArabicUI ? 'فتح ربط المستخدمين' : 'Open User Linkage'}
              </button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mb-6">
                {LINKAGE_SOURCES.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadLinkageRows(item)}
                    className={`group relative text-start min-h-[150px] border-2 rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)] ${
                      selectedLinkageFormId === item.id
                        ? 'bg-[#f8eeee] border-[#8b1e1e]'
                        : 'bg-[#fffafa] border-[rgba(139,30,30,0.16)]'
                    }`}
                  >
                    <div
                      className="absolute top-4 w-9 h-9 rounded-full bg-[#8b1e1e] text-white grid place-items-center text-[1rem] font-bold shadow-[0_8px_18px_rgba(139,30,30,0.24)]"
                      style={dir === 'rtl' ? { right: '16px' } : { left: '16px' }}
                    >
                      {index + 1}
                    </div>

                    <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]" style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}>
                      <ClipboardList size={22} />
                    </div>

                    <div className="text-[#8b1e1e] text-[1.18rem] font-bold mb-2">
                      {cardTitle(item, t, langCode)}
                    </div>

                    <p className="m-0 text-[#666] text-sm leading-relaxed">
                      {isArabicUI ? 'عرض الردود كصفوف للاسم والبريد الإلكتروني ومعرّف المستخدم.' : 'View responses as rows with name, email, and user identifier.'}
                    </p>
                  </button>
                ))}
              </div>

              {linkageError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold mb-4">{linkageError}</div>}
              {linkageMessage && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-[14px] font-bold mb-4">{linkageMessage}</div>}

              {selectedLinkageForm && (
                <div className="border border-[rgba(139,30,30,0.12)] rounded-[22px] overflow-hidden bg-[#fffafa]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-[rgba(139,30,30,0.12)] bg-[#f8eeee]">
                    <div>
                      <h3 className="m-0 text-[#641414] text-[1.1rem] font-bold">
                        {cardTitle(selectedLinkageForm, t, langCode)}
                      </h3>
                      <p className="m-0 mt-1 text-[#666] text-sm">
                        {isArabicUI ? `المسار: ${firebaseResponsePath(selectedLinkageForm)}` : `Database path: ${firebaseResponsePath(selectedLinkageForm)}`}
                      </p>
                      <p className="m-0 mt-2 text-red-700 text-sm font-bold">
                        {isArabicUI
                          ? 'زر حذف الصف موجود داخل كل صف ويحذف الرد من Firebase بعد التأكيد.'
                          : 'Each row has a Delete Row button that removes that response from Firebase after confirmation.'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={sendIdentifierEmailsToAll}
                        disabled={linkageEmailSendingAll || linkageLoading}
                        className="min-h-[42px] px-4 py-2 rounded-[14px] border-none bg-[#8b1e1e] text-white font-bold cursor-pointer shadow-[0_6px_14px_rgba(139,30,30,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {linkageEmailSendingAll ? (isArabicUI ? 'جار الإرسال...' : 'Sending...') : (isArabicUI ? 'إرسال المعرّفات للكل' : 'Send all identifier emails')}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadLinkageRows(selectedLinkageForm)}
                        disabled={linkageLoading || linkageEmailSendingAll}
                        className="min-h-[42px] px-4 py-2 rounded-[14px] border border-[rgba(139,30,30,0.18)] bg-white text-[#8b1e1e] font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {linkageLoading ? (isArabicUI ? 'جار التحميل...' : 'Loading...') : (isArabicUI ? 'تحديث الصفوف' : 'Refresh rows')}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1540px]">
                      <thead>
                        <tr className="bg-white text-[#641414]">
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'الاسم' : 'Name'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'البريد الإلكتروني' : 'Email'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'المعرّف الحالي' : 'Current Identifier'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'تعديل معرّف المستخدم' : 'Modify User Identifier'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'رقم النموذج' : 'Form ID'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'لغة البريد' : 'Email Language'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'وقت الإرسال' : 'Submitted'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'معاينة' : 'Preview'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'إرسال المعرّف' : 'Send Identifier'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'حفظ' : 'Save'}</th>
                          <th className="text-start p-3 border-b border-[#ead1d1] text-sm">{isArabicUI ? 'حذف الصف' : 'Delete Row'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkageRows.length === 0 && !linkageLoading && (
                          <tr>
                            <td colSpan={11} className="p-5 text-center text-[#666] font-bold">
                              {isArabicUI ? 'لا توجد ردود لهذا النموذج.' : 'No responses found for this form.'}
                            </td>
                          </tr>
                        )}

                        {linkageRows.map(row => {
                          const draftKey = linkageDraftKey(row.formId, row.key);
                          const savingThisRow = linkageSavingKey === draftKey;
                          const deletingThisRow = linkageDeletingKey === draftKey;
                          const emailingThisRow = linkageEmailSendingKey === draftKey;
                          const previewOpen = Boolean(expandedPreviewKeys[draftKey]);

                          return (
                            <React.Fragment key={row.key}>
                              <tr className="bg-white border-b border-[#eeeeee] align-top">
                                <td className="p-3 text-[#242424] font-bold min-w-[180px]">
                                  <div>{row.fullName}</div>
                                  <button
                                    type="button"
                                    onClick={() => deleteLinkageRow(row)}
                                    disabled={savingThisRow || deletingThisRow || emailingThisRow || linkageEmailSendingAll}
                                    className="min-h-[34px] mt-2 px-3 py-1 rounded-[10px] border-none bg-red-600 text-white text-xs font-bold cursor-pointer shadow-[0_5px_12px_rgba(220,38,38,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {deletingThisRow ? (isArabicUI ? 'حذف...' : 'Deleting...') : (isArabicUI ? 'حذف الصف' : 'Delete Row')}
                                  </button>
                                </td>
                                <td className="p-3 text-[#242424]">{row.email}</td>
                                <td className="p-3 text-[#641414] font-bold">{row.userIdentifier || '-'}</td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={identifierDrafts[draftKey] ?? row.userIdentifier}
                                    onChange={event => setIdentifierDrafts(previous => ({ ...previous, [draftKey]: event.target.value }))}
                                    placeholder={isArabicUI ? 'مثال: member-001' : 'Example: member-001'}
                                    className="w-full px-[12px] py-[10px] border border-[#ddd] rounded-[12px] text-[0.95rem] bg-white text-[#242424] outline-none focus:border-[#8b1e1e] focus:shadow-[0_0_0_3px_rgba(139,30,30,0.10)]"
                                  />
                                </td>
                                <td className="p-3">
                                  <select
                                    value={formIdDrafts[draftKey] ?? row.databaseFormId}
                                    onChange={event => setFormIdDrafts(previous => ({ ...previous, [draftKey]: event.target.value }))}
                                    className="w-full px-[12px] py-[10px] border border-[#ddd] rounded-[12px] text-[0.95rem] bg-white text-[#242424] outline-none focus:border-[#8b1e1e] focus:shadow-[0_0_0_3px_rgba(139,30,30,0.10)]"
                                  >
                                    <option value="">{isArabicUI ? 'اختر' : 'Select'}</option>
                                    {SUPPORTED_LINKAGE_FORM_IDS.map(formIdOption => (
                                      <option key={formIdOption} value={formIdOption}>
                                        {formIdOption}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3 text-[#641414] text-sm font-bold whitespace-nowrap">{row.fillingLanguage}</td>
                                <td className="p-3 text-[#666] text-sm whitespace-nowrap">{row.createdAtEasternTime || '-'}</td>
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleResponsePreview(row)}
                                    className="min-h-[38px] px-4 py-2 rounded-[12px] border border-[rgba(139,30,30,0.22)] bg-white text-[#8b1e1e] font-bold cursor-pointer shadow-[0_6px_14px_rgba(0,0,0,0.05)]"
                                  >
                                    {previewOpen ? (isArabicUI ? 'إخفاء' : 'Collapse') : (isArabicUI ? 'معاينة' : 'Preview')}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => sendIdentifierEmailForRow(row)}
                                    disabled={savingThisRow || deletingThisRow || emailingThisRow || linkageEmailSendingAll || !row.userIdentifier || !isUsableEmail(row.email)}
                                    className="min-h-[38px] px-4 py-2 rounded-[12px] border-none bg-[#641414] text-white font-bold cursor-pointer shadow-[0_6px_14px_rgba(100,20,20,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {emailingThisRow ? (isArabicUI ? 'إرسال...' : 'Sending...') : (isArabicUI ? 'إرسال' : 'Send')}
                                  </button>
                                  {row.identifierEmailSentAt && (
                                    <div className="mt-2 text-[11px] text-green-700 font-bold">
                                      {isArabicUI ? 'تم الإرسال سابقاً' : 'Sent before'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => saveUserIdentifier(row)}
                                    disabled={savingThisRow || deletingThisRow || emailingThisRow || linkageEmailSendingAll}
                                    className="min-h-[38px] px-4 py-2 rounded-[12px] border-none bg-[#8b1e1e] text-white font-bold cursor-pointer shadow-[0_6px_14px_rgba(139,30,30,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {savingThisRow ? (isArabicUI ? 'حفظ...' : 'Saving...') : (isArabicUI ? 'حفظ' : 'Save')}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => deleteLinkageRow(row)}
                                    disabled={savingThisRow || deletingThisRow || emailingThisRow || linkageEmailSendingAll}
                                    className="min-h-[38px] px-4 py-2 rounded-[12px] border-none bg-red-600 text-white font-bold cursor-pointer shadow-[0_6px_14px_rgba(220,38,38,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {deletingThisRow ? (isArabicUI ? 'حذف...' : 'Deleting...') : (isArabicUI ? 'حذف الصف' : 'Delete Row')}
                                  </button>
                                </td>
                              </tr>

                              {previewOpen && (
                                <tr className="bg-[#fffafa] border-b border-[#eeeeee]">
                                  <td colSpan={11} className="p-4">
                                    <div className="border border-[rgba(139,30,30,0.14)] rounded-[16px] bg-white overflow-hidden">
                                      <div className="px-4 py-3 bg-[#f8eeee] text-[#641414] font-bold">
                                        {isArabicUI ? 'معاينة الرد الكامل' : 'Full response preview'}
                                      </div>
                                      <pre className="m-0 p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-[#242424] bg-white">
                                        {JSON.stringify(row.raw, null, 2)}
                                      </pre>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (!selectedForm) {
    const firstForm = FORMS[0];

    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <PageTitle title={firstForm ? pageTitle(firstForm, t, langCode) : t('assessment.title')} subtitle={firstForm ? pageSubtitle(firstForm, t, langCode) : t('assessment.program')} icon={<ClipboardList size={22} />} />



        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[rgba(139,30,30,0.12)] rounded-[24px] p-[clamp(20px,4vw,34px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
        >
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="m-0 text-[#8b1e1e] text-[clamp(1.35rem,4vw,1.9rem)] font-bold">
              {isArabicUI ? 'اختر نموذج التقييم' : 'Choose Assessment Form'}
            </h2>
            <p className="mt-3 mb-0 text-[#666] text-[1rem] leading-relaxed">
              {isArabicUI ? 'اختر نموذج التقييم الذي تريد تعبئته.' : 'Choose the assessment form you want to complete.'}
            </p>
          </div>

          <form onSubmit={handleDirectSignup} className="mb-8 bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
              <div>
                <h3 className="m-0 text-[#8b1e1e] text-[1.28rem] font-bold">
                  {isArabicUI ? 'التسجيل بدون تعبئة نموذج' : 'Sign up without filling a form'}
                </h3>
                <p className="m-0 mt-2 text-[#666] text-sm leading-relaxed">
                  {isArabicUI
                    ? 'أرسل الاسم والبريد الإلكتروني فقط. سيتم حفظه في نفس مسار ردود النماذج حتى تستخدمه باقي الخدمات، وسيظهر أيضاً في صفحة ربط المستخدمين.'
                    : 'Submit only name and email. This saves the row in the same form-response backend path used by the other services, and it will also appear in User Linkage.'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center shrink-0 shadow-[0_8px_18px_rgba(139,30,30,0.22)]" style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}>
                <ClipboardList size={22} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-[7px] text-[#333]">
                  {isArabicUI ? 'الاسم الكامل' : 'Full Name'} <span className="text-[#8b1e1e]">*</span>
                </label>
                <input
                  type="text"
                  value={directSignupName}
                  onChange={event => setDirectSignupName(event.target.value)}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                />
              </div>
              <div>
                <label className="block font-bold mb-[7px] text-[#333]">
                  {isArabicUI ? 'البريد الإلكتروني' : 'Email'} <span className="text-[#8b1e1e]">*</span>
                </label>
                <input
                  type="email"
                  value={directSignupEmail}
                  onChange={event => setDirectSignupEmail(event.target.value)}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                />
              </div>
            </div>

            {directSignupError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold mt-4">{directSignupError}</div>}
            {directSignupMessage && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-[14px] font-bold mt-4">{directSignupMessage}</div>}

            <button
              type="submit"
              disabled={directSignupLoading}
              className="w-full min-h-[52px] mt-5 border-none bg-[#8b1e1e] text-white py-3 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.02rem] disabled:cursor-not-allowed disabled:opacity-70 disabled:translate-y-0"
            >
              {directSignupLoading ? (isArabicUI ? 'جارٍ الإرسال...' : 'Submitting...') : (isArabicUI ? 'إرسال التسجيل' : 'Submit Sign-Up')}
            </button>
          </form>

          <div className="mb-4">
            <h3 className="m-0 text-[#641414] text-[1.1rem] font-bold">
              {isArabicUI ? 'نماذج التقييم' : 'Assessment Forms'}
            </h3>
            <p className="m-0 mt-1 text-[#666] text-sm">
              {isArabicUI ? 'هذه هي النماذج الكاملة فقط.' : 'These are the full forms only.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            {FORMS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectForm(item.id)}
                className="group relative text-start min-h-[190px] bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]"
              >
                <div
                  className="absolute top-4 w-9 h-9 rounded-full bg-[#8b1e1e] text-white grid place-items-center text-[1rem] font-bold shadow-[0_8px_18px_rgba(139,30,30,0.24)]"
                  style={dir === 'rtl' ? { right: '16px' } : { left: '16px' }}
                >
                  {index + 1}
                </div>

                <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]" style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}>
                  <ClipboardList size={22} />
                </div>

                <div className="text-[#8b1e1e] text-[1.28rem] font-bold mb-3">
                  {cardTitle(item, t, langCode)}
                </div>

                <p className="m-0 text-[#666] text-sm leading-relaxed">
                  {cardDescription(item, t, langCode)}
                </p>
              </button>
            ))}

            <button
              type="button"
              onClick={openUserLinkage}
              className="group relative text-start min-h-[190px] bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]"
            >
              <div
                className="absolute top-4 w-9 h-9 rounded-full bg-[#8b1e1e] text-white grid place-items-center text-[1rem] font-bold shadow-[0_8px_18px_rgba(139,30,30,0.24)]"
                style={dir === 'rtl' ? { right: '16px' } : { left: '16px' }}
              >
                {FORMS.length + 1}
              </div>

              <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]" style={dir === 'rtl' ? { marginRight: 'auto' } : { marginLeft: 'auto' }}>
                <ClipboardList size={22} />
              </div>

              <div className="text-[#8b1e1e] text-[1.28rem] font-bold mb-3">
                {isArabicUI ? 'ربط المستخدمين' : 'User Linkage'}
              </div>

              <p className="m-0 text-[#666] text-sm leading-relaxed">
                {isArabicUI ? 'قسم محمي لربط ردود النماذج بمعرّف مستخدم واحد.' : 'Protected member linking section for connecting form responses with one user identifier.'}
              </p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5">
            {resultTitle(selectedForm, t, langCode)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
            {(selectedForm.results?.display?.cards || []).map(card => (
              <div key={card.id} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
                <span className="block text-[#666] font-bold mb-1 text-sm">
                  {resultCardLabel(t, card, langCode)}
                </span>
                <strong className="text-[#641414] text-[1.05rem]">
                  {result.cardValues[card.id]}
                </strong>
              </div>
            ))}
          </div>

          <div className="bg-[#fffafa] border-l-4 border-[#8b1e1e] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]" style={{ [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e', [dir === 'rtl' ? 'borderLeft' : 'borderRight']: 'none' }}>
            {result.summary}
          </div>

          {(selectedForm.results?.display?.scoreBlocks || []).map(block => {
            const source = scoreMap(result.calculations[block.sourceCalculation]);
            const sourceSection = calculationSourceSection(selectedForm, block.sourceCalculation);
            const section = getSection(selectedForm, sourceSection);
            const items = section?.groups?.length
              ? (section.groups || []).map(group => ({ id: group.id, label: groupTitle(t, group, langCode), score: source[group.id] || 0 }))
              : (section?.fields || []).map(field => ({ id: field.id, label: fieldLabel(t, field, langCode), score: source[field.id] || 0 }));

            return (
              <React.Fragment key={block.id}>
                <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">
                  {translateOrText(t, block.titleKey, block.title, langCode, block.id)}
                </h3>
                <div className="grid gap-[10px] mb-[18px]">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                      <span className="text-[#242424]">{item.label}</span>
                      <strong className="text-[#641414] whitespace-nowrap">{item.score} / {block.maxScore || 5}</strong>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </motion.div>

        <button
          onClick={resetForRetake}
          className="w-full min-h-[56px] mt-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem]"
        >
          {t('assessment.takeAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle title={pageTitle(selectedForm, t, langCode)} subtitle={pageSubtitle(selectedForm, t, langCode)} icon={<ClipboardList size={22} />} />

      <button
        type="button"
        onClick={handleBackToAssessmentChoices}
        className="mb-[18px] min-h-[46px] px-5 py-3 rounded-[16px] border border-[rgba(139,30,30,0.18)] bg-white text-[#8b1e1e] font-bold cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[1px] hover:bg-[#fffafa]"
      >
        {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">{error}</div>}

        {selectedForm.sections.map(renderSection)}

        <button type="submit" disabled={loading} className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0">
          {loading ? t('assessment.submitting') : t('assessment.submit')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">
          {t(selectedForm.page?.confidentialKey || 'assessment.confidential')}
        </p>
      </form>
    </div>
  );
}
