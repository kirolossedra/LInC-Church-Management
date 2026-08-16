import { z } from 'zod'

import {
  BEZALEL_BOOKING_PROMPT,
  BEZALEL_PASTOR_BASELINE_PROMPT,
  BEZALEL_QUESTION_REVIEW_PROMPT,
  BEZALEL_THEME_TRANSLATION_PROMPT,
} from './bezalel.prompts'
import { generateGeminiJson, type GeminiBindings } from '../services/gemini.service'

const bilingualThemeSchema = z.object({
  en: z.string().trim().min(1).max(1_000),
  ar: z.string().trim().min(1).max(1_000),
  sourceLanguage: z.enum(['en', 'ar', 'mixed']),
})

const questionReviewSchema = z.object({
  relevant: z.boolean(),
  reason: z.string().trim().min(1).max(500),
  suggestedQuestion: z.string().trim().max(500).default(''),
})

export type BilingualTheme = z.infer<typeof bilingualThemeSchema>
export type NextGenQuestionReview = z.infer<typeof questionReviewSchema>

const PASTOR_ACTIONS = [
  'open_availability',
  'block_time',
  'delete_availability',
  'delete_unavailability',
  'accept_request',
  'reject_request',
  'create_group_schedule',
  'update_group_schedule',
  'set_group_schedule_active',
  'delete_group_schedule',
] as const

const pastorActionSchema = z.object({
  action: z.enum(PASTOR_ACTIONS),
  date: z.string().trim().max(10).default(''),
  startTime: z.string().trim().max(5).default(''),
  endTime: z.string().trim().max(5).default(''),
  targetId: z.string().trim().max(128).default(''),
  reason: z.string().trim().max(1_000).default(''),
  meetingTitle: z.string().trim().max(200).default('Meeting with Pastor'),
  audience: z.enum(['group', 'shared']).default('group'),
  group: z.string().trim().max(40).default(''),
  ordinal: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal('last')]).default(1),
  weekday: z.number().int().min(0).max(6).default(0),
  durationMinutes: z.number().int().min(30).max(480).default(90),
  startDate: z.string().trim().max(10).default(''),
  endDate: z.string().trim().max(10).default(''),
  active: z.boolean().default(true),
})

export const pastorAgentResultSchema = z.object({
  reply: z.string().trim().min(1).max(2_000),
  focusDates: z.array(z.string().trim().max(10)).max(14).default([]),
  actions: z.array(pastorActionSchema).max(7).default([]),
})

export type PastorAgentResult = z.infer<typeof pastorAgentResultSchema>

const publicBookingAgentSchema = z.object({
  reply: z.string().trim().min(1).max(2_000),
  stage: z.enum(['answer', 'collect', 'ready_to_book']),
  focusDate: z.string().trim().max(10).default(''),
  suggestions: z.array(z.object({
    date: z.string().trim().max(10),
    startTime: z.string().trim().max(5),
    endTime: z.string().trim().max(5),
  })).max(6).default([]),
  booking: z.object({
    name: z.string().trim().max(100).default(''),
    email: z.string().trim().max(254).default(''),
    date: z.string().trim().max(10).default(''),
    startTime: z.string().trim().max(5).default(''),
    endTime: z.string().trim().max(5).default(''),
    reason: z.string().trim().max(2_000).default(''),
  }).default({ name: '', email: '', date: '', startTime: '', endTime: '', reason: '' }),
})

export type PublicBookingAgentResult = z.infer<typeof publicBookingAgentSchema>

const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})

export async function translateQaTheme(
  bindings: GeminiBindings,
  theme: string,
  fetchImpl?: typeof fetch,
) {
  return generateGeminiJson({
    bindings,
    fetchImpl,
    systemInstruction: BEZALEL_THEME_TRANSLATION_PROMPT,
    prompt: `Theme to translate:\n${theme}`,
    validator: bilingualThemeSchema,
    responseSchema: objectSchema({
      en: { type: 'string' },
      ar: { type: 'string' },
      sourceLanguage: { type: 'string', enum: ['en', 'ar', 'mixed'] },
    }, ['en', 'ar', 'sourceLanguage']),
  })
}

export async function reviewNextGenQuestion(
  bindings: GeminiBindings,
  input: { theme: BilingualTheme; question: string },
  fetchImpl?: typeof fetch,
) {
  return generateGeminiJson({
    bindings,
    fetchImpl,
    systemInstruction: BEZALEL_QUESTION_REVIEW_PROMPT,
    prompt: `English theme: ${input.theme.en}\nArabic theme: ${input.theme.ar}\nSubmitted question: ${input.question}`,
    validator: questionReviewSchema,
    responseSchema: objectSchema({
      relevant: { type: 'boolean' },
      reason: { type: 'string' },
      suggestedQuestion: { type: 'string' },
    }, ['relevant', 'reason', 'suggestedQuestion']),
  })
}

export async function runPastorAgent(
  bindings: GeminiBindings,
  input: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; calendar: unknown; today: string },
  fetchImpl?: typeof fetch,
) {
  return generateGeminiJson({
    bindings,
    fetchImpl,
    systemInstruction: BEZALEL_PASTOR_BASELINE_PROMPT,
    prompt: `Today in Toronto: ${input.today}\nCalendar snapshot: ${JSON.stringify(input.calendar)}\nConversation: ${JSON.stringify(input.messages)}`,
    validator: pastorAgentResultSchema,
    responseSchema: objectSchema({
      reply: { type: 'string' },
      focusDates: { type: 'array', maxItems: 14, items: { type: 'string' } },
      actions: {
        type: 'array',
        maxItems: 7,
        items: objectSchema({
          action: { type: 'string', enum: PASTOR_ACTIONS },
          date: { type: 'string' }, startTime: { type: 'string' }, endTime: { type: 'string' },
          targetId: { type: 'string' }, reason: { type: 'string' }, meetingTitle: { type: 'string' },
          audience: { type: 'string', enum: ['group', 'shared'] }, group: { type: 'string' },
          ordinal: { anyOf: [{ type: 'integer', enum: [1, 2, 3, 4] }, { type: 'string', enum: ['last'] }] }, weekday: { type: 'integer' },
          durationMinutes: { type: 'integer' }, startDate: { type: 'string' },
          endDate: { type: 'string' }, active: { type: 'boolean' },
        }, ['action', 'date', 'startTime', 'endTime', 'targetId', 'reason', 'meetingTitle', 'audience', 'group', 'ordinal', 'weekday', 'durationMinutes', 'startDate', 'endDate', 'active']),
      },
    }, ['reply', 'focusDates', 'actions']),
  })
}

export async function runPublicBookingAgent(
  bindings: GeminiBindings,
  input: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; schedule: unknown; today: string; locale: 'en' | 'ar' },
  fetchImpl?: typeof fetch,
) {
  return generateGeminiJson({
    bindings,
    fetchImpl,
    systemInstruction: BEZALEL_BOOKING_PROMPT,
    prompt: `Today in Toronto: ${input.today}\nVisitor locale: ${input.locale}\nPublic schedule: ${JSON.stringify(input.schedule)}\nConversation: ${JSON.stringify(input.messages)}`,
    validator: publicBookingAgentSchema,
    responseSchema: objectSchema({
      reply: { type: 'string' },
      stage: { type: 'string', enum: ['answer', 'collect', 'ready_to_book'] },
      focusDate: { type: 'string' },
      suggestions: { type: 'array', maxItems: 6, items: objectSchema({ date: { type: 'string' }, startTime: { type: 'string' }, endTime: { type: 'string' } }, ['date', 'startTime', 'endTime']) },
      booking: objectSchema({
        name: { type: 'string' }, email: { type: 'string' }, date: { type: 'string' },
        startTime: { type: 'string' }, endTime: { type: 'string' }, reason: { type: 'string' },
      }, ['name', 'email', 'date', 'startTime', 'endTime', 'reason']),
    }, ['reply', 'stage', 'focusDate', 'suggestions', 'booking']),
  })
}
