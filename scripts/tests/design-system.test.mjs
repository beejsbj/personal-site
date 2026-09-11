import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const walk = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(path, entry.name))
      : [join(path, entry.name)],
  );
const sources = walk("src").filter((path) => /\.(astro|css)$/.test(path));
const read = (path) => readFileSync(path, "utf8");
const css = (path) =>
  path.endsWith(".css")
    ? read(path)
    : [...read(path).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
        .map((match) => match[1])
        .join("\n");
const tokens = read("src/design/tokens.css");
const definitions = new Set(
  [...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
);

test("one visual-value authority, with no raw colors or geometry in consumers", () => {
  for (const path of sources.filter(
    (path) => path !== "src/design/tokens.css",
  )) {
    // Native media conditions cannot use var(). Structural 100vh and percentages
    // are layout constraints, not design values. SVG/image attributes are art/data.
    const rules = css(path)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@media[^\{]+/g, "")
      .replace(/100vh/g, "");
    assert.doesNotMatch(
      rules,
      /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i,
      `${path}: raw palette value`,
    );
    assert.doesNotMatch(
      rules,
      /(?:\d|\.)+(?:px|rem|em|vw|vh|ms)\b/,
      `${path}: untokenized design value`,
    );
    for (const [, token] of rules.matchAll(/var\((--[\w-]+)/g)) {
      assert.ok(definitions.has(token), `${path}: undefined ${token}`);
    }
  }
});

test("every token and design component has a consumer", () => {
  const combined = sources.map(css).join("\n");
  for (const token of definitions) {
    assert.ok(
      new RegExp(`var\\(${token}(?:\\s*[,)]|\\s)`).test(combined),
      `Orphan token: ${token}`,
    );
  }
  const imported = new Set(
    sources
      .filter((path) => path.endsWith(".astro"))
      .flatMap((path) =>
        [
          ...read(path).matchAll(
            /import\s+[\s\S]*?from\s+['"]([^'"]+\.astro)['"]/g,
          ),
        ].map(([, specifier]) => resolve(dirname(path), specifier)),
      ),
  );
  for (const path of sources.filter(
    (path) => path.startsWith("src/design/") && path.endsWith(".astro"),
  )) {
    assert.ok(imported.has(resolve(path)), `Orphan component: ${path}`);
  }
});

test("guide imports production assemblies and keeps archived style-guide routing", () => {
  const guide = read("src/pages/design-system.astro");
  for (const component of [
    "WelcomeHero",
    "ProjectRow",
    "Link",
    "Heading",
    "CurrentNote",
    "UpdateEntry",
    "MediaRail",
  ]) {
    assert.match(guide, new RegExp(`import ${component} from`));
  }
  assert.match(
    read("src/pages/style-guide.astro"),
    /Astro.redirect\("\/lab\/style-guide", 301\)/,
  );
  const built = read("dist/client/design-system/index.html");
  assert.match(built, /noindex, follow/);
  assert.equal((built.match(/<h1\b/g) || []).length, 1);
  assert.match(built, /Burooj here!/);
  assert.doesNotMatch(read("dist/client/sitemap-0.xml"), /\/design-system\//);
});

test("all generated pages have shared chrome and resolving local links and media", () => {
  const output = "dist/client";
  const root = new URL("https://burooj.dev");
  for (const path of walk(output).filter((path) => path.endsWith(".html"))) {
    const html = read(path);
    if (html.includes('http-equiv="refresh"')) continue;
    assert.equal(
      (html.match(/<main\b/g) || []).length,
      1,
      `${path}: main landmark`,
    );
    assert.match(html, /site-header/, `${path}: shared header`);
    assert.match(html, /site-footer/, `${path}: shared footer`);
    const localPath =
      "/" + path.slice(output.length + 1).replace(/index\.html$/, "");
    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(
        value.replaceAll("&amp;", "&"),
        new URL(localPath, root),
      );
      if (url.origin !== root.origin) continue;
      const target = join(output, decodeURIComponent(url.pathname));
      const found = [
        target,
        join(target, "index.html"),
        target.replace(/\/$/, "") + ".html",
      ].some((candidate) => {
        try {
          return statSync(candidate).isFile();
        } catch {
          return false;
        }
      });
      assert.ok(found, `${path}: broken local reference ${value}`);
    }
  }
});

test("retired themes and unused runtime frameworks do not return", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const dependency of [
    "vue",
    "@astrojs/vue",
    "@astrojs/mdx",
    "gsap",
    "@fontsource/space-grotesk",
  ]) {
    assert.equal(pkg.dependencies[dependency], undefined, dependency);
  }
  for (const path of [
    "src/components/prototypes",
    "src/components/ProjectCard.astro",
    "src/styles/core/tokens.css",
    "src/styles/themes/default/index.css",
    "src/styles/themes/pe-site/index.css",
  ]) {
    if (path.endsWith("prototypes")) {
      assert.ok(!existsSync(path) || readdirSync(path).length === 0, path);
    } else assert.equal(existsSync(path), false, path);
  }
});
