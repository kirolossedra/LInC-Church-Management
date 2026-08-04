import { z } from 'zod'

export const assessmentFormIdSchema = z.enum([
  'five-service-pathways',
  'spiritual-gifts-discovery',
])

export const assessmentLocaleSchema = z.enum(['en', 'ar'])

export const assessmentSubmissionSchema = z
  .object({
    formId: assessmentFormIdSchema,
    locale: assessmentLocaleSchema,
    answers: z.record(
      z.string().min(1).max(80),
      z.union([
        z.string().max(5_000),
        z.number().finite(),
      ]),
    ),
  })
  .strict()

export const directAssessmentSignupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    locale: assessmentLocaleSchema,
  })
  .strict()

export const assessmentFormStateSchema = z.enum([
  'active',
  'disabled',
  'hidden',
])

export const updateAssessmentFormStateSchema = z
  .object({ state: assessmentFormStateSchema })
  .strict()

export const assessmentResponseQuerySchema = z
  .object({ formId: assessmentFormIdSchema })
  .strict()

export const assessmentResponseIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,160}$/)

export const assessmentLinkageSchema = z
  .object({
    userIdentifier: z.string().trim().max(160),
    databaseFormId: z.enum(['', '0', '1']),
  })
  .strict()

export const firebasePushResponseSchema = z.object({
  name: z.string().min(1),
})

