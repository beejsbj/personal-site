import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import { promisify } from "node:util";
import { sanitizeSubstackHtml } from "../lib/substack-html.mjs";

// Run after `pnpm build`: these assertions inspect what will actually ship.
const read = (path) => readFileSync(path, "utf8");
const dir = "src/content/writing";
const posts = readdirSync(dir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const source = read(`${dir}/${name}`);
    const [, front, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    // The sync writes each value as JSON, which is also valid YAML.
    const data = Object.fromEntries(
      front.split("\n").map((line) => {
        const at = line.indexOf(": ");
        return [line.slice(0, at), JSON.parse(line.slice(at + 2))];
      }),
    );
    return { file: name, source, body, ...data };
  });
const page = (slug) => read(`dist/client/writing/${slug}/index.html`);
const articleOf = (html) =>
  html.match(
    /<article\b[^>]*class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<\/article>/,
  )?.[1];
const plain = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#38;|&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/\s+/g, " ");

test("posts are synced, and each file is named for its slug", () => {
  assert.ok(posts.length > 0, "No posts under src/content/writing");
  for (const post of posts) {
    assert.equal(post.file, `${post.slug}.md`);
    assert.ok(post.title && post.description && post.date);
    assert.match(post.canonical, /^https:\/\/buroojs\.substack\.com\/p\//);
    assert.ok(post.body.trim().length > 0, `${post.file}: empty body`);
  }
});

test("every post file has a page, canonical to its Substack original", () => {
  for (const post of posts) {
    const html = page(post.slug);
    assert.equal(
      html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
      post.canonical,
      `${post.slug}: canonical`,
    );
    assert.equal(
      (html.match(/<h1\b/g) || []).length,
      1,
      `${post.slug}: one h1`,
    );
    assert.ok(articleOf(html), `${post.slug}: missing post body`);
    assert.match(html, /Originally published on Substack/);
    assert.ok(
      html.includes(`href="${post.canonical}"`),
      `${post.slug}: visible link to the original`,
    );
    assert.match(html, /href="https:\/\/buroojs\.substack\.com\/subscribe"/);
  }
});

test("the index lists every post, newest first, with date and subtitle", () => {
  const html = read("dist/client/writing/index.html");
  const entries = [
    ...html.matchAll(
      /<article\b[^>]*class="[^"]*post-entry__body[^"]*"[^>]*>([\s\S]*?)<\/article>/g,
    ),
  ].map(([, entry]) => entry);
  assert.equal(entries.length, posts.length);
  const dates = entries.map(
    (entry) => entry.match(/<time[^>]*datetime="([^"]+)"/)[1],
  );
  assert.deepEqual(dates, [...dates].sort().reverse());
  for (const post of posts) {
    const entry = entries.find((item) =>
      item.includes(`href="/writing/${post.slug}"`),
    );
    assert.ok(entry, `${post.slug}: not listed`);
    const text = plain(entry);
    assert.ok(text.includes(post.title), `${post.slug}: title`);
    assert.ok(
      text.includes(post.subtitle || post.description),
      `${post.slug}: subtitle`,
    );
  }
  assert.match(
    html,
    /href="https:\/\/buroojs\.substack\.com"/,
    "Substack stays reachable from the index",
  );
});

test("nothing executable or embedded leaks from Substack bodies", () => {
  for (const post of posts) {
    assert.doesNotMatch(
      post.body,
      /<(script|iframe|object|embed|form|button|input|svg|style)\b|\son\w+=|javascript:/i,
      `${post.slug}: source body`,
    );
    const body = articleOf(page(post.slug));
    assert.doesNotMatch(
      body,
      /<(script|iframe)\b/i,
      `${post.slug}: built body`,
    );
    assert.doesNotMatch(body, /subscription-widget|data-attrs|pencraft/);
  }
});

test("Writing is the current section on the index and every post", () => {
  for (const path of [
    "writing/index.html",
    ...posts.map((post) => `writing/${post.slug}/index.html`),
  ]) {
    const html = read(`dist/client/${path}`);
    const nav = html.match(
      /<nav\b[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/,
    )[1];
    const anchors = [...nav.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    assert.equal(anchors.length, 6, `${path}: six links`);
    const marked = anchors.filter((tag) => tag.includes('aria-current="page"'));
    assert.equal(marked.length, 1);
    assert.ok(marked[0].includes('href="/writing"'), `${path}: ${marked[0]}`);
  }
});

test("writing pages are in the sitemap", () => {
  const sitemap = read("dist/client/sitemap-0.xml");
  assert.match(sitemap, /<loc>https:\/\/burooj\.dev\/writing\/<\/loc>/);
  for (const post of posts) {
    assert.ok(
      sitemap.includes(`<loc>https://burooj.dev/writing/${post.slug}/</loc>`),
      `${post.slug}: not in sitemap`,
    );
  }
});

test("/blog now lands on /writing, not Substack", () => {
  const { redirects } = JSON.parse(read("vercel.json"));
  const blog = redirects.filter(
    (redirect) =>
      redirect.source === "/blog" ||
      redirect.has?.some((h) => h.key === "page" && h.value === "blog"),
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

// Run the real sync script against a fixture "Substack", dry-run so the repo's
// own posts are never touched. The scheduled workflow depends on the exit code.
async function runSync(routes) {
  const server = createServer((req, res) => {
    const route = routes[new URL(req.url, "http://x").pathname];
    res.writeHead(route ? 200 : 404, { "content-type": "text/plain" });
    res.end(route?.body ?? "");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = {
    ...process.env,
    SUBSTACK_URL: `http://127.0.0.1:${server.address().port}`,
  };
  try {
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      ["scripts/sync-substack.mjs", "--dry-run"],
      { env },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  } finally {
    server.close();
  }
}

test("the sync exits non-zero, and writes nothing, when Substack has zero posts", async () => {
  const before = readdirSync(dir).join();
  const result = await runSync({
    "/api/v1/archive": { body: "[]" },
    "/feed": { body: "<rss><channel></channel></rss>" },
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /zero publishable posts/);
  assert.equal(readdirSync(dir).join(), before);
});

test("the sync exits non-zero when Substack errors", async () => {
  const result = await runSync({}); // every route 404s
  assert.notEqual(result.code, 0);
});

test("the sync succeeds on a Substack with a post", async () => {
  const post = {
    slug: "hello",
    title: "Hello",
    post_date: "2025-01-01T00:00:00.000Z",
    canonical_url: "https://buroojs.substack.com/p/hello",
    audience: "everyone",
    is_published: true,
  };
  const result = await runSync({
    "/api/v1/archive": { body: JSON.stringify([post]) },
    "/feed": { body: "<rss><channel></channel></rss>" },
    "/api/v1/posts/hello": {
      body: JSON.stringify({ ...post, body_html: "<p>Hi there.</p>" }),
    },
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /\[dry run\] 1 posts/);
  assert.match(result.stdout, /\+ hello/);
});
