import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import {
  createSubstackSource,
  ContentUnavailable,
  parseFeed,
} from "../../src/lib/content/substack.mjs";
import { sanitizeSubstackHtml } from "../../src/lib/content/substack-html.mjs";

const origin = "https://buroojs.substack.com";
const post = (slug = "hello", extra = {}) => ({
  slug,
  title: `Title ${slug}`,
  post_date: "2025-01-01T00:00:00.000Z",
  canonical_url: `${origin}/p/${slug}`,
  audience: "everyone",
  is_published: true,
  body_html: "<p>Hello world.</p>",
  ...extra,
});
const rss = (slug = "hello", body = "<p>Public feed content.</p>") =>
  `<rss><channel><item><title><![CDATA[Title ${slug}]]></title><link>${origin}/p/${slug}</link><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate><content:encoded><![CDATA[${body}]]></content:encoded></item></channel></rss>`;
function fixture({ shared = new Map(), cacheFailure = false } = {}) {
  let time = 0;
  const requests = [];
  let routes = (url) =>
    url.pathname === "/api/v1/archive"
      ? [post()]
      : url.pathname === "/feed"
        ? rss()
        : post();
  const cache = {
    async get(key) {
      if (cacheFailure) throw new Error("cache offline");
      return shared.get(key);
    },
    async set(key, value) {
      if (cacheFailure) throw new Error("cache offline");
      shared.set(key, structuredClone(value));
    },
    async delete(key) {
      if (cacheFailure) throw new Error("cache offline");
      shared.delete(key);
    },
  };
  const config = {
    origin,
    cache,
    now: () => time,
    fetcher: async (url) => {
      requests.push(url.href);
      const result = await routes(url);
      if (result instanceof Error) throw result;
      if (typeof result === "number")
        return new Response("", { status: result });
      return new Response(
        typeof result === "string" ? result : JSON.stringify(result),
      );
    },
  };
  return {
    source: createSubstackSource(config),
    fresh: () => createSubstackSource(config),
    requests,
    shared,
    cache,
    advance: (ms) => {
      time += ms;
    },
    routes: (next) => {
      routes = next;
    },
  };
}

test("writing uses runtime routes and no article-commit machinery", () => {
  assert.equal(existsSync(".github/workflows/sync-writing.yml"), false);
  assert.equal(existsSync("scripts/sync-substack.mjs"), false);
  assert.equal(existsSync("src/content/writing"), false);
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(packageJson.scripts["sync:writing"], undefined);
  assert.ok(
    packageJson.dependencies.parse5,
    "sanitiser must ship in the runtime",
  );
  for (const file of [
    "src/pages/writing/index.astro",
    "src/pages/writing/[slug].astro",
    "src/pages/writing/sitemap.xml.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /export const prerender = false/);
    assert.doesNotMatch(source, /getStaticPaths/);
  }
  assert.match(
    readFileSync("dist/client/sitemap-index.xml", "utf8"),
    /https:\/\/burooj\.dev\/writing\/sitemap\.xml/,
  );
});

test("archive is paginated, deduplicated, newest first, and public-only", async () => {
  const f = fixture();
  const first = Array.from({ length: 50 }, (_, i) => post(`post-${i}`));
  f.routes((url) =>
    url.searchParams.get("offset") === "0"
      ? first
      : [
          post("new", {
            post_date: "2026-01-01",
            description: "<b>Description</b>",
          }),
          post("post-0"),
          post("paid", { audience: "only_paid" }),
          post("draft", { is_published: false }),
        ],
  );
  const posts = await f.source.getPosts();
  assert.equal(posts.length, 51);
  assert.equal(posts[0].slug, "new");
  assert.equal(posts[0].data.description, "Description");
  assert.equal(f.requests.length, 2);
  assert.match(f.requests[1], /offset=50/);
});

test("repeated full archive pages terminate instead of exhausting function time", async () => {
  const f = fixture();
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? Array.from({ length: 50 }, (_, i) => post(`post-${i}`))
      : 500,
  );
  await assert.rejects(f.source.getPosts(), ContentUnavailable);
  assert.equal(f.requests.length, 3);
});

test("body is fetched lazily and sanitised into the shared entry contract", async () => {
  const f = fixture();
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? [post(), post("other")]
      : post("hello", {
          body_html: `<h1>Heading</h1><p>Hello <a href="${origin}/p/other?utm_source=sub#part">other</a><a href="${origin}/p/absent">absent</a></p><script>alert(1)</script><img src="https://substackcdn.com/p.png" onerror="bad()">`,
        }),
  );
  const posts = await f.source.getPosts();
  assert.equal(f.requests.length, 1);
  assert.equal(posts[0].body, undefined);
  const full = await f.source.getPost("hello");
  assert.equal(f.requests.length, 2);
  assert.equal(full.id, "hello");
  assert.equal(full.data.canonical, `${origin}/p/hello`);
  assert.match(full.body, /<h2>Heading<\/h2>/);
  assert.match(full.body, /href="\/writing\/other#part"/);
  assert.match(full.body, /href="https:\/\/buroojs\.substack\.com\/p\/absent"/);
  assert.doesNotMatch(full.body, /script|onerror|utm_source/);
});

test("warm and cross-instance caches deduplicate requests and revalidate edits", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([
    f.source.getPost("hello"),
    f.source.getPost("hello"),
  ]);
  assert.deepEqual(a, b);
  assert.equal(f.requests.length, 2);
  assert.deepEqual(await f.fresh().getPost("hello"), a);
  assert.equal(f.requests.length, 2);
  f.advance(300_001);
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? [post(), post("new")]
      : post("hello", { title: "Edited", body_html: "<p>Updated.</p>" }),
  );
  assert.equal((await f.source.getPost("hello")).data.title, "Edited");
  assert.match((await f.source.getPost("hello")).body, /Updated/);
  assert.ok((await f.source.getPosts()).some((p) => p.slug === "new"));
  assert.equal(f.requests.length, 4);
});

test("last-known-good content survives a transient outage but expires from its original timestamp", async () => {
  const f = fixture();
  const initial = await f.source.getPost("hello");
  f.advance(300_001);
  f.routes(() => 500);
  assert.deepEqual(await f.fresh().getPost("hello"), initial);
  f.advance(3_300_000);
  await assert.rejects(f.source.getPosts(), ContentUnavailable);
  await assert.rejects(f.source.getPost("hello"), ContentUnavailable);
});

test("known paid, unpublished, deleted and missing posts do not reveal old bodies", async () => {
  for (const result of [
    post("hello", { audience: "only_paid" }),
    post("hello", { is_published: false }),
    404,
    410,
    401,
    403,
  ]) {
    const f = fixture();
    await f.source.getPost("hello");
    f.advance(300_001);
    f.routes((url) =>
      url.pathname === "/api/v1/archive"
        ? [post()]
        : url.pathname === "/feed"
          ? rss()
          : result,
    );
    assert.equal(await f.source.getPost("hello"), null);
    f.routes(() => 500);
    assert.equal(
      await f
        .fresh()
        .getPost("hello")
        .catch(() => null),
      null,
    );
  }
  const f = fixture();
  await f.source.getPost("hello");
  f.advance(300_001);
  f.routes(() => []);
  assert.equal(await f.source.getPost("hello"), null);
  assert.equal(await f.source.getPost("unknown"), null);
});

test("failed shared-cache invalidation cannot resurrect a revoked warm body", async () => {
  const f = fixture();
  await f.source.getPost("hello");
  f.advance(300_001);
  const oldSet = f.cache.set;
  f.cache.set = async (key, value, options) => {
    if (value.tombstone) throw new Error("set failed");
    return oldSet(key, value, options);
  };
  f.cache.delete = async () => {
    throw new Error("delete failed");
  };
  f.routes((url) => (url.pathname === "/api/v1/archive" ? [post()] : 404));
  assert.equal(await f.source.getPost("hello"), null);
  f.routes((url) => (url.pathname === "/api/v1/archive" ? [post()] : 500));
  await assert.rejects(f.source.getPost("hello"), ContentUnavailable);
});

test("cache infrastructure failures still permit uncached source and warm fallback", async () => {
  const f = fixture({ cacheFailure: true });
  const initial = await f.source.getPost("hello");
  f.advance(300_001);
  f.routes(() => 500);
  assert.deepEqual(await f.source.getPost("hello"), initial);
});

test("cold outages are explicit and malformed archive does not poison known-good data", async () => {
  const f = fixture();
  f.routes(() => 500);
  await assert.rejects(f.source.getPosts(), ContentUnavailable);
  f.routes((url) => (url.pathname === "/api/v1/archive" ? [post()] : post()));
  await f.source.getPost("hello");
  f.advance(300_001);
  f.routes((url) =>
    url.pathname === "/api/v1/archive" ? { surprise: "not an array" } : 500,
  );
  assert.equal((await f.source.getPosts()).length, 1);
});

test("RSS is a recent-public-content fallback and never bypasses an API denial", async () => {
  const f = fixture();
  f.routes((url) => (url.pathname === "/feed" ? rss() : 500));
  assert.equal((await f.source.getPosts()).length, 1);
  assert.match((await f.source.getPost("hello")).body, /Public feed content/);
  const denied = fixture();
  denied.routes((url) => (url.pathname === "/feed" ? rss() : 403));
  await assert.rejects(denied.source.getPosts(), ContentUnavailable);
  assert.equal(denied.requests.length, 1);
});

test("unsafe slugs never trigger upstream requests and canonical source stays fixed", async () => {
  const f = fixture();
  for (const slug of ["../secrets", "x?admin=1", "x/#bad", "", "x".repeat(201)])
    assert.equal(await f.source.getPost(slug), null);
  assert.equal(f.requests.length, 0);
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? [post()]
      : post("hello", { canonical_url: "https://evil.example/p/hello" }),
  );
  assert.equal(
    (await f.source.getPost("hello")).data.canonical,
    `${origin}/p/hello`,
  );
});

test("RSS ignores off-origin and malformed entries and sanitises public bytes", () => {
  assert.equal(
    parseFeed(rss().replaceAll(origin, "https://evil.example"), origin).length,
    0,
  );
  assert.throws(
    () => parseFeed("<html>blocked</html>", origin),
    ContentUnavailable,
  );
  assert.doesNotMatch(
    parseFeed(rss("hello", "<p>Hello</p><script>bad</script>"), origin)[0].body,
    /script|bad/,
  );
});

test("/blog still lands on /writing", () => {
  const { redirects } = JSON.parse(readFileSync("vercel.json", "utf8"));
  const blog = redirects.filter(
    (r) =>
      r.source === "/blog" ||
      r.has?.some((h) => h.key === "page" && h.value === "blog"),
  );
  assert.equal(blog.length, 2);
  for (const redirect of blog) assert.equal(redirect.destination, "/writing");
});

test("the sanitiser strips Substack chrome and keeps the writing", () => {
  const hostile = `
    <p>Hello <strong>world</strong> and <a href="javascript:alert(1)">a bad link</a>
      <a href="https://example.com/x?utm_source=sub&amp;keep=1">a good one</a></p>
    <script>alert(1)</script>
    <iframe src="https://evil.example/frame"></iframe>
    <iframe src="https://www.youtube.com/embed/abc123"></iframe>
    <div class="subscription-widget-wrap-editor"><form><input type="email"><button>Subscribe</button></form></div>
    <div class="captioned-image-container"><figure>
      <a class="image-link image2" href="https://substackcdn.com/full.png"><div class="image2-inset"><picture>
        <source srcset="https://substackcdn.com/a.webp 424w">
        <img src="https://substackcdn.com/a.png" srcset="https://substackcdn.com/a.png 424w" width="1456" height="814.5" alt="shot" onerror="alert(1)" data-attrs="{}">
      </picture><div class="pencraft"><button class="buttonBase"><svg><path d="M0"/></svg></button></div></div></a>
      <figcaption class="image-caption">caption</figcaption></figure></div>
    <img src="https://tracker.example/p.gif" width="1" height="1">
    <h1>Big</h1><h3>Small</h3>
    <pre><code>a

b</code></pre>
    <p onclick="x()" style="color:red"><br></p>`;
  const { html } = sanitizeSubstackHtml(hostile);
  assert.doesNotMatch(
    html,
    /<(script|iframe|form|input|button|svg|source|picture)\b|onerror|onclick|style=|data-attrs|pencraft|javascript:|tracker\.example|subscription-widget|utm_source/i,
  );
  assert.match(html, /<strong>world<\/strong>/);
  assert.match(
    html,
    /<a href="https:\/\/example\.com\/x\?keep=1">a good one<\/a>/,
  );
  assert.match(html, /a bad link/, "unsafe links are unwrapped, not deleted");
  assert.match(
    html,
    /<a href="https:\/\/www\.youtube\.com\/watch\?v=abc123">Watch on YouTube<\/a>/,
  );
  assert.match(
    html,
    /<figure><img src="https:\/\/substackcdn\.com\/a\.png"[^>]*height="815"[^>]*><figcaption>caption<\/figcaption><\/figure>/,
  );
  assert.match(html, /<h2>Big<\/h2>/, "the page keeps the only h1");
  assert.match(html, /<h4>Small<\/h4>/);
  assert.match(
    html,
    /<pre tabindex="0"><code>a\n\nb<\/code><\/pre>/,
    "top-level code keeps its blank line",
  );
  assert.doesNotMatch(html.replace(/<pre[\s\S]*?<\/pre>/, ""), /\n\s*\n\s*\n/);
});

test("RSS absence does not turn a healthy older article into a false 404", async () => {
  const f = fixture();
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? 500
      : url.pathname === "/feed"
        ? rss("recent")
        : post("older"),
  );
  assert.equal((await f.source.getPost("older")).slug, "older");
  assert.ok(f.requests.some((url) => url.endsWith("/api/v1/posts/older")));
});

test("a stale archive cannot exclude a new healthy article", async () => {
  const f = fixture();
  await f.source.getPosts();
  f.advance(300_001);
  f.routes((url) => (url.pathname === "/api/v1/archive" ? 500 : post("new")));
  assert.equal((await f.source.getPost("new")).slug, "new");
});

test("fresh RSS cannot override a known revoked-post tombstone", async () => {
  const f = fixture();
  await f.source.getPost("hello");
  f.advance(300_001);
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? [post()]
      : url.pathname === "/feed"
        ? rss()
        : 404,
  );
  assert.equal(await f.source.getPost("hello"), null);
  f.routes((url) => (url.pathname === "/feed" ? rss() : 500));
  await assert.rejects(f.source.getPost("hello"), ContentUnavailable);
  f.routes((url) => (url.pathname === "/api/v1/archive" ? [post()] : post()));
  assert.equal(
    (await f.source.getPost("hello")).slug,
    "hello",
    "successful API response can restore public content",
  );
});

test("unknown URLs do not write cache tombstones", async () => {
  const f = fixture();
  await f.source.getPosts();
  for (let i = 0; i < 100; i++)
    assert.equal(await f.source.getPost(`missing-${i}`), null);
  assert.equal(f.shared.size, 1);
});

test("cold instances tombstone shared bodies after observing archive deletion", async () => {
  const f = fixture();
  await f.source.getPost("hello");
  f.advance(300_001);
  f.routes((url) => (url.pathname === "/api/v1/archive" ? [] : 500));
  assert.equal(await f.fresh().getPost("hello"), null);
  f.advance(300_001);
  f.routes(() => 500);
  await assert.rejects(f.fresh().getPost("hello"), ContentUnavailable);
});

test("cache snapshot provenance cannot race a concurrently replaced archive", async () => {
  const f = fixture();
  f.routes((url) =>
    url.pathname === "/api/v1/archive" ? [post("old")] : post("old"),
  );
  await f.source.getPosts();
  f.advance(300_001);
  let archiveReads = 0;
  const oldGet = f.cache.get;
  f.cache.get = async (key) => {
    const previous = await oldGet(key);
    if (key.endsWith(":archive") && ++archiveReads > 1)
      return {
        at: 300_001,
        value: [
          {
            id: "new",
            slug: "new",
            data: { date: "2025-01-01T00:00:00.000Z" },
          },
        ],
      };
    return previous;
  };
  f.routes((url) => (url.pathname === "/api/v1/archive" ? 500 : post("new")));
  assert.equal((await f.source.getPost("new")).slug, "new");
  assert.equal(
    archiveReads,
    1,
    "authoritative provenance uses the exact returned snapshot",
  );
});

test("index failure and empty RSS are not false deletion evidence", async () => {
  const f = fixture();
  f.routes((url) =>
    url.pathname === "/api/v1/archive"
      ? 500
      : url.pathname === "/feed"
        ? "<rss><channel></channel></rss>"
        : post("older"),
  );
  await assert.rejects(f.source.getPosts(), ContentUnavailable);
  assert.equal((await f.source.getPost("older")).slug, "older");
});

test("authored writing page copy lives in the existing page collection", () => {
  const page = readFileSync("src/content/pages/writing.md", "utf8");
  assert.match(page, /title: Notes from building things/);
  for (const file of [
    "src/pages/writing/index.astro",
    "src/pages/writing/[slug].astro",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /getWritingPage/);
    assert.doesNotMatch(
      source,
      /Notes from building things|Liked this one|New posts go out by email/,
    );
  }
});
