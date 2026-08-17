import { z } from 'zod'

export const ABOUT_PEOPLE_PATH = ['publicContent', 'about', 'people'] as const
export const MAX_ABOUT_PEOPLE = 24

const imageDataUrlSchema = z.string().max(2_100_000).refine(
  value => /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value),
  'A portrait must be a Base64 image data URL.',
)

export const aboutPersonInputSchema = z.object({
  photoUrl: imageDataUrlSchema,
  nameEn: z.string().trim().max(140).default(''),
  nameAr: z.string().trim().max(140).default(''),
  roleEn: z.string().trim().max(180).default(''),
  roleAr: z.string().trim().max(180).default(''),
  descriptionEn: z.string().trim().max(2_000).default(''),
  descriptionAr: z.string().trim().max(2_000).default(''),
}).strict()
  .refine(value => Boolean(value.nameEn || value.nameAr), 'A person name is required.')
  .refine(value => Boolean(value.roleEn || value.roleAr), 'A person role is required.')

export const aboutPeopleOrderSchema = z.object({
  personIds: z.array(z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/))
    .max(MAX_ABOUT_PEOPLE)
    .refine(ids => new Set(ids).size === ids.length),
}).strict()

export type AboutPersonInput = z.infer<typeof aboutPersonInputSchema>

export type AboutPerson = AboutPersonInput & {
  id: string
  order: number
  createdAt: number
  updatedAt: number
}

export function normalizeAboutPeople(value: unknown): AboutPerson[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([id, raw]) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
      const record = raw as Record<string, unknown>
      const parsed = aboutPersonInputSchema.safeParse({
        photoUrl: stringValue(record.photoUrl || record.photo),
        nameEn: stringValue(record.nameEn || record.name),
        nameAr: stringValue(record.nameAr),
        roleEn: stringValue(record.roleEn || record.role),
        roleAr: stringValue(record.roleAr),
        descriptionEn: stringValue(record.descriptionEn || record.description),
        descriptionAr: stringValue(record.descriptionAr),
      })
      if (!parsed.success) return []
      return [{
        id,
        ...parsed.data,
        order: finiteNumber(record.order),
        createdAt: finiteNumber(record.createdAt),
        updatedAt: finiteNumber(record.updatedAt),
      }]
    })
    .sort((first, second) => first.order - second.order || first.createdAt - second.createdAt)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
