import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { selectActivitySnapshot } from "../../src/lib/activity.mjs";

// Guards against lenses drifting from the content. Lens shells must take
// every word from /prism/content.json, never from their own source or from
// Daylight's page, and content.json must carry every entry.

const read = (path) => readFileSync(path, "utf8");
const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    : [];

const shellSources = walk("src/prism/shells").filter((path) => path.endsWith(".ts"));
const contentFiles = walk("src/content").filter((path) => /\.(md|json)$/.test(path));
const corpus = contentFiles.map(read).join("\n");

/** String literals in TypeScript source, comments skipped. Template
 * literals yield their static pieces. */
function literals(source) {
  const out = [];
  let i = 0;
  const push = (text) => out.push(text);
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    if (char === "/" && next === "/") {
      i = source.indexOf("\n", i);
      if (i < 0) break;
    } else if (char === "/" && next === "*") {
      i = source.indexOf("*/", i + 2) + 2;
      if (i < 2) break;
    } else if (char === '"' || char === "'") {
      let text = "";
      i += 1;
      while (i < source.length && source[i] !== char && source[i] !== "\n") {
        if (source[i] === "\\") {
          text += source[i + 1];
          i += 2;
        } else text += source[i++];
      }
      push(text);
      i += 1;
    } else if (char === "`") {
      let text = "";
      let depth = 0;
      i += 1;
      while (i < source.length) {
        if (depth === 0 && source[i] === "`") break;
        if (depth === 0 && source[i] === "$" && source[i + 1] === "{") {
          push(text);
          text = "";
          depth = 1;
          i += 2;
          continue;
        }
        if (depth > 0) {
          if (source[i] === "{") depth += 1;
          if (source[i] === "}") depth -= 1;
          i += 1;
          continue;
        }
        if (source[i] === "\\") {
          text += source[i + 1];
          i += 2;
        } else text += source[i++];
      }
      push(text);
      i += 1;
    } else i += 1;
  }
  return out;
}

test("lens shells hold no content: every word of 12+ characters comes from src/content", () => {
  const leaks = [];
  for (const path of shellSources) {
    for (const literal of literals(read(path))) {
      const text = literal.trim();
      // kebab-case identifiers ("pull-request") are data keys, not copy
      if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(text)) continue;
      if (text.length >= 12 && corpus.includes(text)) leaks.push(`${path}: "${text}"`);
    }
  }
  assert.deepEqual(
    leaks,
    [],
    "Move these strings into src/content (pages, site config or src/content/lenses/<id>.json) and read them from content.json",
  );
});

test("lens shells read Daylight's page only through fallbackBody, for other routes", () => {
  const reads = [];
  for (const path of shellSources) {
    if (basename(path) === "rich.ts" || basename(path) === "types.ts") continue;
    const source = read(path).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const pattern of [
      /\b\w*[rR]oute\w*\s*\??\.\s*main\b/g,
      /\{[^{}]*\bmain\b[^{}]*\}\s*=\s*[\w.]*[rR]oute\b/g,
    ])
      for (const [match] of source.matchAll(pattern)) reads.push(`${path}: ${match}`);
  }
  assert.deepEqual(reads, [], "Render from content.json; use fallbackBody(route) only for `other` routes");
  assert.match(read("src/prism/shells/rich.ts"), /export function fallbackBody/);
});

/** Front matter of a markdown file, as raw "key: value" lines. */
const frontmatter = (path) => read(path).split(/^---$/m)[1] ?? "";
const field = (path, key) =>
  frontmatter(path)
    .match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, "m"))?.[1]
    ?.trim();
const markdown = (dir) => walk(dir).filter((path) => path.endsWith(".md"));
const slug = (path) => basename(path).replace(/\.(md|json)$/, "");
const content = () => JSON.parse(read("dist/client/prism/content.json"));

test("content.json carries every visible entry, page and lens, with its body rendered", () => {
  const data = content();
  const hasBody = (path) => read(path).split(/^---$/m).slice(2).join("---").trim().length > 0;

  for (const [dir, list] of [
    ["src/content/projects", data.projects],
    ["src/content/lab", data.lab],
  ]) {
    const visible = markdown(dir).filter((path) => field(path, "hidden") !== "true");
    assert.deepEqual(
      list.map((entry) => entry.slug).sort(),
      visible.map(slug).sort(),
      `${dir}: content.json is missing or adding entries`,
    );
    for (const path of visible) {
      const entry = list.find((item) => item.slug === slug(path));
      assert.equal(typeof entry.html, "string", `${path}: no html`);
      if (hasBody(path)) assert.ok(entry.html.trim(), `${path}: body not rendered`);
    }
  }

  for (const page of ["home", "about", "resume", "projects", "lab", "notFound"])
    assert.ok(data.pages[page], `content.json is missing pages.${page}`);
  assert.ok(data.pages.about.html.trim(), "about body not rendered");
  assert.ok(data.resume.html.includes('data-part="resume.role"'), "resume structure not rendered");
  assert.ok(data.resume.experience.roles.length, "resume has no roles");

  const updates = markdown("src/content/updates").map((path) => ({
    id: slug(path),
    date: field(path, "date"),
    expiresAt: field(path, "expiresAt"),
  }));
  assert.deepEqual(
    data.updates.map((u) => u.id).sort(),
    selectActivitySnapshot(updates).map((u) => u.id).sort(),
    "content.json updates differ from the due, unexpired updates",
  );

  for (const path of walk("src/content/lenses"))
    assert.ok(data.lenses[slug(path)], `content.json is missing lenses.${slug(path)}`);

  const slugs = new Set(data.projects.map((p) => p.slug));
  assert.ok(data.featured.length > 0, "the featured set is never empty");
  for (const s of data.featured) assert.ok(slugs.has(s), `featured "${s}" is not a project`);
  assert.equal(data.derived.counts.projects, data.projects.length);
});
