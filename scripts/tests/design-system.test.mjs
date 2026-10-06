import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { isServerRoute } from "./lib/server-routes.mjs";

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
  // Each prism lens is the visual-value authority for its own refraction.
  for (const path of sources.filter(
    (path) => path !== "src/design/tokens.css" && !path.startsWith("src/prism/"),
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
      `${path}: untokenized shared design value`,
    );
    for (const [, token] of rules.matchAll(/var\((--[\w-]+)/g)) {
      const local = new RegExp(`${token}\\s*:`).test(rules);
      assert.ok(definitions.has(token) || local, `${path}: undefined ${token}`);
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

test("dedicated style guide imports production assemblies and keeps design-system as an alias", () => {
  const guide = read("src/pages/style-guide.astro");
  for (const component of [
    "WelcomeHero",
    "ProjectRow",
    "Link",
    "Heading",
    "CurrentNote",
    "UpdateEntry",
    "ActivityStream",
    "BallNav",
    "MediaRail",
  ]) {
    assert.match(guide, new RegExp(`import ${component} from`));
  }
  assert.match(
    read("src/pages/design-system.astro"),
    /Astro.redirect\("\/style-guide", 301\)/,
  );
  const built = read("dist/client/style-guide/index.html");
  assert.match(built, /noindex, follow/);
  assert.match(
    built,
    /aria-label="Navigation specimen"/,
    "Guide must demonstrate the real ball navigation",
  );
  assert.doesNotMatch(
    built,
    /astro-island/,
    "The guide needs no hydrated UI framework",
  );
  assert.equal((built.match(/<h1\b/g) || []).length, 1);
  assert.match(built, /Burooj here!/);
  assert.doesNotMatch(read("dist/client/sitemap-0.xml"), /\/design-system\//);
  assert.doesNotMatch(built, /Pause motion/);
  assert.match(
    built,
    /<nav\b[^>]*aria-label="Ball navigation specimen"[^>]*data-ball-nav/,
    "Guide must demonstrate the real ball links",
  );
  assert.match(
    read("dist/client/design-system/index.html"),
    /http-equiv="refresh"/,
  );
});

test("one ball navigation on every page, with native links and correct section markers", () => {
  // Burooj, round 4: no point in two navs. The balls are the site nav
  // everywhere; the old six-link text menu must not come back beside them.
  for (const [path, current, form] of [
    ["index.html", "/", "cluster"],
    ["about/index.html", "/about", "row"],
    ["projects/index.html", "/projects", "row"],
    ["projects/conduit-market/index.html", "/projects", "row"],
    ["lab/index.html", "/lab", "row"],
    ["resume/index.html", null, "row"],
  ]) {
    const html = read(`dist/client/${path}`);
    const navs = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)];
    assert.equal(navs.length, 1, `${path}: exactly one nav`);
    const [, attrs, body] = navs[0];
    assert.match(attrs, /aria-label="Main navigation"/, `${path}: named`);
    assert.match(attrs, /data-ball-nav/, `${path}: the nav is the balls`);
    assert.match(attrs, new RegExp(`data-form="${form}"`), `${path}: form`);
    assert.match(
      html.slice(0, navs[0].index),
      /<header\b[^>]*site-header/,
      `${path}: the nav lives in the shared header`,
    );
    const anchors = [...body.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    assert.equal(anchors.length, 6, `${path}: all six destinations`);
    for (const tag of anchors) {
      assert.match(tag, /\bds-link--ball\b/, `${path}: shared ball link`);
      assert.match(tag, /draggable="false"/, `${path}: a press never drags`);
    }
    for (const href of [
      'href="/"',
      'href="/projects"',
      'href="/lab"',
      'href="/about"',
      'href="/writing"',
      'href="mailto:',
    ])
      assert.ok(
        anchors.some((tag) => tag.includes(href)),
        `${path}: ${href}`,
      );
    const marked = anchors.filter((tag) => tag.includes('aria-current="page"'));
    if (current === null) {
      assert.equal(marked.length, 0, `${path}: no false marker`);
    } else {
      assert.equal(marked.length, 1, `${path}: one current ball`);
      assert.ok(marked[0].includes(`href="${current}"`));
      assert.match(marked[0], /data-tone="wine"/, "current ball is burgundy");
    }
    assert.match(html, /data-magnetic-edge/);
  }
});

test("one link family: no drag physics, no rectangular actions, shared ball tokens", () => {
  assert.equal(
    existsSync("src/design/unique/ball-nav.ts"),
    false,
    "Ball drag/throw physics were removed on purpose",
  );
  assert.equal(existsSync("src/components/SiteNav.astro"), false);
  // The flavour came back on the paint only (round 5): the runtime has no
  // drag, the face and label never take the pointer, and the sunrise
  // animates them rather than the link.
  assert.doesNotMatch(
    read("src/design/unique/ball-life.ts"),
    /setPointerCapture|dragstart|preventDefault/,
  );
  const link = read("src/design/primitives/Link.astro");
  for (const layer of [
    /\.ds-link--ball > \.ds-link__body \{[^}]*pointer-events: none/,
    /\.ball-face \{[^}]*pointer-events: none/,
  ])
    assert.match(link, layer, "painted layers ignore the pointer");
  const ballNav = read("src/design/unique/BallNav.astro");
  for (const [, selector, body] of ballNav.matchAll(
    /([^{}]+)\{([^{}]*animation:[^{}]*)\}/g,
  ))
    assert.match(
      selector,
      /ds-link--ball( \.ball-face| > \.ds-link__body)/,
      `only painted layers animate: ${selector.trim()}`,
    );
  for (const token of [
    "--ball-fill",
    "--ball-fill-hover",
    "--ball-fill-current",
    "--ball-ink",
  ]) {
    assert.match(link, new RegExp(`var\\(${token}\\)`), `Link uses ${token}`);
  }
  assert.doesNotMatch(link, /ds-link--action|ds-link--nav/);
  for (const path of sources.filter((path) => path.endsWith(".astro"))) {
    assert.doesNotMatch(
      read(path),
      /treatment="(?:action|nav)"/,
      `${path}: retired link treatment`,
    );
  }
  // Standalone actions are pills from the same family.
  const home = read("dist/client/index.html");
  for (const label of [
    "GitHub",
    "LinkedIn",
    "Email",
    "Resume",
    "That's me",
    "All projects",
  ]) {
    const escaped = label.replace("'", "(?:'|&#39;)");
    assert.match(
      home,
      new RegExp(
        `<a\\b[^>]*ds-link--pill[^>]*>(?:(?!</a>)[\\s\\S])*${escaped}`,
      ),
      `${label} is a pill`,
    );
  }
});

test("ball labels never wrap, and external balls wear a named satellite on the rim", () => {
  // Round 6: "Say / hello ↗" on three lines looked unpolished. Each ball is
  // sized to its one-line label; external links get a rim badge and say
  // where they go in words.
  const link = read("src/design/primitives/Link.astro");
  assert.match(link, /\.ds-link--ball \{[^}]*white-space: nowrap/);
  assert.doesNotMatch(link, /text-wrap: balance/);
  for (const path of ["index.html", "about/index.html"]) {
    const html = read(`dist/client/${path}`);
    const nav = html.match(
      /<nav\b[^>]*data-ball-nav[^>]*>([\s\S]*?)<\/nav>/,
    )[1];
    const anchors = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    for (const [, attrs, body] of anchors) {
      const external = /href="(?:https?:|mailto:)/.test(attrs);
      assert.equal(
        /class="link-sat\b/.test(body),
        external,
        `${path}: satellite iff external`,
      );
      const note = body.match(/ds-link__note[^>]*>([^<]*)</)?.[1];
      if (external)
        assert.match(
          note ?? "",
          /^\((external site|email)\)$/,
          `${path}: named`,
        );
      else assert.equal(note, undefined);
      assert.match(body, /class="ball-face[^"]*"[^>]*aria-hidden="true"/);
    }
  }
});

test("one arrow language: every arrow is the satellite, one inked glyph turned for outbound", () => {
  // Round 7: balls, pills and text links had three different arrows. Now
  // each is a small burgundy ball carrying the same hand-inked path;
  // leaving the site only turns it.
  const link = read("src/design/primitives/Link.astro");
  assert.equal(
    (link.match(/<path\b/g) || []).length,
    1,
    "one arrow glyph in the family",
  );
  assert.match(link, /\.link-sat--out \{[^}]*--sat-turn: -45deg/);
  assert.match(
    link,
    /prefers-reduced-motion: no-preference\) \{[\s\S]*?\.link-sat \{\s*translate/,
    "the kick only plays when motion is welcome",
  );
  assert.match(link, /forced-colors: active\) \{\s*\.link-sat \{\s*border/);
  const paths = new Set();
  for (const page of [
    "index.html",
    "about/index.html",
    "projects/index.html",
  ]) {
    const html = read(`dist/client/${page}`);
    assert.doesNotMatch(
      html,
      /link-arrow|ball-badge/,
      `${page}: retired arrows`,
    );
    for (const [, attrs, body] of html.matchAll(
      /<a\b([^>]*ds-link--(?:pill|text|ball)[^>]*)>([\s\S]*?)<\/a>/g,
    )) {
      const sat = body.match(
        /<span class="link-sat( link-sat--out)?"[^>]*aria-hidden="true"[^>]*>[\s\S]*?<path d="([^"]+)"/,
      );
      if (!sat) continue;
      paths.add(sat[2]);
      const outbound = /href="(?:https?:|mailto:)/.test(attrs);
      assert.equal(Boolean(sat[1]), outbound, `${page}: turned iff outbound`);
      if (outbound)
        assert.match(body, /ds-link__note[^>]*>\(/, `${page}: says where`);
    }
  }
  assert.equal(paths.size, 1, "every satellite carries the same glyph");
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
      const found =
        isServerRoute(url.pathname) ||
        [
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
