import { z } from "astro:content";

// Shared content contract for source adapters and every visual lens.
export const writingSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  date: z.coerce.date(),
  canonical: z.string().url(),
  cover: z.string().url().optional(),
  description: z.string(),
});
export type WritingData = z.infer<typeof writingSchema>;
export interface WritingEntry {
  id: string;
  slug: string;
  data: WritingData;
  body?: string;
}
