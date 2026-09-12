import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

// Run after `pnpm build`: these assertions inspect what will actually ship.
const outputDir = fileURLToPath(new URL("../../dist/client/", import.meta.url));
const html = readFileSync(join(outputDir, "index.html"), "utf8");
const siteUrl = new URL("https://burooj.dev/");

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(
      ([, name, doubleQuoted, singleQuoted, unquoted]) => [
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted,
      ],
    ),
  );
}

function tags(name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    ([tag]) => attributes(tag),
  );
}

function plainText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(key, value) {
  return tags("meta").find((tag) => tag[key] === value)?.content;
}

test("approved warm welcome is the production homepage, without comparison controls", () => {
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(headings.length, 1, "Homepage must have exactly one h1");
  assert.match(plainText(headings[0][1]), /Burooj here\s*!/);
  assert.doesNotMatch(html, /prototype-switcher|data-variant-panel|noindex/i);
  for (const tag of tags("a")) {
    if (tag.href) {
      assert.equal(
        new URL(tag.href.replaceAll("&amp;", "&"), siteUrl).searchParams.has(
          "variant",
        ),
        false,
        `Comparison query leaked into link: ${tag.href}`,
      );
    }
  }
});

test("main landmark and keyboard skip destination remain accessible", () => {
  const main = tags("main");
  assert.equal(main.length, 1, "Homepage must have exactly one main landmark");
  assert.equal(main[0].id, "main-content");
  assert.equal(main[0].tabindex, "-1");
  assert.ok(
    tags("a").some(
      (tag) =>
        tag.href === "#main-content" &&
        tag.class?.split(/\s+/).includes("skip-link"),
    ),
    "Missing skip-to-content link",
  );
  assert.equal(
    [...html.matchAll(/\bid=["']main-content["']/g)].length,
    1,
    "Skip target must be unique",
  );
});

test("opening work uses one real feature without duplicating the selected projects", () => {
  const projects = [
    ...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi),
  ]
    .map(([, attrs, body]) => ({ ...attributes(attrs), body }))
    .filter((article) => article.class?.split(/\s+/).includes("project-row"));
  assert.equal(projects.length, 3);
  assert.equal(
    projects.filter((article) =>
      article.class.split(/\s+/).includes("project-row--feature"),
    ).length,
    1,
  );
  assert.ok(projects[0].class.split(/\s+/).includes("project-row--feature"));
  assert.match(projects[0].body, /href="\/projects\/conduit-market"/);
  assert.match(projects[0].body, /<img\b/);
  assert.match(
    plainText(projects[0].body),
    /Frontend Engineering &amp; Design System/,
  );
});

test("decorative circles remain artwork rather than navigation", () => {
  const artwork = html.match(
    /<svg\b([^>]*\bdata-blob-art\b[^>]*)>([\s\S]*?)<\/svg>/i,
  );
  assert.ok(artwork, "Missing decorative circle artwork");
  const attrs = attributes(artwork[1]);
  assert.equal(attrs["aria-hidden"], "true");
  assert.equal(attrs.focusable, "false");
  assert.equal([...artwork[2].matchAll(/<circle\b/g)].length, 4);
  assert.doesNotMatch(artwork[0], /<(?:a|button)\b|\btabindex\s*=/i);
});

test("homepage preserves canonical and social metadata", () => {
  assert.equal(
    tags("link").find((tag) => tag.rel === "canonical")?.href,
    siteUrl.href,
  );
  assert.ok(meta("name", "description")?.trim(), "Missing description");
  assert.equal(meta("property", "og:description"), meta("name", "description"));
  assert.ok(meta("property", "og:title")?.includes("Burooj"));
  assert.equal(
    meta("property", "og:image"),
    "https://burooj.dev/images/burooj4.jpg",
  );
  assert.equal(meta("name", "twitter:image"), meta("property", "og:image"));
});

test("real featured projects, current work, and dated updates remain present", () => {
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(
    ([, attrs, body]) => ({ ...attributes(attrs), text: plainText(body) }),
  );
  for (const [slug, title] of [
    ["api3-ecosystem", "API3 Ecosystem"],
    ["conduit-market", "Conduit Market"],
    ["qrng", "QRNG Demo Apps"],
  ]) {
    assert.ok(
      links.some(
        (link) =>
          link.href?.replace(/\/$/, "") === `/projects/${slug}` &&
          link.text.includes(title),
      ),
      `Missing project link: ${title}`,
    );
  }
  for (const text of [
    "Currently",
    "bjslab",
    "Recent updates",
    "A stable home for the API3 showcase",
    "Conduit Market joins the portfolio",
    "The QRNG demos are playable again",
  ]) {
    assert.ok(
      plainText(html).includes(text),
      `Missing homepage content: ${text}`,
    );
  }
  for (const date of ["2026-09-02", "2026-07-01", "2026-06-20"]) {
    assert.ok(
      tags("time").some((tag) => tag.datetime === date),
      `Missing update date: ${date}`,
    );
  }
});

test("local links, stylesheets, icons, and image sources resolve in built output", () => {
  const references = [
    ...tags("a").map((tag) => tag.href),
    ...tags("link").map((tag) => tag.href),
    ...tags("img").map((tag) => tag.src),
  ].filter(Boolean);
  assert.ok(tags("img").length > 0, "Expected portrait and project images");
  for (const reference of references) {
    const url = new URL(reference.replaceAll("&amp;", "&"), siteUrl);
    if (url.origin !== siteUrl.origin) continue;
    const pathname = decodeURIComponent(url.pathname);
    const candidates = [
      join(outputDir, pathname),
      join(outputDir, pathname, "index.html"),
    ];
    assert.ok(
      candidates.some((path) => {
        try {
          return statSync(path).isFile();
        } catch {
          return false;
        }
      }),
      `Local reference does not resolve in dist/client: ${reference}`,
    );
  }
});
