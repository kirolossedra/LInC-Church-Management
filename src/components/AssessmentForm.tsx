import React, { useMemo, useState } from 'react';
import YAML from 'yaml';
import { database } from '../firebase';
import { ref, push } from 'firebase/database';
import { motion } from 'motion/react';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '../i18n';
import fiveServicePathwaysYaml from './five-service-pathways.yml?raw';
import spiritualGiftsDiscoveryYaml from './spiritual-gifts-discovery.yml?raw';

const BREVO_API_KEY = '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';
const BREVO_SEND_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDER_NAME = 'Linc ministry';
const BREVO_SENDER_EMAIL = 'lincministry.ca@gmail.com';

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

const FORMS = [fiveServicePathwaysYaml, spiritualGiftsDiscoveryYaml]
  .map(raw => YAML.parse(raw) as FormDef)
  .filter(form => form.status !== 'disabled');

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

function buildFullReport(params: {
  form: FormDef;
  answers: Answers;
  result: RuntimeResult;
  lang: InterfaceLang;
  langCode: Lang;
  submittedAt: string;
  t: (key: string) => string;
}): string {
  const { form, answers, result, lang, langCode, submittedAt, t } = params;
  const labels = lang === 'Arabic'
    ? {
        title: localText(form.results?.display?.title, 'ar', 'نتيجة التقييم'),
        submittedAt: 'وقت الإرسال',
        interfaceLanguageUsed: 'لغة النموذج المستخدمة',
        results: 'النتائج',
        answer: 'الإجابة',
        score: 'الدرجة',
        totalScore: 'الدرجة الإجمالية',
        notAvailable: 'غير متوفر',
      }
    : {
        title: localText(form.results?.display?.title, 'en', 'ASSESSMENT RESPONSE'),
        submittedAt: 'Submitted At',
        interfaceLanguageUsed: 'Interface Language Used',
        results: 'RESULTS',
        answer: 'Answer',
        score: 'Score',
        totalScore: 'Total Score',
        notAvailable: 'N/A',
      };

  const lines: string[] = [
    labels.title,
    '=========================================',
    '',
    `${labels.submittedAt}: ${submittedAt}`,
    `${labels.interfaceLanguageUsed}: ${lang}`,
    '',
    labels.results,
    '-------------------------------',
  ];

  (form.results?.display?.cards || []).forEach(card => {
    lines.push(`${resultCardLabel(t, card, langCode)}: ${result.cardValues[card.id] || labels.notAvailable}`);
  });

  lines.push('', result.summary, '');

  for (const section of form.sections) {
    lines.push('', sectionTitle(t, section, langCode).toUpperCase(), '-------------------------------');

    if (section.type === 'fields') {
      (section.fields || []).forEach(field => lines.push(`${fieldLabel(t, field, langCode)}: ${answers[field.id] || labels.notAvailable}`));
      continue;
    }

    if (section.type === 'groupedRating') {
      const totalCalculation = form.calculations?.find(rule => rule.type === 'sumGroups' && rule.sourceSection === section.id)?.id || '';
      const totals = scoreMap(result.calculations[totalCalculation]);

      (section.groups || []).forEach(group => {
        const max = (section.ratingScale?.max || form.defaults?.ratingScale?.max || 5) * (group.fields || []).length;
        lines.push(`${groupTitle(t, group, langCode)}\n${labels.totalScore}: ${totals[group.id] || 0}/${max}`);
        (group.fields || []).forEach(field => lines.push(`  ${field.id}. ${fieldLabel(t, field, langCode)}\n  ${labels.score}: ${numberValue(answers[field.id])}/${section.ratingScale?.max || form.defaults?.ratingScale?.max || 5}`));
        lines.push('');
      });
      continue;
    }

    if (section.type === 'ratingList') {
      (section.fields || []).forEach(field => lines.push(`${fieldLabel(t, field, langCode)}: ${numberValue(answers[field.id])}/${section.ratingScale?.max || form.defaults?.ratingScale?.max || 5}`));
    }
  }

  return lines.join('\n');
}

function buildAssessmentEmailHtml(params: {
  form: FormDef;
  lang: InterfaceLang;
  fullName: string;
  surveyDate: string;
  interfaceLanguageUsed: string;
  submittedAt: string;
  cards: { label: string; value: string }[];
  fullReport: string;
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
      <div style="white-space: pre-wrap; padding: 16px; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 10px; font-size: 14px;">${escapeHtml(params.fullReport)}</div>
    </div>
    <div style="margin-top: 22px; color: #777777; font-size: 12px;">${labels.footer}</div>
  </div>
</div>`;
}

async function sendEmailViaBrevoApi(params: {
  to: string;
  subject: string;
  htmlBody: string;
  replyToEmail?: string;
  replyToName?: string;
}) {
  const payload: Record<string, unknown> = {
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.htmlBody,
  };

  if (params.replyToEmail) {
    payload.replyTo = { email: params.replyToEmail, name: params.replyToName || params.replyToEmail };
  }

  const response = await fetch(BREVO_SEND_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) throw new Error(`Brevo API send failed: ${response.status} ${responseText}`);

  return responseText ? JSON.parse(responseText) : {};
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
    setSelectedFormId(null);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        const subjectTemplate = localText(selectedForm.email.subject, langCode, `LINC Assessment Response - {{fullName}}`);
        const emailSubject = template(subjectTemplate, { fullName });

        const fullReport = buildFullReport({
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
          fullReport,
        });

        const recipients = Array.from(
          new Set([
            ...(selectedForm.email.recipients || []),
            ...(selectedForm.email.includeSubmitter ? [emailField] : []),
          ].filter(Boolean)),
        );

        for (const recipientEmail of recipients) {
          const brevoResponse = await sendEmailViaBrevoApi({
            to: recipientEmail,
            subject: emailSubject,
            htmlBody,
            replyToEmail: emailField,
            replyToName: fullName,
          });

          await push(ref(database, 'brevoSendLogs/'), {
            recipientEmail,
            subject: emailSubject,
            sentUsing: 'Brevo API',
            senderName: BREVO_SENDER_NAME,
            senderEmail: BREVO_SENDER_EMAIL,
            formId: selectedForm.id,
            sentAt: Date.now(),
            sentAtISO: new Date().toISOString(),
            sentAtEasternTime: getEasternTime(selectedForm),
            brevoResponse,
          });
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError('The form was saved, but Brevo email sending failed. Check the Brevo sender/API key and browser console.');
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            {FORMS.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectForm(item.id)}
                className="group text-start min-h-[190px] bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]"
              >
                <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]">
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
