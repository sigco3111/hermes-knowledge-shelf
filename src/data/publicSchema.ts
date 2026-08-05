import { z } from 'zod'
import { createHash } from 'node:crypto'

// `id` is optional at source; `toPublicBook` backfills a stable sha256 so the refresh pipeline dedupes across runs. `publishedAt` drives LIFO rotation when the per-book sections.max cap is reached.
export const publicSectionSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  heading: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1200),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/)
    .optional(),
}).strip()

export const publicBookSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(60),
  kicker: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(240),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sections: z.array(publicSectionSchema).min(1).max(6),
}).strip()

export type PublicSection = z.infer<typeof publicSectionSchema>
export type PublicBook = z.infer<typeof publicBookSchema>

export function deriveSectionId(heading: string, body: string): string {
  return createHash('sha256').update(`${heading}\n${body}`).digest('hex').slice(0, 12)
}

export function toPublicBook(input: unknown): PublicBook {
  const parsed = publicBookSchema.parse(input)
  const sections = parsed.sections.map((section) => {
    if (section.id && section.id.length > 0) return section
    return { ...section, id: deriveSectionId(section.heading, section.body) }
  })
  return { ...parsed, sections }
}

export function toPublicBooks(input: unknown): PublicBook[] {
  if (!Array.isArray(input)) {
    throw new Error('toPublicBooks: expected an array of book records')
  }
  return input.map((entry) => toPublicBook(entry))
}
