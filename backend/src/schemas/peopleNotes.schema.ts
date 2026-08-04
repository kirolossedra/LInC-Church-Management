import { z } from 'zod'

export const peopleNotesIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,120}$/)

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)

export const createPersonSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    contact: z.string().trim().max(240).default(''),
  })
  .strict()

export const createDevelopmentItemSchema = z
  .object({
    type: z.enum(['strength', 'growth']),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).default(''),
    dateAdded: dateSchema,
    latestFollowUpDate: z
      .union([dateSchema, z.literal('')])
      .default(''),
  })
  .strict()

export const createDevelopmentCommentSchema = z
  .object({
    text: z.string().trim().min(1).max(5000),
  })
  .strict()

export const updateFollowUpDateSchema = z
  .object({
    latestFollowUpDate: dateSchema,
  })
  .strict()

export const firebasePushResponseSchema = z
  .object({
    name: peopleNotesIdSchema,
  })
  .strict()
