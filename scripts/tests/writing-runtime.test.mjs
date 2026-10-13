import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { parseFragment } from "parse5";
import { expectedParts, normalize } from "../../src/prism/parity.ts";
import { fixturePost, serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

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
// Substack requests are deterministic public-content fixtures; no credentials,
// live network or shared Vercel Runtime Cache are used by the release build gate.
test("built writing routes render natively and update without rebuilding", async () => {
  const make = (slug, extra = {}) =>
    fixturePost(slug, {
      subtitle: undefined,
      description: "Fixture description",
      body_html:
        '<p>Full native body <strong>with formatting</strong>.</p><h1>Body heading</h1><script>bad()</script><img src="https://substackcdn.com/image.png" onerror="bad()"><pre><code>const value = 1;</code></pre>',
      ...extra,
    });
  const fixture = await serveRuntimeFixture({
    posts: [make("hello"), make("other")],
  });
  const upstream = fixture.requests;
  const get = (path) => fixture.fetch(path);
  try {
    const initial = await Promise.all([get("/writing"), get("/writing")]);
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
    let api = await (await get("/prism/content.json")).json();
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
    response = await get("/writing/hello");
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
    api = await (await get("/prism/content.json?writing=hello")).json();
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
    response = await get("/writing/sitemap.xml");
    assert.equal(response.status, 200);
    assert.match(
      await response.text(),
      /<loc>https:\/\/burooj\.dev\/writing\/hello\/<\/loc>/,
    );
    assert.equal(existsSync("dist/client/writing/hello/index.html"), false);
    assert.equal(existsSync("dist/client/writing/index.html"), false);

    // The artifact is unchanged, but source content and routes become fresh.
    fixture.advance(300_001);
    fixture.state.posts = [
      make("hello", {
        title: "Edited title",
        body_html: "<p>Edited body.</p>",
      }),
      make("brand-new", { post_date: "2026-01-01T00:00:00Z" }),
    ];
    response = await get("/writing/hello");
    assert.equal(response.status, 200);
    html = await response.text();
    assert.match(html, /Edited title/);
    assert.match(html, /Edited body/);
    api = await (await get("/prism/content.json?writing=hello")).json();
    assert.equal(api.writing.entry.title, "Edited title");
    assert.match(api.writing.entry.html, /Edited body/);
    assert.ok(api.writing.posts.some((entry) => entry.slug === "brand-new"));
    assert.equal(api.projects.length, ownProjects);
    response = await get("/writing/brand-new");
    assert.equal(
      response.status,
      200,
      "new slug needs no getStaticPaths/build",
    );
    response = await get("/writing/sitemap.xml");
    assert.match(await response.text(), /\/writing\/brand-new\//);

    fixture.advance(300_001);
    fixture.state.posts = [make("hello", { audience: "only_paid" })];
    response = await get("/writing/hello");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(await response.text(), /Edited body|Full native body/);
    response = await get("/writing/brand-new");
    assert.equal(response.status, 404);
    api = await (await get("/prism/content.json?writing=hello")).json();
    assert.equal(api.writing.entryStatus, "missing");
    assert.equal(api.writing.entry, undefined);
    assert.equal(api.writing.posts.length, 0);

    fixture.advance(3_600_001);
    fixture.state.outage = true;
    response = await get("/writing");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "60");
    assert.match(await response.text(), /temporarily unavailable/);
    response = await get("/writing/hello");
    assert.equal(response.status, 503);
    response = await get("/writing/sitemap.xml");
    assert.equal(response.status, 503);
    response = await get("/prism/content.json?writing=hello");
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
    assert.deepEqual(
      fixture.foreign,
      [],
      "the built handler reaches only the fixture upstream, never a shared cache",
    );
  } finally {
    await fixture.close();
  }
});
