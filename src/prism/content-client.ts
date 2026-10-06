import type { SiteContent } from "./shells/types";

/** Shared API loader. Article bodies are requested lazily, keyed by slug,
 * and never reused as the body of another route. Rejected requests are evicted
 * so a transient failure does not freeze every lens for the rest of a visit. */
export function createContentLoader(
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  const cached = new Map<string, { at: number; value: SiteContent }>();
  const pending = new Map<string, Promise<SiteContent>>();
  return {
    async load(slug?: string, fresh = false): Promise<SiteContent> {
      const key = slug ?? "";
      const previous = cached.get(key);
      if (!fresh && previous && now() - previous.at < 60_000)
        return previous.value;
      if (pending.has(key)) return pending.get(key)!;
      const request = (async () => {
        const query =
          slug === undefined ? "" : `?writing=${encodeURIComponent(slug)}`;
        const response = await fetcher(`/prism/content.json${query}`);
        if (!response.ok)
          throw new Error(`Portfolio content returned ${response.status}.`);
        const value = (await response.json()) as SiteContent;
        if (!value.site || !value.pages || !value.writing)
          throw new Error("Portfolio content changed shape.");
        if (
          slug !== undefined &&
          value.writing.entry &&
          value.writing.entry.slug !== slug
        )
          throw new Error(
            "Portfolio article did not match the requested route.",
          );
        // Never carry a previously requested body into the metadata-only index.
        if (slug === undefined) {
          delete value.writing.entry;
          delete value.writing.entryStatus;
        }
        cached.delete(key);
        cached.set(key, { at: now(), value });
        while (cached.size > 32) cached.delete(cached.keys().next().value!);
        return value;
      })();
      pending.set(key, request);
      try {
        return await request;
      } finally {
        pending.delete(key);
      }
    },
  };
}

/** A same-URL sync should rebuild only when live writing actually changed. */
export function writingChanged(previous: SiteContent, next: SiteContent) {
  return JSON.stringify(previous.writing) !== JSON.stringify(next.writing);
}
