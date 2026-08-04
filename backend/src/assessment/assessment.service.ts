import type { z } from 'zod'

import type {
  assessmentFormIdSchema,
  assessmentFormStateSchema,
  assessmentLocaleSchema,
  assessmentSubmissionSchema,
} from '../schemas/assessment.schema'

export type AssessmentFormId = z.infer<typeof assessmentFormIdSchema>
export type AssessmentLocale = z.infer<typeof assessmentLocaleSchema>
export type AssessmentFormState = z.infer<typeof assessmentFormStateSchema>
export type AssessmentAnswers = z.infer<typeof assessmentSubmissionSchema>['answers']

type LocalText = { en: string; ar: string }
type FieldType = 'text' | 'email' | 'date' | 'number' | 'textarea' | 'rating'

type FieldSpec = {
  id: string
  type: FieldType
  required: boolean
}

type GroupSpec = {
  id: string
  result: LocalText
  fields: string[]
}

type FormSpec = {
  id: AssessmentFormId
  title: LocalText
  tableNameEquivalent: string
  fields: FieldSpec[]
  sections: Array<{
    id: string
    type: 'fields' | 'groupedRating' | 'ratingList'
    fields?: string[]
    groups?: GroupSpec[]
  }>
  resultGroups: GroupSpec[]
  ministryResults?: Record<string, LocalText>
  resultKeys: string[]
}

const required = (id: string, type: FieldType): FieldSpec => ({
  id,
  type,
  required: true,
})
const optional = (id: string, type: FieldType): FieldSpec => ({
  id,
  type,
  required: false,
})
const ratingFields = (ids: string[]) => ids.map(id => required(id, 'rating'))

const pathwayGroups: GroupSpec[] = [
  ['A', 'Apostolic / Pioneering Leadership', 'قيادة رسولية / خدمة رائدة'],
  ['B', 'Prophetic / Intercession Ministry', 'خدمة نبوية / شفاعة'],
  ['C', 'Evangelism and Outreach', 'التبشير والكرازة'],
  ['D', 'Pastoral Care and Shepherding', 'الرعاية الروحية وقلب الراعي'],
  ['E', 'Teaching, Training, and Discipleship', 'التعليم والتدريب والتلمذة'],
].map(([id, en, ar]) => ({
  id,
  result: { en, ar },
  fields: Array.from({ length: 5 }, (_, index) => `${id}${index + 1}`),
}))

const spiritualGiftDefinitions: Array<[string, string, string]> = [
  ['prophecy', 'Prophecy', 'النبوة'],
  ['servingHelps', 'Serving / Helps', 'الخدمة / المساعدة'],
  ['teaching', 'Teaching', 'التعليم'],
  ['encouragement', 'Encouragement / Exhortation', 'التشجيع / الوعظ العملي'],
  ['giving', 'Giving', 'العطاء'],
  ['leadership', 'Leadership', 'القيادة'],
  ['mercy', 'Mercy / Compassion', 'الرحمة / الشفقة'],
  ['wisdom', 'Wisdom', 'الحكمة'],
  ['knowledge', 'Knowledge', 'المعرفة'],
  ['faith', 'Faith', 'الإيمان'],
  ['administration', 'Administration', 'الإدارة'],
  ['evangelism', 'Evangelism', 'الكرازة'],
  ['pastoring', 'Pastoring / Shepherding', 'الرعاية / الرعي'],
  ['hospitality', 'Hospitality', 'الضيافة'],
]

const spiritualGroups: GroupSpec[] = spiritualGiftDefinitions.map(
  ([id, en, ar], groupIndex) => ({
    id,
    result: { en, ar },
    fields: Array.from(
      { length: 3 },
      (_, fieldIndex) => `q${groupIndex * 3 + fieldIndex + 1}`,
    ),
  }),
)

const ministryResults = Object.fromEntries([
  ['F1', 'Prayer and Intercession', 'الصلاة والشفاعة'],
  ['F2', 'Evangelism and Outreach', 'التبشير والتواصل'],
  ['F3', 'Bible Teaching and Discipleship', 'تعليم الكتاب المقدس والتلمذة'],
  ['F4', 'Spiritual Care and Follow-up', 'الرعاية الروحية والمتابعة'],
  ['F5', 'Worship', 'العبادة'],
  ['F6', "Children's Ministry", 'خدمة الأطفال'],
  ['F7', 'Youth Ministry', 'خدمة الشباب'],
  ['F8', 'Media and Technology', 'الإعلام والتكنولوجيا'],
  ['F9', 'Administration and Oversight', 'الإدارة والإشراف'],
  ['F10', 'Hospitality and Welcome', 'الضيافة والترحيب'],
].map(([id, en, ar]) => [id, { en, ar }]))

const pathwayTextFields: FieldSpec[] = [
  required('fullName', 'text'),
  required('email', 'email'),
  required('surveyDate', 'date'),
  required('age', 'number'),
  required('attendance', 'textarea'),
  optional('currentService', 'textarea'),
  optional('workContext', 'text'),
  optional('arabicFluency', 'text'),
  optional('englishFluency', 'text'),
  optional('otherLanguages', 'text'),
  ...['q1_1', 'q1_2', 'q1_3', 'q1_4', 'q1_5'].map(id => required(id, 'textarea')),
  ...['v1', 'v2', 'v3', 'v4', 'v5'].map(id => required(id, 'textarea')),
  optional('v6', 'textarea'),
]
const pathwayRatings = [
  ...pathwayGroups.flatMap(group => group.fields),
  ...Object.keys(ministryResults),
]

const FORM_SPECS: Record<AssessmentFormId, FormSpec> = {
  'five-service-pathways': {
    id: 'five-service-pathways',
    title: {
      en: 'LINC Spiritual Gifts Assessment Response',
      ar: 'نتيجة تقييم المواهب الروحية والدعوة الشخصية',
    },
    tableNameEquivalent: 'form',
    fields: [...pathwayTextFields, ...ratingFields(pathwayRatings)],
    sections: [
      { id: 'trainee', type: 'fields', fields: pathwayTextFields.slice(0, 10).map(field => field.id) },
      { id: 'faith', type: 'fields', fields: ['q1_1', 'q1_2', 'q1_3', 'q1_4', 'q1_5'] },
      { id: 'gifts', type: 'groupedRating', groups: pathwayGroups },
      { id: 'ministry', type: 'ratingList', fields: Object.keys(ministryResults) },
      { id: 'vision', type: 'fields', fields: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },
    ],
    resultGroups: pathwayGroups,
    ministryResults,
    resultKeys: ['primaryGift', 'secondaryGift', 'recommendedMinistry'],
  },
  'spiritual-gifts-discovery': {
    id: 'spiritual-gifts-discovery',
    title: {
      en: 'LINC Spiritual Gifts Discovery Response',
      ar: 'نتيجة اكتشاف المواهب الروحية',
    },
    tableNameEquivalent: 'spiritual_gifts_discovery',
    fields: [
      required('fullName', 'text'),
      required('surveyDate', 'date'),
      required('email', 'email'),
      optional('ministryRole', 'text'),
      ...ratingFields(spiritualGroups.flatMap(group => group.fields)),
    ],
    sections: [
      { id: 'trainee', type: 'fields', fields: ['fullName', 'surveyDate', 'email', 'ministryRole'] },
      { id: 'spiritualGifts', type: 'groupedRating', groups: spiritualGroups },
    ],
    resultGroups: spiritualGroups,
    resultKeys: ['primaryGift', 'secondaryGift', 'thirdGift'],
  },
}

export class AssessmentValidationError extends Error {
  constructor(readonly issues: string[]) {
    super('The assessment answers are invalid.')
    this.name = 'AssessmentValidationError'
  }
}

export function assessmentFormIds(): AssessmentFormId[] {
  return Object.keys(FORM_SPECS) as AssessmentFormId[]
}

export function normalizeFormState(value: unknown): AssessmentFormState {
  const candidate =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>).state
      : value
  return candidate === 'disabled' || candidate === 'hidden'
    ? candidate
    : 'active'
}

export function buildAssessmentRecord(params: {
  formId: AssessmentFormId
  locale: AssessmentLocale
  answers: AssessmentAnswers
  timestamp: number
}) {
  const spec = FORM_SPECS[params.formId]
  const answers = validateAndNormalizeAnswers(spec, params.answers)
  const groupScores = Object.fromEntries(
    spec.resultGroups.map(group => [
      group.id,
      group.fields.reduce((sum, fieldId) => sum + Number(answers[fieldId]), 0),
    ]),
  )
  const rankedGroups = rank(groupScores)
  const ministryScores = spec.ministryResults
    ? Object.fromEntries(
        Object.keys(spec.ministryResults).map(id => [id, Number(answers[id])]),
      )
    : undefined
  const rankedMinistry = ministryScores ? rank(ministryScores) : []
  const resultIds = spec.id === 'five-service-pathways'
    ? [rankedGroups[0]?.id, rankedGroups[1]?.id, rankedMinistry[0]?.id]
    : [rankedGroups[0]?.id, rankedGroups[1]?.id, rankedGroups[2]?.id]
  const localizedResults = (locale: AssessmentLocale) => {
    const values = Object.fromEntries(
      spec.resultKeys.map((key, index) => {
        const resultId = resultIds[index]
        const text = index === 2 && spec.ministryResults
          ? spec.ministryResults[resultId]?.[locale]
          : spec.resultGroups.find(group => group.id === resultId)?.result[locale]
        return [key, text ?? '']
      }),
    )
    const summary = spec.id === 'five-service-pathways'
      ? locale === 'ar'
        ? `أقوى نتيجة هي ${values.primaryGift}. النتيجة الثانوية هي ${values.secondaryGift}. مجال الخدمة الأكثر توافقاً هو ${values.recommendedMinistry}.`
        : `The strongest result is ${values.primaryGift}. The secondary result is ${values.secondaryGift}. The most aligned ministry area is ${values.recommendedMinistry}.`
      : locale === 'ar'
        ? `أعلى ثلاث مواهب لديك هي ${values.primaryGift}، ${values.secondaryGift}، و${values.thirdGift}.`
        : `Your top three gifts are ${values.primaryGift}, ${values.secondaryGift}, and ${values.thirdGift}.`
    return { ...values, summary }
  }

  return {
    record: {
      tableNameEquivalent: spec.tableNameEquivalent,
      createdAt: params.timestamp,
      createdAtISO: new Date(params.timestamp).toISOString(),
      createdAtEasternTime: easternTime(params.timestamp),
      interfaceLanguageUsed: params.locale === 'ar' ? 'Arabic' : 'English',
      formId: spec.id,
      source: 'hono-public-assessment',
      fields: buildStoredFields(spec, answers),
      scores: {
        giftTotals: groupScores,
        ...(ministryScores ? { ministryTotals: ministryScores } : {}),
      },
      results: {
        English: localizedResults('en'),
        Arabic: localizedResults('ar'),
      },
    },
    publicResult: localizedResults(params.locale),
    email: {
      title: spec.title[params.locale],
      fullName: String(answers.fullName),
      submitterEmail: String(answers.email),
      locale: params.locale,
      answers,
      result: localizedResults(params.locale),
    },
  }
}

export function buildDirectSignupRecord(params: {
  fullName: string
  email: string
  locale: AssessmentLocale
  timestamp: number
}) {
  return {
    tableNameEquivalent: 'form',
    signupType: 'directWithoutAssessmentForm',
    submissionMode: 'directSignupStoredAsFormResponse',
    createdAt: params.timestamp,
    createdAtISO: new Date(params.timestamp).toISOString(),
    createdAtEasternTime: easternTime(params.timestamp),
    interfaceLanguageUsed: params.locale === 'ar' ? 'Arabic' : 'English',
    formId: 'five-service-pathways',
    sourceFormId: 'directSignup',
    source: 'hono-public-assessment',
    fullName: params.fullName,
    email: params.email,
    fields: {
      trainee: {
        fullName: { fieldEnglish: 'Full Name', fieldArabic: 'الاسم الكامل', value: params.fullName },
        email: { fieldEnglish: 'Email', fieldArabic: 'البريد الإلكتروني', value: params.email },
      },
    },
    scores: {},
    results: {
      English: { summary: 'Direct sign-up saved as a form-response row. No assessment answers were submitted.' },
      Arabic: { summary: 'تم حفظ التسجيل المباشر كصف ضمن ردود النماذج. لم يتم إرسال إجابات تقييم.' },
    },
  }
}

export function normalizeAssessmentResponses(value: unknown, formId: AssessmentFormId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .filter(([, raw]) => responseBelongsToForm(raw, formId))
    .map(([id, raw]) => {
      const record = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {}
      return {
        id,
        formId,
        fullName: extractValue(record, ['fullName', 'name']) || 'N/A',
        email: extractValue(record, ['email', 'emailAddress']) || 'N/A',
        userIdentifier: extractValue(record, ['userIdentifier', 'linkedUserIdentifier']),
        databaseFormId: extractValue(record, ['databaseFormId', 'linkedFormId']),
        fillingLanguage: extractValue(record, ['interfaceLanguageUsed']) || 'English',
        identifierEmailSentAt: Number(record.identifierEmailSentAt || 0) || null,
        createdAt: Number(record.createdAt || 0),
        createdAtEasternTime: String(record.createdAtEasternTime || record.createdAtISO || ''),
        raw: record,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function extractAssessmentResponseDetails(raw: unknown) {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  return {
    fullName: extractValue(record, ['fullName', 'name']),
    email: extractValue(record, ['email', 'emailAddress']),
    userIdentifier: extractValue(record, ['userIdentifier', 'linkedUserIdentifier']),
    language: extractValue(record, ['interfaceLanguageUsed']) === 'Arabic' ? 'ar' as const : 'en' as const,
  }
}

function validateAndNormalizeAnswers(spec: FormSpec, input: AssessmentAnswers) {
  const knownFields = new Map(spec.fields.map(field => [field.id, field]))
  const issues: string[] = []
  const answers: Record<string, string | number> = {}

  for (const key of Object.keys(input)) {
    if (!knownFields.has(key)) issues.push(`Unknown answer field: ${key}`)
  }

  for (const field of spec.fields) {
    const raw = input[field.id]
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (field.required && (value === undefined || value === '')) {
      issues.push(`${field.id} is required.`)
      continue
    }
    if (value === undefined || value === '') {
      answers[field.id] = ''
      continue
    }
    if (field.type === 'rating') {
      const rating = Number(value)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        issues.push(`${field.id} must be a rating from 1 to 5.`)
      } else answers[field.id] = rating
      continue
    }
    if (field.type === 'number') {
      const number = Number(value)
      if (!Number.isFinite(number) || number < 1 || number > 120) {
        issues.push(`${field.id} must be between 1 and 120.`)
      } else answers[field.id] = number
      continue
    }
    const text = String(value)
    if (text.length > 5_000) issues.push(`${field.id} is too long.`)
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      issues.push(`${field.id} must be a valid email address.`)
    }
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      issues.push(`${field.id} must be a YYYY-MM-DD date.`)
    }
    answers[field.id] = text
  }

  if (issues.length) throw new AssessmentValidationError(issues)
  return answers
}

function buildStoredFields(spec: FormSpec, answers: Record<string, string | number>) {
  return Object.fromEntries(spec.sections.map(section => {
    if (section.type === 'groupedRating') {
      return [section.id, Object.fromEntries((section.groups ?? []).map(group => [
        group.id,
        {
          sectionEnglish: group.result.en,
          sectionArabic: group.result.ar,
          questions: Object.fromEntries(group.fields.map(id => [id, {
            questionEnglish: id,
            questionArabic: id,
            score: Number(answers[id]),
          }])),
        },
      ]))]
    }
    if (section.type === 'ratingList') {
      return [section.id, Object.fromEntries((section.fields ?? []).map(id => [id, {
        areaEnglish: spec.ministryResults?.[id]?.en ?? id,
        areaArabic: spec.ministryResults?.[id]?.ar ?? id,
        score: Number(answers[id]),
      }]))]
    }
    return [section.id, Object.fromEntries((section.fields ?? []).map(id => [id, {
      fieldEnglish: id,
      fieldArabic: id,
      value: answers[id] ?? '',
    }]))]
  }))
}

function rank(scores: Record<string, number>) {
  return Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

function responseBelongsToForm(raw: unknown, formId: AssessmentFormId) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const record = raw as Record<string, unknown>
  const storedFormId = String(record.sourceFormId || record.formId || '')
  if (formId === 'five-service-pathways') {
    return storedFormId === formId || storedFormId === 'directSignup' || storedFormId === '0'
  }
  return storedFormId === formId || storedFormId === '1'
}

function extractValue(value: unknown, candidateKeys: string[]): string {
  const normalized = new Set(candidateKeys.map(key => key.toLowerCase()))
  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) return ''
    if (typeof current === 'string' || typeof current === 'number') {
      return normalized.has(currentKey.toLowerCase()) ? String(current).trim() : ''
    }
    if (typeof current !== 'object') return ''
    for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
      if (normalized.has(key.toLowerCase())) {
        if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim()
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          const wrapped = (nested as Record<string, unknown>).value
          if (typeof wrapped === 'string' || typeof wrapped === 'number') return String(wrapped).trim()
        }
      }
      const found = visit(nested, key)
      if (found) return found
    }
    return ''
  }
  return visit(value)
}

function easternTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(timestamp))
}

