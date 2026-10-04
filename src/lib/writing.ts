import { getEntry } from "astro:content";
import { getCache } from "@vercel/functions";
import { createSubstackSource } from "./content/substack.mjs";
import { writingSchema } from "./content/writing-schema";
import type { WritingEntry } from "./content/writing-schema";
export type { WritingEntry } from "./content/writing-schema";

// Astro 5's collections are build-time snapshots. Keep live source access
// behind the same content-shaped interface, independent of page/lens rendering.
let source: Promise<ReturnType<typeof createSubstackSource>> | undefined;
function getSource() {
  if (!source) {
    source = (async () => {
      const site = (await getEntry("site", "config"))?.data;
      if (!site) throw new Error("Missing site config entry.");
      return createSubstackSource({
        origin: site.writingUrl,
        cache: process.env.VERCEL ? getCache() : undefined,
      });
    })().catch((error) => {
      source = undefined;
      throw error;
    });
  }
  return source;
}
function entry(post: {
  id: string;
  slug: string;
  data: unknown;
  body?: string;
}): WritingEntry {
  return { ...post, data: writingSchema.parse(post.data) };
}
export async function getPosts(): Promise<WritingEntry[]> {
  return (await (await getSource()).getPosts()).map(entry);
}
export async function getPost(slug: string): Promise<WritingEntry | null> {
  const post = await (await getSource()).getPost(slug);
  return post ? entry(post) : null;
}

// Revalidate HTML quickly; data freshness and bounded outage fallback are
// controlled by the source cache, not by a full-site rebuild.
export const writingHeaders = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "public, max-age=60",
};
export function formatDate(date: Date, style: "short" | "long" = "long") {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
