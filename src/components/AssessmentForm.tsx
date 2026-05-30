import React, { useMemo, useState } from 'react';
import YAML from 'yaml';
import { database } from '../firebase';
import { ref, push } from 'firebase/database';
import { motion } from 'motion/react';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '../i18n';
import formYamlRaw from './five-service-pathways.yml?raw';

const BREVO_API_KEY = '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';
const BREVO_SEND_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDER_NAME = 'Linc ministry';
const BREVO_SENDER_EMAIL = 'lincministry.ca@gmail.com';

type Lang = 'en' | 'ar';
type InterfaceLang = 'English' | 'Arabic';
type AnswerValue = string | number;
type Answers = Record<string, AnswerValue>;
type LocalText = { en?: string; ar?: string };

interface FieldDef {
  id: string;
  type: string;
  required?: boolean;
  default?: string | number;
  labelKey?: string;
  result?: LocalText;
}

interface GroupDef {
  id: string;
  titleKey?: string;
  result?: LocalText;
  fields?: FieldDef[];
}

interface SectionDef {
  id: string;
  type: 'fields' | 'groupedRating' | 'ratingList';
  titleKey?: string;
  layout?: 'twoColumns' | 'singleColumn';
  guideKeys?: string[];
  ratingScale?: { min?: number; max?: number };
  fields?: FieldDef[];
  groups?: GroupDef[];
}

interface FormDef {
  id: string;
  firebase?: { path?: string; tableNameEquivalent?: string };
  page?: { titleKey?: string; subtitleKey?: string; confidentialKey?: string };
  card?: { titleKey?: string; descriptionKey?: string };
  email?: {
    enabled?: boolean;
    recipients?: string[];
    includeSubmitter?: boolean;
    subject?: LocalText;
  };
  defaults?: { timezone?: string; ratingScale?: { min?: number; max?: number } };
  sections: SectionDef[];
  validation?: { errorKey?: string };
  results?: {
    display?: {
      titleKey?: string;
      summary?: LocalText;
      cards?: { id: string; labelKey?: string }[];
      scoreBlocks?: { id: string; titleKey?: string; sourceCalculation: string; maxScore?: number }[];
    };
  };
}

const form = YAML.parse(formYamlRaw) as FormDef;

function getEasternTime(): string {
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

function template(text: string, values: Record<string, string>): string {
  return text.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => values[key] || '');
}

function ratingRange(section?: SectionDef): number[] {
  const min = section?.ratingScale?.min ?? form.defaults?.ratingScale?.min ?? 1;
  const max = section?.ratingScale?.max ?? form.defaults?.ratingScale?.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function allFields(): FieldDef[] {
  return form.sections.flatMap(section =>
    section.groups?.length
      ? section.groups.flatMap(group => group.fields || [])
      : section.fields || [],
  );
}

function getSection(id: string): SectionDef | undefined {
  return form.sections.find(section => section.id === id);
}

function getGroup(groupId: string): GroupDef | undefined {
  return form.sections.flatMap(section => section.groups || []).find(group => group.id === groupId);
}

function getField(fieldId: string): FieldDef | undefined {
  return allFields().find(field => field.id === fieldId);
}

function label(t: (key: string) => string, field: FieldDef): string {
  return field.labelKey ? t(field.labelKey) : field.id;
}

function title(t: (key: string) => string, section: SectionDef): string {
  return section.titleKey ? t(section.titleKey) : section.id;
}

function groupTitle(t: (key: string) => string, group: GroupDef): string {
  return group.titleKey ? t(group.titleKey) : group.id;
}

function initialAnswers(): Answers {
  return Object.fromEntries(
    allFields().map(field => [
      field.id,
      field.default === 'today'
        ? new Date().toISOString().split('T')[0]
        : field.default ?? '',
    ]),
  );
}

function isFilled(value: AnswerValue | undefined): boolean {
  return typeof value === 'number' ? value > 0 : String(value ?? '').trim().length > 0;
}

function numberValue(value: AnswerValue | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function validate(answers: Answers): boolean {
  return allFields().every(field => !field.required || isFilled(answers[field.id]));
}

function calculate(answers: Answers) {
  const gifts = getSection('gifts');
  const ministry = getSection('ministry');

  const giftTotals = Object.fromEntries(
    (gifts?.groups || []).map(group => [
      group.id,
      (group.fields || []).reduce((sum, field) => sum + numberValue(answers[field.id]), 0),
    ]),
  ) as Record<string, number>;

  const ministryTotals = Object.fromEntries(
    (ministry?.fields || []).map(field => [field.id, numberValue(answers[field.id])]),
  ) as Record<string, number>;

  const rankedGifts = Object.entries(giftTotals).sort((a, b) => b[1] - a[1]);
  const rankedMinistry = Object.entries(ministryTotals).sort((a, b) => b[1] - a[1]);

  return {
    giftTotals,
    ministryTotals,
    rankedGifts,
    rankedMinistry,
    primaryGiftId: rankedGifts[0]?.[0] || '',
    secondaryGiftId: rankedGifts[1]?.[0] || '',
    recommendedMinistryId: rankedMinistry[0]?.[0] || '',
  };
}

function resultName(id: string, lang: Lang): string {
  return localText(getGroup(id)?.result || getField(id)?.result, lang, id);
}

function buildResult(answers: Answers, lang: Lang) {
  const c = calculate(answers);
  const primaryGift = resultName(c.primaryGiftId, lang);
  const secondaryGift = resultName(c.secondaryGiftId, lang);
  const recommendedMinistry = resultName(c.recommendedMinistryId, lang);

  const summaryTemplate =
    localText(form.results?.display?.summary, lang) ||
    (lang === 'ar'
      ? 'أقوى نتيجة هي {{primaryGift}}. النتيجة الثانوية هي {{secondaryGift}}. مجال الخدمة الأكثر توافقاً هو {{recommendedMinistry}}.'
      : 'The strongest result is {{primaryGift}}. The secondary result is {{secondaryGift}}. The most aligned ministry area is {{recommendedMinistry}}.');

  return {
    ...c,
    primaryGift,
    secondaryGift,
    recommendedMinistry,
    summary: template(summaryTemplate, { primaryGift, secondaryGift, recommendedMinistry }),
  };
}

function buildFieldsPayload(answers: Answers, t: (key: string) => string) {
  return Object.fromEntries(
    form.sections.map(section => {
      if (section.type === 'groupedRating') {
        return [
          section.id,
          Object.fromEntries(
            (section.groups || []).map(group => [
              group.id,
              {
                sectionEnglish: groupTitle(t, group),
                sectionArabic: groupTitle(t, group),
                questions: Object.fromEntries(
                  (group.fields || []).map(field => [
                    field.id,
                    {
                      questionEnglish: label(t, field),
                      questionArabic: label(t, field),
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
                areaEnglish: label(t, field),
                areaArabic: label(t, field),
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
                  fieldEnglish: label(t, field),
                  fieldArabic: label(t, field),
                  value: answers[field.id] || '',
                }
              : {
                  questionEnglish: label(t, field),
                  questionArabic: label(t, field),
                  answer: answers[field.id] || '',
                },
          ]),
        ),
      ];
    }),
  );
}

function buildFullReport(params: {
  answers: Answers;
  lang: InterfaceLang;
  langCode: Lang;
  submittedAt: string;
  t: (key: string) => string;
}): string {
  const { answers, lang, langCode, submittedAt, t } = params;
  const r = buildResult(answers, langCode);
  const labels = lang === 'Arabic'
    ? {
        title: 'نتيجة تقييم المواهب الروحية والدعوة الشخصية',
        submittedAt: 'وقت الإرسال',
        interfaceLanguageUsed: 'لغة النموذج المستخدمة',
        traineeInfo: 'معلومات المتدرب',
        assessmentResults: 'نتائج التقييم',
        primaryGift: 'الموهبة الأساسية',
        secondaryGift: 'الموهبة الثانوية',
        recommendedMinistry: 'مجال الخدمة المقترح',
        summary: 'الملخص',
        answer: 'الإجابة',
        score: 'الدرجة',
        totalScore: 'الدرجة الإجمالية',
        notAvailable: 'غير متوفر',
      }
    : {
        title: 'LINC SPIRITUAL GIFTS ASSESSMENT RESPONSE',
        submittedAt: 'Submitted At',
        interfaceLanguageUsed: 'Interface Language Used',
        traineeInfo: 'TRAINEE INFORMATION',
        assessmentResults: 'ASSESSMENT RESULTS',
        primaryGift: 'Primary Gift',
        secondaryGift: 'Secondary Gift',
        recommendedMinistry: 'Recommended Ministry',
        summary: 'Summary',
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
  ];

  for (const section of form.sections) {
    lines.push('', title(t, section).toUpperCase(), '-------------------------------');

    if (section.id === 'trainee') {
      (section.fields || []).forEach(field => lines.push(`${label(t, field)}: ${answers[field.id] || labels.notAvailable}`));
      continue;
    }

    if (section.type === 'fields') {
      (section.fields || []).forEach(field => lines.push(`${label(t, field)}\n${labels.answer}: ${answers[field.id] || labels.notAvailable}\n`));
      continue;
    }

    if (section.type === 'groupedRating') {
      (section.groups || []).forEach(group => {
        const max = (section.ratingScale?.max || form.defaults?.ratingScale?.max || 5) * (group.fields || []).length;
        lines.push(`${groupTitle(t, group)}\n${labels.totalScore}: ${r.giftTotals[group.id] || 0}/${max}`);
        (group.fields || []).forEach(field => lines.push(`  ${field.id}. ${label(t, field)}\n  ${labels.score}: ${numberValue(answers[field.id])}/${section.ratingScale?.max || 5}`));
        lines.push('');
      });
      continue;
    }

    if (section.type === 'ratingList') {
      (section.fields || []).forEach(field => lines.push(`${label(t, field)}: ${numberValue(answers[field.id])}/${section.ratingScale?.max || 5}`));
    }
  }

  lines.splice(7, 0,
    '',
    labels.assessmentResults,
    '-------------------------------',
    `${labels.primaryGift}: ${r.primaryGift}`,
    `${labels.secondaryGift}: ${r.secondaryGift}`,
    `${labels.recommendedMinistry}: ${r.recommendedMinistry}`,
    '',
    `${labels.summary}:`,
    r.summary,
  );

  return lines.join('\n');
}

function buildAssessmentEmailHtml(params: {
  lang: InterfaceLang;
  fullName: string;
  surveyDate: string;
  age: string;
  interfaceLanguageUsed: string;
  submittedAt: string;
  primaryGift: string;
  secondaryGift: string;
  recommendedMinistry: string;
  fullReport: string;
}): string {
  const isArabic = params.lang === 'Arabic';
  const labels = isArabic
    ? {
        title: 'نتيجة تقييم المواهب الروحية والدعوة الشخصية',
        subtitle: 'تم الإرسال من خلال نموذج تقييم المواهب الروحية والدعوة الشخصية',
        fullName: 'الاسم الكامل',
        surveyDate: 'تاريخ التقييم',
        age: 'العمر',
        languageUsed: 'لغة النموذج المستخدمة',
        submittedAt: 'وقت الإرسال',
        assessmentResult: 'نتيجة التقييم',
        primaryGift: 'الموهبة الأساسية',
        secondaryGift: 'الموهبة الثانوية',
        recommendedMinistry: 'مجال الخدمة المقترح',
        fullResponseReport: 'التقرير الكامل للإجابة',
        footer: 'تم إنشاء هذا البريد الإلكتروني تلقائياً بعد إرسال نموذج تقييم جديد.',
      }
    : {
        title: 'New LINC Assessment Response',
        subtitle: 'Submitted through the LINC Spiritual Gifts Assessment form',
        fullName: 'Full Name',
        surveyDate: 'Survey Date',
        age: 'Age',
        languageUsed: 'Language Used',
        submittedAt: 'Submitted At',
        assessmentResult: 'Assessment Result',
        primaryGift: 'Primary Gift',
        secondaryGift: 'Secondary Gift',
        recommendedMinistry: 'Recommended Ministry',
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
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.age}</td><td style="padding: 8px 0;">${escapeHtml(params.age)}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.languageUsed}</td><td style="padding: 8px 0;">${escapeHtml(params.interfaceLanguageUsed)}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">${labels.submittedAt}</td><td style="padding: 8px 0;">${escapeHtml(params.submittedAt)}</td></tr>
    </table>
    <div style="margin: 20px 0; padding: 16px; background-color: #f8eeee; ${borderSide}: 5px solid #8b1e1e; border-radius: 10px;">
      <h3 style="margin: 0 0 10px; color: #641414; font-size: 17px;">${labels.assessmentResult}</h3>
      <div style="margin-bottom: 8px;"><strong>${labels.primaryGift}:</strong> ${escapeHtml(params.primaryGift)}</div>
      <div style="margin-bottom: 8px;"><strong>${labels.secondaryGift}:</strong> ${escapeHtml(params.secondaryGift)}</div>
      <div><strong>${labels.recommendedMinistry}:</strong> ${escapeHtml(params.recommendedMinistry)}</div>
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

  const [answers, setAnswers] = useState<Answers>(() => initialAnswers());
  const [selectedForm, setSelectedForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => buildResult(answers, langCode), [answers, langCode]);

  const setAnswer = (fieldId: string, value: AnswerValue) => {
    setAnswers(previous => ({ ...previous, [fieldId]: value }));
  };

  const resetForRetake = () => {
    setAnswers(initialAnswers());
    setSubmitted(false);
    setError(null);
  };

  const handleBackToAssessmentChoices = () => {
    setSelectedForm(false);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validate(answers)) {
      setError(t(form.validation?.errorKey || 'assessment.completeFields'));
      return;
    }

    setLoading(true);

    try {
      const submittedAt = getEasternTime();
      const englishResult = buildResult(answers, 'en');
      const arabicResult = buildResult(answers, 'ar');
      const fields = buildFieldsPayload(answers, t);

      const record = {
        tableNameEquivalent: form.firebase?.tableNameEquivalent || 'form',
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        createdAtEasternTime: submittedAt,
        interfaceLanguageUsed: interfaceLanguage,
        formId: form.id,
        fields,
        scores: {
          gifts: result.giftTotals,
          ministry: result.ministryTotals,
        },
        results: {
          English: {
            primaryGift: englishResult.primaryGift,
            secondaryGift: englishResult.secondaryGift,
            recommendedMinistry: englishResult.recommendedMinistry,
            summary: englishResult.summary,
          },
          Arabic: {
            primaryGift: arabicResult.primaryGift,
            secondaryGift: arabicResult.secondaryGift,
            recommendedMinistry: arabicResult.recommendedMinistry,
            summary: arabicResult.summary,
          },
        },
      };

      await push(ref(database, `${form.firebase?.path || 'form'}/`), record);

      const emailField = String(answers.email || '').trim();
      if (form.email?.enabled && emailField) {
        const fullName = String(answers.fullName || '');
        const subjectTemplate = localText(form.email.subject, langCode, `LINC Spiritual Gifts Assessment Response - {{fullName}}`);
        const emailSubject = template(subjectTemplate, { fullName });
        const fullReport = buildFullReport({
          answers,
          lang: interfaceLanguage,
          langCode,
          submittedAt,
          t,
        });

        const htmlBody = buildAssessmentEmailHtml({
          lang: interfaceLanguage,
          fullName,
          surveyDate: String(answers.surveyDate || ''),
          age: String(answers.age || ''),
          interfaceLanguageUsed: interfaceLanguage,
          submittedAt,
          primaryGift: result.primaryGift,
          secondaryGift: result.secondaryGift,
          recommendedMinistry: result.recommendedMinistry,
          fullReport,
        });

        const recipients = Array.from(
          new Set([
            ...(form.email.recipients || []),
            ...(form.email.includeSubmitter ? [emailField] : []),
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
            sentAt: Date.now(),
            sentAtISO: new Date().toISOString(),
            sentAtEasternTime: getEasternTime(),
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
    const baseClass = 'w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]';

    if (field.type === 'textarea') {
      return (
        <textarea
          required={Boolean(field.required)}
          className={baseClass}
          style={{ minHeight: '112px', resize: 'vertical' }}
          value={String(answers[field.id] || '')}
          onChange={e => setAnswer(field.id, e.target.value)}
        />
      );
    }

    if (field.type === 'rating') {
      return (
        <div className="grid grid-cols-5 gap-[10px]">
          {ratingRange(section).map(num => (
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
                name={field.id}
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
        onChange={e => setAnswer(field.id, field.type === 'number' ? e.target.value : e.target.value)}
      />
    );
  };

  const renderSection = (section: SectionDef) => (
    <section key={section.id} className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
      <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">
        {title(t, section)}
      </h2>

      {(section.guideKeys || []).map(key => (
        <div key={key} className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
          {t(key)}
        </div>
      ))}

      {section.type === 'groupedRating' ? (
        (section.groups || []).map(group => (
          <div key={group.id} className="mt-[18px]">
            <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold">
              {groupTitle(t, group)}
            </h3>

            {(group.fields || []).map(field => (
              <div key={field.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                <p className="font-bold m-0 mb-[14px] text-[#333]">
                  {field.id}. {label(t, field)}
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
                {label(t, field)}
                {field.required && <span className="text-[#8b1e1e]"> *</span>}
              </label>
              {renderField(field, section)}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  if (!selectedForm) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <PageTitle title={t(form.page?.titleKey || 'assessment.title')} subtitle={t(form.page?.subtitleKey || 'assessment.program')} icon={<ClipboardList size={22} />} />

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
            <button
              type="button"
              onClick={() => setSelectedForm(true)}
              className="group text-start min-h-[190px] bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]">
                <ClipboardList size={22} />
              </div>

              <div className="text-[#8b1e1e] text-[1.28rem] font-bold mb-3">
                {t(form.card?.titleKey || 'assessment.title')}
              </div>

              <p className="m-0 text-[#666] text-sm leading-relaxed">
                {t(form.card?.descriptionKey || 'assessment.program')}
              </p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5">
            {t(form.results?.display?.titleKey || 'assessment.assessmentResults')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
            {(form.results?.display?.cards || []).map(card => {
              const value =
                card.id === 'primaryGift'
                  ? result.primaryGift
                  : card.id === 'secondaryGift'
                    ? result.secondaryGift
                    : result.recommendedMinistry;

              return (
                <div key={card.id} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
                  <span className="block text-[#666] font-bold mb-1 text-sm">{t(card.labelKey || card.id)}</span>
                  <strong className="text-[#641414] text-[1.05rem]">{value}</strong>
                </div>
              );
            })}
          </div>

          <div className="bg-[#fffafa] border-l-4 border-[#8b1e1e] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]" style={{ [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e', [dir === 'rtl' ? 'borderLeft' : 'borderRight']: 'none' }}>
            {result.summary}
          </div>

          {(form.results?.display?.scoreBlocks || []).map(block => {
            const source = block.sourceCalculation === 'giftTotals' ? result.giftTotals : result.ministryTotals;
            const section = block.sourceCalculation === 'giftTotals' ? getSection('gifts') : getSection('ministry');
            const items = block.sourceCalculation === 'giftTotals'
              ? (section?.groups || []).map(group => ({ id: group.id, label: groupTitle(t, group), score: source[group.id] || 0 }))
              : (section?.fields || []).map(field => ({ id: field.id, label: label(t, field), score: source[field.id] || 0 }));

            return (
              <React.Fragment key={block.id}>
                <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">
                  {t(block.titleKey || block.id)}
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
      <PageTitle title={t(form.page?.titleKey || 'assessment.title')} subtitle={t(form.page?.subtitleKey || 'assessment.program')} icon={<ClipboardList size={22} />} />

      <button
        type="button"
        onClick={handleBackToAssessmentChoices}
        className="mb-[18px] min-h-[46px] px-5 py-3 rounded-[16px] border border-[rgba(139,30,30,0.18)] bg-white text-[#8b1e1e] font-bold cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[1px] hover:bg-[#fffafa]"
      >
        {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">{error}</div>}

        {form.sections.map(renderSection)}

        <button type="submit" disabled={loading} className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0">
          {loading ? t('assessment.submitting') : t('assessment.submit')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">
          {t(form.page?.confidentialKey || 'assessment.confidential')}
        </p>
      </form>
    </div>
  );
}
