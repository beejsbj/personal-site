import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const fixturePost = (slug = "fixture-writing", extra = {}) => ({
  slug,
  title: `Title ${slug}`,
  subtitle: "A public writing fixture",
  audience: "everyone",
  is_published: true,
  post_date: "2025-01-01T00:00:00Z",
  description: "A source-backed article for deterministic verification.",
  body_html:
    '<p>Full native body <strong>with formatting</strong>.</p><h2>Body heading</h2><img src="/images/burooj6.jpg" alt="A local image fixture"><pre><code>const value = 1;</code></pre>',
  ...extra,
});
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

// Vercel's build container sets VERCEL=1 and exposes the project's real Runtime
// Cache (RUNTIME_CACHE_ENDPOINT), which @vercel/functions' getCache() uses during
// builds. That cache is shared by every concurrent test process, by later builds
// and, in the same region, by the deployed functions. A fixture must never read
// another process's fixture archive or publish its fake (and clock-shifted)
// posts there, so each process gets getCache()'s private in-memory store.
const RUNTIME_CACHE_ENV = [
  "RUNTIME_CACHE_DISABLE_BUILD_CACHE",
  "RUNTIME_CACHE_ENDPOINT",
  "RUNTIME_CACHE_HEADERS",
];
function isolateRuntimeCache() {
  const saved = RUNTIME_CACHE_ENV.map((name) => [name, process.env[name]]);
  process.env.RUNTIME_CACHE_DISABLE_BUILD_CACHE = "true";
  delete process.env.RUNTIME_CACHE_ENDPOINT;
  delete process.env.RUNTIME_CACHE_HEADERS;
  return () => {
    for (const [name, value] of saved)
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  };
}

/** Real emitted Vercel handler and static assets, with a deterministic public
 * upstream. No source credentials, deployment, shared cache or external
 * content is used: any other outbound request is recorded in `foreign`. */
export async function serveRuntimeFixture({
  port = 0,
  posts = [
    fixturePost(),
    fixturePost("second-post", { post_date: "2026-01-01T00:00:00Z" }),
  ],
} = {}) {
  const actualFetch = globalThis.fetch;
  const actualNow = Date.now;
  const restoreEnv = isolateRuntimeCache();
  let time = actualNow();
  const state = { posts, outage: false };
  const requests = [];
  const foreign = [];
  let base;
  Date.now = () => time;
  globalThis.fetch = async (input, options) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (url.origin !== "https://buroojs.substack.com") {
      if (url.origin !== base) foreign.push(url.href);
      return actualFetch(input, options);
    }
    requests.push(url.pathname);
    if (state.outage) return new Response("", { status: 500 });
    if (url.pathname === "/api/v1/archive") return Response.json(state.posts);
    if (url.pathname === "/feed")
      return new Response("<rss><channel></channel></rss>");
    const post = state.posts.find(
      (entry) => url.pathname === `/api/v1/posts/${entry.slug}`,
    );
    return post ? Response.json(post) : new Response("", { status: 404 });
  };
  const { default: handler } = await import(
    pathToFileURL(
      resolve(".vercel/output/functions/_render.func/dist/server/entry.mjs"),
    )
  );
  const staticRoot = resolve(".vercel/output/static");
  const file = (path) => {
    try {
      return statSync(path).isFile() ? path : null;
    } catch {
      return null;
    }
  };
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const candidate = resolve(staticRoot, `.${pathname}`);
    if (candidate.startsWith(`${staticRoot}/`) || candidate === staticRoot) {
      const target =
        file(candidate) ??
        file(resolve(candidate, "index.html")) ??
        file(`${candidate}.html`);
      if (target) {
        res.setHeader(
          "Content-Type",
          TYPES[extname(target)] ?? "application/octet-stream",
        );
        return res.end(readFileSync(target));
      }
    }
    req.headers["x-forwarded-proto"] = "https";
    req.headers["x-forwarded-host"] = "burooj.dev";
    Promise.resolve(handler(req, res)).catch((error) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  });
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    state,
    requests,
    foreign,
    fetch: (path) => actualFetch(`${base}${path}`),
    advance: (ms) => {
      time += ms;
    },
    async close() {
      globalThis.fetch = actualFetch;
      Date.now = actualNow;
      restoreEnv();
      await new Promise((done) => server.close(done));
    },
  };
}
