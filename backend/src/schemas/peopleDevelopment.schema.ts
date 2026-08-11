import { z } from 'zod'

export const peopleDevelopmentGroups = [
  'pastors', 'prophets', 'evangelists', 'teachers', 'apostles',
  'helpers', 'mercy', 'facilitators', 'services', 'giving',
] as const

export const groupSchema = z.enum(peopleDevelopmentGroups)
export const optionalGroupSchema = z.union([groupSchema, z.literal('')])
export const idSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/)
const dateSchema = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])

export const portalAccessSchema = z.object({
  identifier: z.string().trim().min(4).max(160),
}).strict()

export const assignMemberSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  fullName: z.string().trim().max(240).default(''),
  email: z.string().trim().max(320).default(''),
  primaryGift: z.string().trim().max(240).default(''),
  sourcePath: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).default('form'),
  sourceKeys: z.array(idSchema).max(20).default([]),
  group: optionalGroupSchema,
  groupLabel: z.string().trim().max(160).default(''),
}).strict()

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(240),
  type: z.string().trim().max(160).default('application/pdf'),
  size: z.number().int().min(0).max(1_048_576),
  encoding: z.literal('base64'),
  storage: z.literal('realtimeDatabase'),
  base64: z.string().min(1).max(1_500_000),
  uploadedAt: z.number().finite().nonnegative(),
  uploadedAtISO: z.string().trim().max(80),
}).strict()

export const createAssignmentSchema = z.object({
  groups: z.array(groupSchema).min(1).max(10),
  groupLabel: z.string().trim().max(160).default(''),
  text: z.string().trim().max(20_000).default(''),
  attachments: z.array(attachmentSchema).max(5).default([]),
  source: z.string().trim().max(120).default('pastorCalendar'),
}).strict().refine(value => value.text.length > 0 || value.attachments.length > 0, {
  message: 'Assignment text or an attachment is required.',
})

export const replaceAssignmentAttachmentsSchema = z.object({
  attachments: z.array(attachmentSchema).max(5),
}).strict()

export const createPersonalNoteSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  memberKey: idSchema,
  fullName: z.string().trim().max(240).default(''),
  email: z.string().trim().max(320).default(''),
  group: optionalGroupSchema,
  groupLabel: z.string().trim().max(160).default(''),
  type: z.enum(['strength', 'weakness']),
  text: z.string().trim().min(1).max(20_000),
  source: z.string().trim().max(120).default('pastorCalendar'),
}).strict()

const scheduleFieldsSchema = z.object({
  audience: z.enum(['group', 'shared']),
  group: optionalGroupSchema,
  ordinal: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal('last')]),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(30).max(480).default(90),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: dateSchema,
  active: z.boolean(),
}).strict()

export const createScheduleSchema = scheduleFieldsSchema.refine(value => value.audience === 'shared' || value.group !== '', {
  message: 'A group is required for group meetings.',
}).refine(value => !value.endDate || value.endDate >= value.startDate, {
  message: 'The schedule end date cannot precede its start date.',
})

export const updateScheduleSchema = scheduleFieldsSchema.partial().strict()
  .refine(value => value.audience !== 'group' || (typeof value.group === 'string' && value.group !== ''), {
    message: 'A group is required for group meetings.',
  })
  .refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: 'The schedule end date cannot precede its start date.',
  })

export const firebasePushResponseSchema = z.object({ name: idSchema }).strict()
