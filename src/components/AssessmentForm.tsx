import React, { useState } from 'react';
import { database } from '../firebase';
import { ref, push } from 'firebase/database';
import { motion } from 'motion/react';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '../i18n';

// ─── All form structure lives here (mirrors five-service-pathways.yaml) ───────

const FORM_CONFIG = {
  email: {
    recipients: ['kasedra@proton.me', 'rev.ibrahim@lincministry.com'] as string[],
  },
  trainee: {
    ids: ['fullName', 'email', 'surveyDate', 'age', 'attendance', 'currentService', 'workContext', 'arabicFluency', 'englishFluency', 'otherLanguages'],
    required: ['fullName', 'email', 'surveyDate', 'age', 'attendance'],
    textareas: ['attendance', 'currentService'],
  },
  faith: {
    ids: ['q1_1', 'q1_2', 'q1_3', 'q1_4', 'q1_5'],
  },
  gifts: {
    groups: [
      { id: 'A', questions: ['A1', 'A2', 'A3', 'A4', 'A5'], result: { en: 'Apostolic / Pioneering Leadership', ar: 'قيادة رسولية / خدمة رائدة' } },
      { id: 'B', questions: ['B1', 'B2', 'B3', 'B4', 'B5'], result: { en: 'Prophetic / Intercession Ministry', ar: 'خدمة نبوية / شفاعة' } },
      { id: 'C', questions: ['C1', 'C2', 'C3', 'C4', 'C5'], result: { en: 'Evangelism and Outreach', ar: 'التبشير والكرازة' } },
      { id: 'D', questions: ['D1', 'D2', 'D3', 'D4', 'D5'], result: { en: 'Pastoral Care and Shepherding', ar: 'الرعاية الروحية وقلب الراعي' } },
      { id: 'E', questions: ['E1', 'E2', 'E3', 'E4', 'E5'], result: { en: 'Teaching, Training, and Discipleship', ar: 'التعليم والتدريب والتلمذة' } },
    ] as { id: string; questions: string[]; result: { en: string; ar: string } }[],
  },
  ministry: {
    fields: [
      { id: 'F1',  result: { en: 'Prayer and Intercession',        ar: 'الصلاة والشفاعة' } },
      { id: 'F2',  result: { en: 'Evangelism and Outreach',         ar: 'التبشير والتواصل' } },
      { id: 'F3',  result: { en: 'Bible Teaching and Discipleship', ar: 'تعليم الكتاب المقدس والتلمذة' } },
      { id: 'F4',  result: { en: 'Spiritual Care and Follow-up',    ar: 'الرعاية الروحية والمتابعة' } },
      { id: 'F5',  result: { en: 'Worship',                         ar: 'العبادة' } },
      { id: 'F6',  result: { en: "Children's Ministry",             ar: 'خدمة الأطفال' } },
      { id: 'F7',  result: { en: 'Youth Ministry',                  ar: 'خدمة الشباب' } },
      { id: 'F8',  result: { en: 'Media and Technology',            ar: 'الإعلام والتكنولوجيا' } },
      { id: 'F9',  result: { en: 'Administration and Oversight',    ar: 'الإدارة والإشراف' } },
      { id: 'F10', result: { en: 'Hospitality and Welcome',         ar: 'الضيافة والترحيب' } },
    ] as { id: string; result: { en: string; ar: string } }[],
  },
  vision: {
    ids: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
    optional: ['v6'],
  },
} as const;

// Derived helpers (so the rest of the file never re-lists IDs)
const GIFT_GROUPS    = FORM_CONFIG.gifts.groups;
const GIFT_GROUP_IDS = GIFT_GROUPS.map(g => g.id);
const MINISTRY_FIELDS = FORM_CONFIG.ministry.fields;
const MINISTRY_IDS    = MINISTRY_FIELDS.map(f => f.id);

// Result lookup maps derived from config
const giftRecMap   = Object.fromEntries(GIFT_GROUPS.map(g => [g.id, g.result])) as Record<string, { en: string; ar: string }>;
const ministryMap  = Object.fromEntries(MINISTRY_FIELDS.map(f => [f.id, f.result])) as Record<string, { en: string; ar: string }>;

// ─── Brevo / email constants (unchanged) ─────────────────────────────────────

const RESULT_EMAIL_RECIPIENTS = FORM_CONFIG.email.recipients;
const BREVO_API_KEY        = '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';
const BREVO_SEND_ENDPOINT  = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDER_NAME    = 'Linc ministry';
const BREVO_SENDER_EMAIL   = 'lincministry.ca@gmail.com';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentFormChoice = 'fiveServicePaths' | 'spiritualGifts';

// ─── Utilities (unchanged) ────────────────────────────────────────────────────

function getEasternTime(): string {
  return new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildAssessmentEmailHtml(params: {
  lang: 'English' | 'Arabic';
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
        fullName: 'الاسم الكامل', surveyDate: 'تاريخ التقييم', age: 'العمر',
        languageUsed: 'لغة النموذج المستخدمة', submittedAt: 'وقت الإرسال',
        assessmentResult: 'نتيجة التقييم', primaryGift: 'الموهبة الأساسية',
        secondaryGift: 'الموهبة الثانوية', recommendedMinistry: 'مجال الخدمة المقترح',
        fullResponseReport: 'التقرير الكامل للإجابة',
        footer: 'تم إنشاء هذا البريد الإلكتروني تلقائياً بعد إرسال نموذج تقييم جديد.',
      }
    : {
        title: 'New LINC Assessment Response',
        subtitle: 'Submitted through the LINC Spiritual Gifts Assessment form',
        fullName: 'Full Name', surveyDate: 'Survey Date', age: 'Age',
        languageUsed: 'Language Used', submittedAt: 'Submitted At',
        assessmentResult: 'Assessment Result', primaryGift: 'Primary Gift',
        secondaryGift: 'Secondary Gift', recommendedMinistry: 'Recommended Ministry',
        fullResponseReport: 'Full Response Report',
        footer: 'This email was automatically generated after a new form response was submitted.',
      };

  const direction  = isArabic ? 'rtl' : 'ltr';
  const align      = isArabic ? 'right' : 'left';
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
    headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Brevo API send failed: ${response.status} ${responseText}`);
  return responseText ? JSON.parse(responseText) : {};
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentForm() {
  const { t, dir } = useI18n();
  const [loading,  setLoading]  = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessmentForm, setSelectedAssessmentForm] = useState<AssessmentFormChoice | null>(null);
  const isArabicUI = dir === 'rtl';

  const [trainee, setTrainee] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    FORM_CONFIG.trainee.ids.forEach(f => {
      if (f === 'age') init[f] = '18';
      else if (f === 'surveyDate') init[f] = new Date().toISOString().split('T')[0];
      else init[f] = '';
    });
    return init;
  });

  const [faithAnswers,    setFaithAnswers]    = useState<Record<string, string>>({});
  const [visionAnswers,   setVisionAnswers]   = useState<Record<string, string>>({});
  const [giftScores,      setGiftScores]      = useState<Record<string, number>>({});
  const [ministryScores,  setMinistryScores]  = useState<Record<string, number>>({});

  // ── Calculations ─────────────────────────────────────────────────────────

  const calculateGiftScores = () =>
    Object.fromEntries(
      GIFT_GROUPS.map(g => [g.id, g.questions.reduce((sum, qId) => sum + (giftScores[qId] || 0), 0)])
    ) as Record<string, number>;

  const calculateMinistryScores = () =>
    Object.fromEntries(MINISTRY_FIELDS.map(f => [f.id, ministryScores[f.id] || 0])) as Record<string, number>;

  const getResults = () => {
    const giftTotals    = calculateGiftScores();
    const ministryTotals = calculateMinistryScores();
    const sortedGifts   = Object.entries(giftTotals).sort((a, b) => b[1] - a[1]);
    const sortedMinistry = Object.entries(ministryTotals).sort((a, b) => b[1] - a[1]);
    return {
      primaryGift:          t(`giftRec.${sortedGifts[0][0]}`),
      secondaryGift:        t(`giftRec.${sortedGifts[1][0]}`),
      recommendedMinistry:  t(`ministry.${sortedMinistry[0][0]}`),
      summary: `${t('assessment.summaryPrefix')} ${t(`giftRec.${sortedGifts[0][0]}`)}.  ${t('assessment.summaryMid')} ${t(`giftRec.${sortedGifts[1][0]}`)}.  ${t('assessment.summarySuffix')} ${t(`ministry.${sortedMinistry[0][0]}`)}. `,
      giftTotals,
      ministryTotals,
    };
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allGiftAnswered     = GIFT_GROUPS.every(g => g.questions.every(q => giftScores[q]));
    const allMinistryAnswered = MINISTRY_FIELDS.every(f => ministryScores[f.id]);
    const allRequiredTrainee  = FORM_CONFIG.trainee.required.every(f => trainee[f]?.trim());
    const allFaithAnswered    = FORM_CONFIG.faith.ids.every(q => faithAnswers[q]?.trim());
    const allVisionAnswered   = FORM_CONFIG.vision.ids.filter(id => !FORM_CONFIG.vision.optional.includes(id as any)).every(q => visionAnswers[q]?.trim());

    if (!allRequiredTrainee || !allFaithAnswered || !allGiftAnswered || !allMinistryAnswered || !allVisionAnswered) {
      setError(t('assessment.completeFields'));
      return;
    }

    setLoading(true);
    try {
      const giftTotals     = calculateGiftScores();
      const ministryTotals = calculateMinistryScores();
      const sortedGifts    = Object.entries(giftTotals).sort((a, b) => b[1] - a[1]);
      const sortedMinistry = Object.entries(ministryTotals).sort((a, b) => b[1] - a[1]);
      const submittedAt    = getEasternTime();

      const fields = {
        trainee: Object.fromEntries(
          FORM_CONFIG.trainee.ids.map(f => [f, { fieldEnglish: t(`trainee.${f}`), fieldArabic: t(`trainee.${f}`), value: trainee[f] || '' }])
        ),
        faith: Object.fromEntries(
          FORM_CONFIG.faith.ids.map(qId => [qId, { questionEnglish: t(`faith.${qId}`), questionArabic: t(`faith.${qId}`), answer: faithAnswers[qId] || '' }])
        ),
        gifts: Object.fromEntries(
          GIFT_GROUPS.map(g => [
            g.id,
            {
              sectionEnglish: t(`gift.${g.id}.title`),
              sectionArabic:  t(`gift.${g.id}.title`),
              questions: Object.fromEntries(
                g.questions.map(qId => [qId, { questionEnglish: t(`gift.${qId}`), questionArabic: t(`gift.${qId}`), score: giftScores[qId] || 0 }])
              ),
            },
          ])
        ),
        ministry: Object.fromEntries(
          MINISTRY_FIELDS.map(mf => [mf.id, { areaEnglish: t(`ministry.${mf.id}`), areaArabic: t(`ministry.${mf.id}`), score: ministryScores[mf.id] || 0 }])
        ),
        vision: Object.fromEntries(
          FORM_CONFIG.vision.ids.map(vId => [vId, { questionEnglish: t(`vision.${vId}`), questionArabic: t(`vision.${vId}`), answer: visionAnswers[vId] || '' }])
        ),
      };

      const primaryGiftKey   = sortedGifts[0][0];
      const secondaryGiftKey = sortedGifts[1][0];
      const topMinistryKey   = sortedMinistry[0][0];

      const results = {
        English: {
          primaryGift:         giftRecMap[primaryGiftKey]?.en   || primaryGiftKey,
          secondaryGift:       giftRecMap[secondaryGiftKey]?.en || secondaryGiftKey,
          recommendedMinistry: ministryMap[topMinistryKey]?.en  || topMinistryKey,
          summary: `The strongest result is ${giftRecMap[primaryGiftKey]?.en || primaryGiftKey}. The secondary result is ${giftRecMap[secondaryGiftKey]?.en || secondaryGiftKey}. The most aligned ministry area is ${ministryMap[topMinistryKey]?.en || topMinistryKey}.`,
        },
        Arabic: {
          primaryGift:         giftRecMap[primaryGiftKey]?.ar   || primaryGiftKey,
          secondaryGift:       giftRecMap[secondaryGiftKey]?.ar || secondaryGiftKey,
          recommendedMinistry: ministryMap[topMinistryKey]?.ar  || topMinistryKey,
          summary: `أقوى نتيجة هي ${giftRecMap[primaryGiftKey]?.ar || primaryGiftKey}. النتيجة الثانوية هي ${giftRecMap[secondaryGiftKey]?.ar || secondaryGiftKey}. مجال الخدمة الأكثر توافقاً هو ${ministryMap[topMinistryKey]?.ar || topMinistryKey}.`,
        },
      };

      const record = {
        tableNameEquivalent: 'form',
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        createdAtEasternTime: submittedAt,
        interfaceLanguageUsed: dir === 'rtl' ? 'Arabic' : 'English',
        fields,
        scores: { gifts: giftTotals, ministry: ministryTotals },
        results,
      };

      await push(ref(database, 'form/'), record);

      if (trainee.email?.trim()) {
        const isAr = dir === 'rtl';
        const lang = isAr ? 'Arabic' : 'English';
        const rl: Record<string, Record<string, string>> = {
          English: { title: 'LINC SPIRITUAL GIFTS ASSESSMENT RESPONSE', submittedAt: 'Submitted At', interfaceLanguageUsed: 'Interface Language Used', traineeInfo: 'TRAINEE INFORMATION', assessmentResults: 'ASSESSMENT RESULTS', primaryGift: 'Primary Gift', secondaryGift: 'Secondary Gift', recommendedMinistry: 'Recommended Ministry', summary: 'Summary', faithJourney: 'FAITH JOURNEY AND WALK WITH GOD', personalGifts: 'PERSONAL GIFTS ASSESSMENT', totalScore: 'Total Score', score: 'Score', answer: 'Answer', ministryAlignment: 'MINISTRY ALIGNMENT AND EXPERIENCE', callingVision: 'CALLING AND VISION QUESTIONS', notAvailable: 'N/A' },
          Arabic:  { title: 'نتيجة تقييم المواهب الروحية والدعوة الشخصية', submittedAt: 'وقت الإرسال', interfaceLanguageUsed: 'لغة النموذج المستخدمة', traineeInfo: 'معلومات المتدرب', assessmentResults: 'نتائج التقييم', primaryGift: 'الموهبة الأساسية', secondaryGift: 'الموهبة الثانوية', recommendedMinistry: 'مجال الخدمة المقترح', summary: 'الملخص', faithJourney: 'الرحلة الإيمانية والمسيرة مع الله', personalGifts: 'تقييم المواهب الشخصية', totalScore: 'الدرجة الإجمالية', score: 'الدرجة', answer: 'الإجابة', ministryAlignment: 'التوافق والخبرة نحو الخدمة', callingVision: 'أسئلة الدعوة والرؤية', notAvailable: 'غير متوفر' },
        };
        const l          = rl[lang];
        const sep        = '=========================================';
        const ssep       = '-------------------------------';
        const langResult = results[lang];
        const pg = giftRecMap[primaryGiftKey]?.[isAr ? 'ar' : 'en']   || primaryGiftKey;
        const sg = giftRecMap[secondaryGiftKey]?.[isAr ? 'ar' : 'en'] || secondaryGiftKey;
        const rm = ministryMap[topMinistryKey]?.[isAr ? 'ar' : 'en']  || topMinistryKey;

        const traineeLines  = FORM_CONFIG.trainee.ids.map(id => `${fields.trainee[id].fieldEnglish}: ${fields.trainee[id].value || l.notAvailable}`);
        const faithLines    = FORM_CONFIG.faith.ids.map(qId  => `${fields.faith[qId].questionEnglish}\n${l.answer}: ${fields.faith[qId].answer || l.notAvailable}`);
        const giftLines     = GIFT_GROUPS.map(g => {
          const gs    = fields.gifts[g.id];
          const qLines = g.questions.map(qKey => `  ${qKey}. ${gs.questions[qKey].questionEnglish}\n  ${l.score}: ${gs.questions[qKey].score}/5`);
          return `${gs.sectionEnglish}\n${l.totalScore}: ${giftTotals[g.id]}/25\n${qLines.join('\n\n')}`;
        });
        const ministryLines = MINISTRY_FIELDS.map(mf => `${fields.ministry[mf.id].areaEnglish}: ${fields.ministry[mf.id].score}/5`);
        const visionLines   = FORM_CONFIG.vision.ids.map(vId => `${fields.vision[vId].questionEnglish}\n${l.answer}: ${fields.vision[vId].answer || l.notAvailable}`);

        const fullReport = [
          l.title, sep, '',
          `${l.submittedAt}: ${submittedAt}`,
          `${l.interfaceLanguageUsed}: ${lang}`, '',
          l.traineeInfo, ssep, traineeLines.join('\n'), '',
          l.assessmentResults, ssep,
          `${l.primaryGift}: ${pg}`,
          `${l.secondaryGift}: ${sg}`,
          `${l.recommendedMinistry}: ${rm}`, '',
          `${l.summary}:`, langResult.summary, '',
          l.faithJourney, ssep, faithLines.join('\n\n'), '',
          l.personalGifts, ssep, giftLines.join('\n\n'), '',
          l.ministryAlignment, ssep, ministryLines.join('\n'), '',
          l.callingVision, ssep, visionLines.join('\n\n'),
        ].join('\n');

        const resultEmailRecipients = Array.from(
          new Set([...RESULT_EMAIL_RECIPIENTS, trainee.email.trim()].filter(Boolean))
        );
        const emailSubject = isAr
          ? `نتيجة تقييم المواهب الروحية والدعوة الشخصية - ${trainee.fullName}`
          : `LINC Spiritual Gifts Assessment Response - ${trainee.fullName}`;

        const htmlBody = buildAssessmentEmailHtml({
          lang, fullName: trainee.fullName, surveyDate: trainee.surveyDate,
          age: trainee.age, interfaceLanguageUsed: lang, submittedAt,
          primaryGift: pg, secondaryGift: sg, recommendedMinistry: rm, fullReport,
        });

        for (const recipientEmail of resultEmailRecipients) {
          try {
            const brevoResponse = await sendEmailViaBrevoApi({
              to: recipientEmail, subject: emailSubject, htmlBody,
              replyToEmail: trainee.email.trim(), replyToName: trainee.fullName,
            });
            await push(ref(database, 'brevoSendLogs/'), {
              recipientEmail, subject: emailSubject, sentUsing: 'Brevo API',
              senderName: BREVO_SENDER_NAME, senderEmail: BREVO_SENDER_EMAIL,
              sentAt: Date.now(), sentAtISO: new Date().toISOString(),
              sentAtEasternTime: getEasternTime(), brevoResponse,
            });
          } catch (emailErr) {
            console.error(`Brevo API email send failed for ${recipientEmail}:`, emailErr);
            await push(ref(database, 'brevoSendLogs/'), {
              recipientEmail, subject: emailSubject, sentUsing: 'Brevo API',
              senderName: BREVO_SENDER_NAME, senderEmail: BREVO_SENDER_EMAIL,
              status: 'failed',
              errorMessage: emailErr instanceof Error ? emailErr.message : String(emailErr),
              sentAt: Date.now(), sentAtISO: new Date().toISOString(),
              sentAtEasternTime: getEasternTime(),
            });
            throw emailErr;
          }
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

  const handleBackToAssessmentChoices = () => {
    setSelectedAssessmentForm(null);
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Rating helper ─────────────────────────────────────────────────────────

  const RatingRow = ({
    id, scores, onChange,
  }: {
    id: string;
    scores: Record<string, number>;
    onChange: (id: string, val: number) => void;
  }) => (
    <div className="grid grid-cols-5 gap-[10px]">
      {[1, 2, 3, 4, 5].map(num => (
        <label
          key={num}
          className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
            scores[id] === num ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]' : 'bg-[#fafafa] border-[#ddd]'
          }`}
        >
          <input type="radio" name={id} value={num} className="absolute opacity-0 pointer-events-none" checked={scores[id] === num} onChange={() => onChange(id, num)} />
          <span className={`grid place-items-center w-full h-full font-bold ${scores[id] === num ? 'text-white' : 'text-[#444]'}`}>{num}</span>
        </label>
      ))}
    </div>
  );

  // ── Selection screen ──────────────────────────────────────────────────────

  if (!selectedAssessmentForm) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <PageTitle title={t('assessment.title')} subtitle={t('assessment.program')} icon={<ClipboardList size={22} />} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[rgba(139,30,30,0.12)] rounded-[24px] p-[clamp(20px,4vw,34px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="m-0 text-[#8b1e1e] text-[clamp(1.35rem,4vw,1.9rem)] font-bold">{isArabicUI ? 'اختر نموذج التقييم' : 'Choose Assessment Form'}</h2>
            <p className="mt-3 mb-0 text-[#666] text-[1rem] leading-relaxed">{isArabicUI ? 'اختر نموذج التقييم الذي تريد تعبئته.' : 'Choose the assessment form you want to complete.'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            <button type="button" onClick={() => setSelectedAssessmentForm('fiveServicePaths')} className="group text-start min-h-[190px] bg-[#fffafa] border-2 border-[rgba(139,30,30,0.16)] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.16)]">
              <div className="w-12 h-12 rounded-[16px] bg-[#8b1e1e] text-white grid place-items-center mb-5 shadow-[0_8px_18px_rgba(139,30,30,0.22)]"><ClipboardList size={22} /></div>
              <div className="text-[#8b1e1e] text-[1.28rem] font-bold mb-3">{isArabicUI ? 'مسارات الخدمة الخمسة' : 'Five Service Pathways'}</div>
              <p className="m-0 text-[#666] text-sm leading-relaxed">{isArabicUI ? 'متابعة إلى نموذج التقييم الحالي.' : 'Continue to the currently implemented LINC assessment form.'}</p>
            </button>
            <button type="button" onClick={() => setSelectedAssessmentForm('spiritualGifts')} className="group text-start min-h-[190px] bg-[#fafafa] border-2 border-[#ddd] rounded-[22px] p-[22px] cursor-pointer shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-[2px] hover:border-[#8b1e1e] hover:shadow-[0_12px_28px_rgba(139,30,30,0.12)]">
              <div className="w-12 h-12 rounded-[16px] bg-[#f8eeee] text-[#8b1e1e] grid place-items-center mb-5 border border-[rgba(139,30,30,0.12)]"><ClipboardList size={22} /></div>
              <div className="text-[#8b1e1e] text-[1.28rem] font-bold mb-3">{isArabicUI ? 'تعرف على مواهبك الروحية' : 'Discover Your Spiritual Gifts'}</div>
              <p className="m-0 text-[#666] text-sm leading-relaxed">{isArabicUI ? 'هذا النموذج الثاني محجوز للتنفيذ القادم.' : 'This second assessment form is reserved for the next implementation.'}</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Spiritual gifts placeholder ───────────────────────────────────────────

  if (selectedAssessmentForm === 'spiritualGifts') {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <PageTitle title={t('assessment.title')} subtitle={t('assessment.program')} icon={<ClipboardList size={22} />} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[rgba(139,30,30,0.12)] rounded-[24px] p-[clamp(20px,4vw,34px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)] text-center">
          <div className="mx-auto w-14 h-14 rounded-[18px] bg-[#f8eeee] text-[#8b1e1e] grid place-items-center mb-5"><ClipboardList size={26} /></div>
          <h2 className="m-0 text-[#8b1e1e] text-[clamp(1.35rem,4vw,1.9rem)] font-bold">{isArabicUI ? 'تعرف على مواهبك الروحية' : 'Discover Your Spiritual Gifts'}</h2>
          <p className="mt-4 mb-0 text-[#666] leading-relaxed">{isArabicUI ? 'هذا النموذج لم يتم تنفيذه بعد.' : 'This form has not been implemented yet.'}</p>
          <button type="button" onClick={handleBackToAssessmentChoices} className="mt-7 min-h-[48px] px-6 py-3 rounded-[16px] border-none bg-[#8b1e1e] text-white font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px]">
            {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────

  const r = submitted ? getResults() : null;

  if (submitted && r) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5">{t('assessment.assessmentResults')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
            {[
              { label: t('assessment.primaryGift'),         value: r.primaryGift },
              { label: t('assessment.secondaryGift'),       value: r.secondaryGift },
              { label: t('assessment.recommendedMinistry'), value: r.recommendedMinistry },
            ].map((item, i) => (
              <div key={i} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
                <span className="block text-[#666] font-bold mb-1 text-sm">{item.label}</span>
                <strong className="text-[#641414] text-[1.05rem]">{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="bg-[#fffafa] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]" style={{ [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e', [dir === 'rtl' ? 'borderLeft' : 'borderRight']: 'none' }}>
            {r.summary}
          </div>

          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">{t('assessment.giftScores')}</h3>
          <div className="grid gap-[10px] mb-[18px]">
            {GIFT_GROUPS.map(g => (
              <div key={g.id} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(`gift.${g.id}.title`)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{r.giftTotals[g.id]} / 25</strong>
              </div>
            ))}
          </div>

          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">{t('assessment.ministryScores')}</h3>
          <div className="grid gap-[10px] mb-[18px]">
            {MINISTRY_FIELDS.map(mf => (
              <div key={mf.id} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(`ministry.${mf.id}`)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{r.ministryTotals[mf.id]} / 5</strong>
              </div>
            ))}
          </div>
        </motion.div>

        <button onClick={() => setSubmitted(false)} className="w-full min-h-[56px] mt-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem]">
          {t('assessment.takeAgain')}
        </button>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle title={t('assessment.title')} subtitle={t('assessment.program')} icon={<ClipboardList size={22} />} />

      <button type="button" onClick={handleBackToAssessmentChoices} className="mb-[18px] min-h-[46px] px-5 py-3 rounded-[16px] border border-[rgba(139,30,30,0.18)] bg-white text-[#8b1e1e] font-bold cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[1px] hover:bg-[#fffafa]">
        {isArabicUI ? 'الرجوع لاختيار التقييم' : 'Back to assessment choices'}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">{error}</div>}

        {/* Trainee Information */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.traineeInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORM_CONFIG.trainee.ids.map(f => (
              <div key={f} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(`trainee.${f}`)} {!FORM_CONFIG.trainee.required.includes(f as any) && <span className="text-[#8b1e1e]">*</span>}
                </label>
                {FORM_CONFIG.trainee.textareas.includes(f as any) ? (
                  <textarea
                    required={FORM_CONFIG.trainee.required.includes(f as any)}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    style={{ minHeight: '112px', resize: 'vertical' }}
                    value={trainee[f] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [f]: e.target.value }))}
                  />
                ) : (
                  <input
                    required={FORM_CONFIG.trainee.required.includes(f as any)}
                    type={f === 'email' ? 'email' : f === 'age' ? 'number' : f === 'surveyDate' ? 'date' : 'text'}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    value={trainee[f] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [f]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Faith Journey */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part1')}</h2>
          <div className="space-y-[22px]">
            {FORM_CONFIG.faith.ids.map(qId => (
              <div key={qId} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">{t(`faith.${qId}`)}</label>
                <textarea required className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]" style={{ minHeight: '112px', resize: 'vertical' }} value={faithAnswers[qId] || ''} onChange={e => setFaithAnswers(p => ({ ...p, [qId]: e.target.value }))} />
              </div>
            ))}
          </div>
        </section>

        {/* Gifts Assessment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part2')}</h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">{t('assessment.rateGuide')}</div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">{t('assessment.scale')}</div>
          {GIFT_GROUPS.map(g => (
            <div key={g.id} className="mt-[18px]">
              <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold">{t(`gift.${g.id}.title`)}</h3>
              {g.questions.map(qId => (
                <div key={qId} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                  <p className="font-bold m-0 mb-[14px] text-[#333]">{qId}. {t(`gift.${qId}`)}</p>
                  <RatingRow id={qId} scores={giftScores} onChange={(id, val) => setGiftScores(p => ({ ...p, [id]: val }))} />
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Ministry Alignment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part3')}</h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">{t('assessment.rateGuide')}</div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">{t('assessment.scale')}</div>
          {MINISTRY_FIELDS.map(mf => (
            <div key={mf.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
              <p className="font-bold m-0 mb-[14px] text-[#333]">{mf.id}. {t(`ministry.${mf.id}`)}</p>
              <RatingRow id={mf.id} scores={ministryScores} onChange={(id, val) => setMinistryScores(p => ({ ...p, [id]: val }))} />
            </div>
          ))}
        </section>

        {/* Vision Questions */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part4')}</h2>
          <div className="space-y-[22px]">
            {FORM_CONFIG.vision.ids.map(vId => (
              <div key={vId} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(`vision.${vId}`)} {!FORM_CONFIG.vision.optional.includes(vId as any) && <span className="text-[#8b1e1e]">*</span>}
                </label>
                <textarea required={!FORM_CONFIG.vision.optional.includes(vId as any)} className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]" style={{ minHeight: '112px', resize: 'vertical' }} value={visionAnswers[vId] || ''} onChange={e => setVisionAnswers(p => ({ ...p, [vId]: e.target.value }))} />
              </div>
            ))}
          </div>
        </section>

        <button type="submit" disabled={loading} className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0">
          {loading ? t('assessment.submitting') : t('assessment.submit')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">{t('assessment.confidential')}</p>
      </form>
    </div>
  );
}
