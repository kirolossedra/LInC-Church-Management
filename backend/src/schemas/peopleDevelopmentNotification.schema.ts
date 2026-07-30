import { z } from 'zod'

export const peopleDevelopmentGroupIdSchema = z.enum([
  'pastors',
  'prophets',
  'evangelists',
  'teachers',
  'apostles',
  'helpers',
  'mercy',
  'facilitators',
  'services',
  'giving',
])

const recipientSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254),
    name: z
      .string()
      .trim()
      .min(1)
      .max(120),
  })
  .strict()

const attachmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255),
    size: z
      .number()
      .int()
      .nonnegative(),
  })
  .strict()

const postSchema = z
  .object({
    text: z
      .string()
      .trim()
      .max(10000),
    postedAtLabel: z
      .string()
      .trim()
      .min(1)
      .max(160),
    appUrl: z.union([
      z.literal(''),
      z.string().trim().url().max(2048),
    ]),
    attachments: z
      .array(attachmentSchema)
      .max(10),
  })
  .strict()
  .refine(
    post =>
      Boolean(post.text) ||
      post.attachments.length > 0,
    {
      message:
        'The post must include text or at least one attachment.',
    },
  )

export const peopleDevelopmentNotificationRequestSchema = z
  .object({
    assignmentId: z
      .string()
      .trim()
      .min(1)
      .max(160),
    groups: z
      .array(peopleDevelopmentGroupIdSchema)
      .min(1)
      .max(10)
      .refine(
        groups =>
          new Set(groups).size === groups.length,
        {
          message:
            'People Development groups must be unique.',
        },
      ),
    recipients: z
      .array(recipientSchema)
      .min(1)
      .max(1999),
    post: postSchema,
  })
  .strict()

export type PeopleDevelopmentNotificationRequest = z.infer<
  typeof peopleDevelopmentNotificationRequestSchema
>

export type PeopleDevelopmentGroupId = z.infer<
  typeof peopleDevelopmentGroupIdSchema
>
