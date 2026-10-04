import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { parseFragment } from "parse5";
import { expectedParts, normalize } from "../../src/prism/parity.ts";

function assertNativeParity(html, expected) {
  const parts = new Map();
  const text = (node) =>
    node.nodeName === "#text"
      ? node.value
      : (node.childNodes ?? []).map(text).join(" ");
  const walk = (node) => {
    const attr = (name) =>
      node.attrs?.find((item) => item.name === name)?.value;
    const part = attr("data-part");
    if (part) {
      const key = `${part}:${attr("data-ref") ?? ""}`;
      parts.set(key, `${parts.get(key) ?? ""} ${text(node)}`);
    }
    (node.childNodes ?? []).forEach(walk);
  };
  walk(parseFragment(html));
  for (const item of expected) {
    const actual = normalize(parts.get(`${item.part}:${item.ref ?? ""}`) ?? "");
    for (const value of item.texts)
      assert.ok(
        actual.includes(normalize(value)),
        `${item.part}[${item.ref}]: missing ${value}`,
      );
  }
}

// Exercise the exact built Vercel function, not only a source-code fixture.
// Substack requests are deterministic public-content fixtures; no credentials
// or live network are needed for the release build gate.
test("built writing routes render natively and update without rebuilding", async () => {
  const actualFetch = globalThis.fetch;
  const actualNow = Date.now;
  let clock = actualNow();
  let outage = false;
  const make = (slug, extra = {}) => ({
    slug,
    title: `Title ${slug}`,
    audience: "everyone",
    is_published: true,
    post_date: "2025-01-01T00:00:00Z",
    description: "Fixture description",
    body_html:
      '<p>Full native body <strong>with formatting</strong>.</p><h1>Body heading</h1><script>bad()</script><img src="https://substackcdn.com/image.png" onerror="bad()"><pre><code>const value = 1;</code></pre>',
    ...extra,
  });
  let posts = [make("hello"), make("other")];
  const upstream = [];
  Date.now = () => clock;
  globalThis.fetch = async (input, options) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (url.origin !== "https://buroojs.substack.com")
      return actualFetch(input, options);
    upstream.push(url.pathname);
    if (outage) return new Response("", { status: 500 });
    if (url.pathname === "/api/v1/archive") return Response.json(posts);
    if (url.pathname === "/feed")
      return new Response("<rss><channel></channel></rss>");
    const post = posts.find(
      (entry) => url.pathname === `/api/v1/posts/${entry.slug}`,
    );
    return post ? Response.json(post) : new Response("", { status: 404 });
  };
  const handlerPath = resolve(
    ".vercel/output/functions/_render.func/dist/server/entry.mjs",
  );
  const { default: handler } = await import(pathToFileURL(handlerPath));
  const server = createServer((req, res) => {
    req.headers["x-forwarded-proto"] = "https";
    req.headers["x-forwarded-host"] = "burooj.dev";
    Promise.resolve(handler(req, res)).catch((error) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const root = `http://127.0.0.1:${server.address().port}`;
  try {
    const initial = await Promise.all([
      actualFetch(`${root}/writing`),
      actualFetch(`${root}/writing`),
    ]);
    let response = initial[0];
    await initial[1].text();
    assert.equal(response.status, 200);
    let html = await response.text();
    assert.match(html, /href="\/writing\/hello"/);
    assert.match(html, /href="\/writing\/other"/);
    assert.match(
      html,
      /aria-current="page"[^>]*href="\/writing"|href="\/writing"[^>]*aria-current="page"/,
    );
    assert.equal(
      response.headers.get("vercel-cdn-cache-control"),
      "public, max-age=60",
    );
    assert.equal(upstream.length, 1, "index does not fetch every body");
    let api = await (await actualFetch(`${root}/prism/content.json`)).json();
    const ownProjects = api.projects.length;
    assert.ok(ownProjects > 0);
    assert.equal(api.writing.entry, undefined);
    assert.equal(api.writing.posts.length, 2);
    assert.equal(
      upstream.length,
      1,
      "shared content index is also metadata-only",
    );
    assertNativeParity(
      html,
      expectedParts({ kind: "writing", path: "/writing" }, api),
    );
    response = await actualFetch(`${root}/writing/hello`);
    assert.equal(response.status, 200);
    html = await response.text();
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/buroojs\.substack\.com\/p\/hello"/,
    );
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, /<h2>Body heading<\/h2>/);
    assert.match(html, /<strong>with formatting<\/strong>/);
    assert.match(html, /const value = 1;/);
    assert.match(html, /Originally published on Substack/);
    assert.match(html, /site-header/);
    assert.match(html, /site-footer/);
    const body = html.match(
      /<article[^>]*post-body[^>]*>([\s\S]*?)<\/article>/,
    )?.[1];
    assert.ok(body);
    assert.doesNotMatch(body, /<script|onerror|bad\(\)/);
    assert.equal(upstream.length, 2);
    api = await (
      await actualFetch(`${root}/prism/content.json?writing=hello`)
    ).json();
    assert.equal(api.writing.entry.slug, "hello");
    assert.equal(api.writing.entryStatus, "available");
    assertNativeParity(
      html,
      expectedParts(
        { kind: "writing-entry", path: "/writing/hello", slug: "hello" },
        api,
      ),
    );
    assert.doesNotMatch(api.writing.entry.html, /<script|onerror|bad\(\)/);
    response = await actualFetch(`${root}/writing/sitemap.xml`);
    assert.equal(response.status, 200);
    assert.match(
      await response.text(),
      /<loc>https:\/\/burooj\.dev\/writing\/hello\/<\/loc>/,
    );
    assert.equal(existsSync("dist/client/writing/hello/index.html"), false);
    assert.equal(existsSync("dist/client/writing/index.html"), false);

    // The artifact is unchanged, but source content and routes become fresh.
    clock += 300_001;
    posts = [
      make("hello", {
        title: "Edited title",
        body_html: "<p>Edited body.</p>",
      }),
      make("brand-new", { post_date: "2026-01-01T00:00:00Z" }),
    ];
    response = await actualFetch(`${root}/writing/hello`);
    assert.equal(response.status, 200);
    html = await response.text();
    assert.match(html, /Edited title/);
    assert.match(html, /Edited body/);
    api = await (
      await actualFetch(`${root}/prism/content.json?writing=hello`)
    ).json();
    assert.equal(api.writing.entry.title, "Edited title");
    assert.match(api.writing.entry.html, /Edited body/);
    assert.ok(api.writing.posts.some((entry) => entry.slug === "brand-new"));
    assert.equal(api.projects.length, ownProjects);
    response = await actualFetch(`${root}/writing/brand-new`);
    assert.equal(
      response.status,
      200,
      "new slug needs no getStaticPaths/build",
    );
    response = await actualFetch(`${root}/writing/sitemap.xml`);
    assert.match(await response.text(), /\/writing\/brand-new\//);

    clock += 300_001;
    posts = [make("hello", { audience: "only_paid" })];
    response = await actualFetch(`${root}/writing/hello`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(await response.text(), /Edited body|Full native body/);
    response = await actualFetch(`${root}/writing/brand-new`);
    assert.equal(response.status, 404);
    api = await (
      await actualFetch(`${root}/prism/content.json?writing=hello`)
    ).json();
    assert.equal(api.writing.entryStatus, "missing");
    assert.equal(api.writing.entry, undefined);
    assert.equal(api.writing.posts.length, 0);

    clock += 3_600_001;
    outage = true;
    response = await actualFetch(`${root}/writing`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "60");
    assert.match(await response.text(), /temporarily unavailable/);
    response = await actualFetch(`${root}/writing/hello`);
    assert.equal(response.status, 503);
    response = await actualFetch(`${root}/writing/sitemap.xml`);
    assert.equal(response.status, 503);
    response = await actualFetch(`${root}/prism/content.json?writing=hello`);
    assert.equal(
      response.status,
      200,
      "other portfolio data survives writing outage",
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
    api = await response.json();
    assert.equal(api.writing.status, "unavailable");
    assert.equal(api.writing.entryStatus, "unavailable");
    assert.equal(api.writing.entry, undefined);
    assert.equal(api.projects.length, ownProjects);
  } finally {
    globalThis.fetch = actualFetch;
    Date.now = actualNow;
    await new Promise((done) => server.close(done));
  }
});
