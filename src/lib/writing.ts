import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export type WritingEntry = CollectionEntry<"writing">;

/** Every synced post, newest first. */
export async function getPosts(): Promise<WritingEntry[]> {
  return (await getCollection("writing")).sort(
    (a: WritingEntry, b: WritingEntry) =>
      b.data.date.getTime() - a.data.date.getTime(),
  );
}

// UTC, so a build in any timezone prints the date Substack published.
export function formatDate(date: Date, style: "short" | "long" = "long") {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
