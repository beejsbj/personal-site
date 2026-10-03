#!/usr/bin/env node
// Sync Burooj's Substack posts into src/content/writing/<slug>.md.
//
//   corepack pnpm@10.6.5 sync:writing            write new and changed posts
//   corepack pnpm@10.6.5 sync:writing -- --dry-run   show what would change
//   corepack pnpm@10.6.5 sync:writing -- --prune     also delete posts Substack no longer lists
//
// Run by hand, or by .github/workflows/sync-writing.yml, which commits the
// result. It is never part of the build: builds stay deterministic and work
// offline. Re-running is safe: output is a pure function of the Substack
// content, unchanged posts are not rewritten.
//
// Exits 1 when Substack yields zero publishable posts (an outage or a changed
// API, not a real empty blog), before anything is written.
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeSubstackHtml } from "./lib/substack-html.mjs";

const ORIGIN = process.env.SUBSTACK_URL ?? "https://buroojs.substack.com";
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/content/writing",
);
const PAGE = 50;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const prune = args.has("--prune");

const log = (...parts) => console.log(...parts);

async function getText(path, { attempts = 4 } = {}) {
  const url = new URL(path, ORIGIN);
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": "burooj.dev writing sync (+https://burooj.dev)",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return await res.text();
      // 4xx other than rate-limiting will not get better by waiting.
      if (res.status !== 429 && res.status < 500) {
        throw Object.assign(new Error(`${res.status} ${url}`), { fatal: true });
      }
      throw new Error(`${res.status} ${url}`);
    } catch (error) {
      if (error.fatal || attempt >= attempts) throw error;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}
const getJson = async (path) => JSON.parse(await getText(path));

// --- sources ------------------------------------------------------------------

// Substack's public archive API: every published post, newest first, paged.
async function fetchArchive() {
  const posts = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await getJson(
      `/api/v1/archive?sort=new&offset=${offset}&limit=${PAGE}`,
    );
    posts.push(...page);
    if (page.length < PAGE) return posts;
  }
}

// The RSS feed: recent posts with full bodies. A cross-check on the archive,
// and a fallback for a body the JSON API will not serve.
function parseFeed(xml) {
  const field = (item, name) => {
    const match = item.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`),
    );
    if (!match) return undefined;
    const cdata = match[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    return cdata ? cdata[1] : decodeXml(match[1]);
  };
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const link = field(item, "link") ?? "";
    return {
      slug: link.match(/\/p\/([^/?#]+)/)?.[1],
      title: field(item, "title"),
      description: field(item, "description"),
      canonical_url: link,
      post_date: new Date(field(item, "pubDate") ?? NaN).toISOString(),
      cover_image: item.match(/<enclosure\s+url="([^"]+)"/)?.[1],
      body_html: field(item, "content:encoded"),
      audience: "everyone",
      type: "newsletter",
    };
  });
}
const decodeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

// --- output -------------------------------------------------------------------

const yaml = (value) => JSON.stringify(value); // JSON is valid YAML, and safe.

function describe(post, text) {
  const clean = (post.description || post.subtitle || text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= 200) return clean;
  return `${clean.slice(0, 199).replace(/\s+\S*$/, "")}…`;
}

function render(post, body) {
  const front = [
    ["title", post.title],
    ["subtitle", post.subtitle?.trim() || undefined],
    ["date", post.post_date],
    ["slug", post.slug],
    ["canonical", post.canonical_url],
    ["cover", post.cover_image || undefined],
    ["description", describe(post, body.text)],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${yaml(value)}`);
  return `---\n${front.join("\n")}\n---\n\n${body.html}\n`;
}

async function existing() {
  try {
    return (await readdir(OUT_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

// --- run ----------------------------------------------------------------------

const [archive, feedXml] = await Promise.all([
  fetchArchive(),
  getText("/feed").catch((error) => {
    log(`warning: RSS feed unavailable (${error.message}); using archive only`);
    return "";
  }),
]);
const feed = feedXml ? parseFeed(feedXml) : [];

const skipped = [];
const bySlug = new Map();
for (const post of archive) {
  if (post.audience !== "everyone" || post.is_published === false) {
    skipped.push(`${post.slug} (${post.audience})`);
    continue;
  }
  bySlug.set(post.slug, { ...post, source: "archive" });
}
// Anything the feed has that the archive missed.
for (const post of feed) {
  if (post.slug && !bySlug.has(post.slug)) {
    bySlug.set(post.slug, { ...post, source: "feed" });
  }
}
const feedBySlug = new Map(feed.map((post) => [post.slug, post]));

// Fetch bodies, a few at a time.
const posts = [...bySlug.values()];
const queue = [...posts];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const post = queue.shift();
      if (post.source === "feed" && post.body_html) continue;
      try {
        const full = await getJson(`/api/v1/posts/${post.slug}`);
        Object.assign(post, full, { source: post.source });
        if (full.audience !== "everyone")
          post.skip = `audience ${full.audience}`;
      } catch (error) {
        const fallback = feedBySlug.get(post.slug);
        if (!fallback?.body_html) throw error;
        log(
          `warning: ${post.slug}: JSON API failed (${error.message}); using RSS body`,
        );
        post.body_html = fallback.body_html;
        post.source = "feed";
      }
    }
  }),
);

const live = posts.filter((post) => {
  if (!post.skip) return true;
  skipped.push(`${post.slug} (${post.skip})`);
  return false;
});
if (live.length === 0) {
  console.error(
    `error: ${ORIGIN} returned zero publishable posts ` +
      `(archive API: ${archive.length}, RSS feed: ${feed.length}); ` +
      "refusing to continue",
  );
  process.exit(1);
}
const slugs = new Set(live.map((post) => post.slug));
// Posts that link to each other should stay on this site.
const rewriteHref = (href) => {
  const match = href.match(
    /^https?:\/\/buroojs\.substack\.com\/p\/([^/?#]+)\/?(#.*)?$/,
  );
  return match && slugs.has(match[1])
    ? `/writing/${match[1]}${match[2] ?? ""}`
    : href;
};

const counts = { added: [], updated: [], unchanged: [] };
const before = new Set(await existing());
const totals = { images: 0, code: 0, empty: [] };
if (!dryRun) await mkdir(OUT_DIR, { recursive: true });

for (const post of live) {
  const body = sanitizeSubstackHtml(post.body_html, { rewriteHref });
  if (!body.html) {
    totals.empty.push(post.slug);
    continue;
  }
  totals.images += body.stats.images;
  totals.code += body.stats.code;
  const file = `${post.slug}.md`;
  const next = render(post, body);
  const current = before.has(file)
    ? await readFile(join(OUT_DIR, file), "utf8")
    : undefined;
  if (current === next) counts.unchanged.push(post.slug);
  else {
    (current === undefined ? counts.added : counts.updated).push(post.slug);
    if (!dryRun) await writeFile(join(OUT_DIR, file), next);
  }
}

const orphans = [...before].filter((f) => !slugs.has(f.replace(/\.md$/, "")));
for (const file of orphans) {
  if (prune && !dryRun) await unlink(join(OUT_DIR, file));
}

log(
  `${dryRun ? "[dry run] " : ""}${live.length} posts from ${ORIGIN} ` +
    `(archive API: ${archive.length}, RSS feed: ${feed.length}, ` +
    `from feed only: ${live.filter((p) => p.source === "feed").length})`,
);
log(
  `  added ${counts.added.length}, updated ${counts.updated.length}, ` +
    `unchanged ${counts.unchanged.length}`,
);
for (const slug of counts.added) log(`  + ${slug}`);
for (const slug of counts.updated) log(`  ~ ${slug}`);
log(`  ${totals.images} images (hotlinked), ${totals.code} code blocks`);
if (skipped.length) log(`  skipped (not free): ${skipped.join(", ")}`);
if (totals.empty.length) {
  log(`  skipped (empty after sanitising): ${totals.empty.join(", ")}`);
}
if (orphans.length) {
  log(
    `  ${prune ? "pruned" : "no longer on Substack (re-run with --prune to delete)"}: ` +
      orphans.join(", "),
  );
}
