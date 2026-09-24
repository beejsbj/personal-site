import type { APIRoute } from "astro";
import { selectPresenceSignals } from "../../lib/activity-presence.mjs";
import { getPublicActivity } from "../../lib/public-activity";
import { selectFeedEvents } from "../../lib/activity-feed.mjs";
import { validatePublicExport } from "../../lib/activity-engine/validation.mjs";
import { getHouseExcludedActivityIds } from "../../data/activity-house";

export const prerender = false;
const MAX_BYTES = 65_536;

/** An optional reviewed public feed. This route never reads private engine storage. */
export const GET: APIRoute = async () => {
  const generatedAt = new Date().toISOString();
  const localEvents = await getPublicActivity();
  const configured =
    import.meta.env.ACTIVITY_FEED_URL ?? import.meta.env.ACTIVITY_PRESENCE_URL;
  const authoredEvents = localEvents.filter((event) => event.id?.startsWith("site:"));
  const reply = async (
    status: "connected" | "unavailable",
    signals: unknown[] = [],
    events: unknown[] = configured ? authoredEvents : localEvents,
  ) =>
    new Response(
      JSON.stringify({ version: 1, generatedAt, status, signals, events,
        houseExcludedIds: await getHouseExcludedActivityIds(events, signals),
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  if (!configured) return reply("unavailable");
  try {
    // This is operator configuration, never a visitor-provided URL or proxy query.
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password)
      return reply("unavailable");
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok || !response.body) return reply("unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return reply("unavailable");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const signals = selectPresenceSignals(data, Date.now());
    // A combined engine export is an authoritative durable snapshot: deletions
    // and retractions must not be revived from a stale committed engine export.
    const events =
      data.events === undefined
        ? localEvents
        : selectFeedEvents([
            ...validatePublicExport(data).events,
            ...authoredEvents,
          ]);
    return reply("connected", signals, events);
  } catch {
    // No upstream URL, error body, credential, or private diagnostic reaches visitors.
    return reply("unavailable");
  }
};
