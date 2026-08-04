import { z } from 'zod'

export const publicSectionSchema = z.object({
  heading: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1200),
}).strip()

export const publicBookSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(60),
  kicker: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(240),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sections: z.array(publicSectionSchema).min(1).max(6),
}).strip()

export type PublicBook = z.infer<typeof publicBookSchema>

export function toPublicBook(input: unknown): PublicBook {
  return publicBookSchema.parse(input)
}
