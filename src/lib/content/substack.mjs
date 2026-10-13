import { sanitizeSubstackHtml } from "./substack-html.mjs";

export class ContentUnavailable extends Error {}
class SourceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
const SLUG = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/;
const FRESH = 300_000;
const MAX_STALE = 3_600_000;

/** Public-only content source. Cache entries carry timestamps independently of
 * cache storage TTL; a failed request never renews a stale entry's lifetime. */
export function createSubstackSource({
  origin,
  fetcher = fetch,
  cache,
  now = Date.now,
}) {
  const base = new URL(origin).origin;
  const memory = new Map();
  const pending = new Map();
  const key = (part) => `burooj-writing-v1:${base}:${part}`;
  async function read(part) {
    const local = memory.get(part);
    if (local && now() - local.at < FRESH) return local;
    try {
      const shared = await cache?.get(key(part));
      if (shared && (!local || shared.at > local.at)) {
        remember(part, shared);
        return shared;
      }
    } catch {
      /* Cache failure must not take down the source. */
    }
    return local;
  }
  function remember(part, entry) {
    memory.delete(part);
    memory.set(part, entry);
    while (memory.size > 512) memory.delete(memory.keys().next().value);
  }
  async function write(part, value) {
    const entry = { at: now(), value };
    remember(part, entry);
    try {
      await cache?.set(key(part), entry, { ttl: MAX_STALE / 1000 });
    } catch {
      /* Warm-process cache still works if the shared cache is unavailable. */
    }
    return entry;
  }
  async function forget(part) {
    // A deletion alone can fail and allow a later shared-cache read to resurrect
    // an old body. Keep a warm tombstone and publish it to the shared cache.
    const entry = { at: now(), tombstone: true };
    remember(part, entry);
    try {
      await cache?.set(key(part), entry, { ttl: MAX_STALE / 1000 });
    } catch {
      try {
        await cache?.delete(key(part));
      } catch {
        /* warm tombstone remains */
      }
    }
  }
  async function cached(part, load, { stale = true } = {}) {
    if (pending.has(part)) return pending.get(part);
    const promise = (async () => {
      const previous = await read(part);
      if (previous && !previous.tombstone && now() - previous.at < FRESH)
        return previous;
      try {
        return await write(part, await load());
      } catch (error) {
        // Known 4xx/deletion/private responses must never reveal an old public body.
        const transient =
          !(error instanceof SourceError) ||
          error.status === 429 ||
          error.status >= 500;
        if (
          stale &&
          transient &&
          previous &&
          !previous.tombstone &&
          now() - previous.at < MAX_STALE
        )
          return previous;
        if (!transient) await forget(part);
        throw error;
      }
    })();
    pending.set(part, promise);
    try {
      return await promise;
    } finally {
      pending.delete(part);
    }
  }
  async function cachedValue(part, load, options) {
    return (await cached(part, load, options)).value;
  }
  async function text(path) {
    const url = new URL(path, base);
    let response;
    try {
      response = await fetcher(url, {
        headers: {
          "user-agent": "burooj.dev public writing (+https://burooj.dev)",
        },
        signal: AbortSignal.timeout(6000),
        redirect: "error",
      });
    } catch {
      throw new ContentUnavailable("Substack could not be reached.");
    }
    if (!response.ok)
      throw new SourceError(
        `Substack returned ${response.status}.`,
        response.status,
      );
    const result = await response.text();
    if (result.length > 2_000_000)
      throw new ContentUnavailable(
        "Substack response exceeded the content limit.",
      );
    return result;
  }
  async function json(path) {
    try {
      return JSON.parse(await text(path));
    } catch (error) {
      if (error instanceof SourceError || error instanceof ContentUnavailable)
        throw error;
      throw new ContentUnavailable("Substack returned invalid JSON.");
    }
  }
  const published = (post) =>
    post.audience === "everyone" && post.is_published !== false;
  function metadata(post) {
    const date = new Date(post.post_date);
    if (
      !SLUG.test(post.slug ?? "") ||
      typeof post.title !== "string" ||
      !post.title.trim() ||
      !Number.isFinite(date.getTime())
    ) {
      throw new ContentUnavailable("Substack post metadata changed shape.");
    }
    const plain = (value) =>
      sanitizeSubstackHtml(typeof value === "string" ? value : "").text;
    const subtitle = plain(post.subtitle);
    const description = plain(post.description) || subtitle;
    let cover;
    try {
      const url = new URL(post.cover_image);
      if (url.protocol === "https:") cover = url.href;
    } catch {
      /* optional */
    }
    return {
      id: post.slug,
      slug: post.slug,
      data: {
        title: post.title.trim(),
        subtitle: subtitle || undefined,
        date: date.toISOString(),
        canonical: `${base}/p/${post.slug}`,
        cover,
        description: description.slice(0, 200),
      },
    };
  }
  async function archive() {
    const result = new Map();
    const seen = new Set();
    for (let offset = 0; offset < 10_000; offset += 50) {
      const page = await json(
        `/api/v1/archive?sort=new&offset=${offset}&limit=50`,
      );
      if (!Array.isArray(page) || page.length > 50)
        throw new ContentUnavailable("Substack archive changed shape.");
      let discovered = 0;
      for (const post of page) {
        if (
          !post ||
          typeof post !== "object" ||
          typeof post.audience !== "string"
        )
          throw new ContentUnavailable("Substack archive changed shape.");
        // Validate excluded post slugs too, so malformed source data cannot
        // silently replace a healthy archive with a partial one.
        const entry = metadata(post);
        if (!seen.has(entry.slug)) discovered += 1;
        seen.add(entry.slug);
        if (published(post)) result.set(entry.slug, entry);
      }
      if (page.length === 50 && discovered === 0)
        throw new ContentUnavailable(
          "Substack archive pagination repeated a page.",
        );
      if (page.length < 50)
        return [...result.values()].sort((a, b) =>
          b.data.date.localeCompare(a.data.date),
        );
    }
    throw new ContentUnavailable(
      "Substack archive pagination did not terminate.",
    );
  }
  async function feed() {
    return parseFeed(await text("/feed"), base);
  }
  async function getIndex() {
    try {
      const snapshot = await cached("archive", archive);
      const posts = snapshot.value;
      return {
        posts,
        authoritative: Boolean(
          snapshot && !snapshot.tombstone && now() - snapshot.at < FRESH,
        ),
      };
    } catch (error) {
      // The official feed is a recent-post fallback, never a full-history claim.
      // Do not substitute it for an authoritative access-denied archive response.
      if (
        error instanceof SourceError &&
        error.status < 500 &&
        error.status !== 429
      )
        throw new ContentUnavailable(error.message, { cause: error });
      try {
        const posts = (await cachedValue("feed", feed)).map(
          ({ body, ...post }) => post,
        );
        if (!posts.length)
          throw new ContentUnavailable(
            "The fallback feed contains no public posts.",
          );
        return { posts, authoritative: false };
      } catch {
        throw new ContentUnavailable("Writing is temporarily unavailable.");
      }
    }
  }
  async function getPosts() {
    return (await getIndex()).posts;
  }
  async function getPost(slug) {
    if (!SLUG.test(slug ?? "")) return null;
    let index;
    try {
      index = await getIndex();
    } catch (error) {
      // An archive/feed outage is not evidence that a known URL was deleted.
      // The article endpoint can independently establish its public status.
      if (error.cause instanceof SourceError) throw error;
      index = { posts: [], authoritative: false };
    }
    const { posts, authoritative } = index;
    if (authoritative && !posts.some((post) => post.slug === slug)) {
      // Never allocate cache records for arbitrary never-seen URLs.
      if (await read(`post:${slug}`)) await forget(`post:${slug}`);
      return null;
    }
    try {
      return await cachedValue(`post:${slug}`, async () => {
        const wasRevoked = (await read(`post:${slug}`))?.tombstone;
        let full;
        try {
          full = await json(`/api/v1/posts/${encodeURIComponent(slug)}`);
        } catch (error) {
          if (
            wasRevoked ||
            (error instanceof SourceError &&
              error.status < 500 &&
              error.status !== 429)
          )
            throw error;
          // Feed bodies can be previews. Render only the actual public bytes
          // present; never infer a full or paid post from RSS metadata.
          const fallback = (await feed()).find((entry) => entry.slug === slug);
          if (!fallback?.body) throw error;
          return fallback;
        }
        if (!full || full.slug !== slug || !published(full)) {
          await forget(`post:${slug}`);
          throw new SourceError(
            "This post is no longer publicly available.",
            404,
          );
        }
        const entry = metadata(full);
        if (typeof full.body_html !== "string")
          throw new ContentUnavailable("Substack post body changed shape.");
        const allowed = new Set(posts.map((post) => post.slug));
        const body = sanitizeSubstackHtml(full.body_html, {
          rewriteHref: (href) => {
            try {
              const url = new URL(href, base);
              const target = url.pathname.match(/^\/p\/([\w-]+)\/?$/)?.[1];
              return url.origin === base && allowed.has(target)
                ? `/writing/${target}${url.hash}`
                : href;
            } catch {
              return href;
            }
          },
        });
        return {
          ...entry,
          data: {
            ...entry.data,
            description: entry.data.description || body.text.slice(0, 200),
          },
          body: body.html,
        };
      });
    } catch (error) {
      if (
        error instanceof SourceError &&
        [401, 403, 404, 410].includes(error.status)
      )
        return null;
      throw new ContentUnavailable("This post is temporarily unavailable.");
    }
  }
  return { getPosts, getPost };
}

/** RSS fallback exposes exactly the public content: it does not establish an
 * uncapped archive, free audience status, or completeness of a post body. */
export function parseFeed(xml, origin) {
  if (!/<rss\b/.test(xml) || !/<channel\b/.test(xml))
    throw new ContentUnavailable("Substack feed changed shape.");
  const decode = (s) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, "&");
  const field = (item, name) => {
    const value = item.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`),
    )?.[1];
    return value === undefined
      ? ""
      : (value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)?.[1] ??
          decode(value));
  };
  const entries = [];
  for (const [, item] of xml.matchAll(
    /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g,
  )) {
    let url;
    try {
      url = new URL(field(item, "link"));
    } catch {
      continue;
    }
    const slug = url.pathname.match(/^\/p\/([\w-]+)\/?$/)?.[1];
    const date = new Date(field(item, "pubDate"));
    const title = field(item, "title");
    if (
      url.origin !== origin ||
      !SLUG.test(slug ?? "") ||
      !title ||
      !Number.isFinite(date.getTime())
    )
      continue;
    const body = sanitizeSubstackHtml(field(item, "content:encoded"));
    entries.push({
      id: slug,
      slug,
      data: {
        title,
        date: date.toISOString(),
        canonical: `${origin}/p/${slug}`,
        description: sanitizeSubstackHtml(
          field(item, "description"),
        ).text.slice(0, 200),
      },
      body: body.html,
    });
  }
  return entries.sort((a, b) => b.data.date.localeCompare(a.data.date));
}
