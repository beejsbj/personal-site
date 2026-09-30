import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const registry = read("src/prism/lenses.ts");
const lensIds = [...registry.matchAll(/id: "([\w-]+)"/g)].map(([, id]) => id);
const [daylight, ...refractions] = lensIds;

/** Top-level and @media-nested style rule selectors, without keyframe steps. */
function selectors(css) {
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]+;/g, "")
    .replace(/@font-face\s*{[^}]*}/g, "")
    .replace(/@property[^{]+{[^}]*}/g, "");
  const found = [];
  let depth = 0;
  let buffer = "";
  const stack = [];
  for (const char of clean) {
    if (char === "{") {
      const prelude = buffer.trim();
      const inKeyframes = stack.some((entry) => entry.startsWith("@keyframes"));
      if (!prelude.startsWith("@") && !inKeyframes) found.push(prelude);
      stack.push(prelude);
      depth += 1;
      buffer = "";
    } else if (char === "}") {
      stack.pop();
      depth -= 1;
      buffer = "";
    } else if (char === ";") {
      buffer = "";
    } else buffer += char;
  }
  assert.equal(depth, 0, "unbalanced braces");
  return found.flatMap(splitTopLevel);
}

/** Split a selector list on commas outside :is()/:not()/attribute brackets. */
function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

test("five lenses, Daylight first, each refraction with its own stylesheet", () => {
  assert.equal(lensIds.length, 5);
  assert.equal(daylight, "daylight");
  const wiring = read("src/prism/prism.css");
  for (const id of refractions) {
    assert.ok(existsSync(`src/prism/lenses/${id}.css`), id);
    assert.match(wiring, new RegExp(`@import "./lenses/${id}.css"`));
  }
});

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : [join(dir, entry.name)],
      )
    : [];

// Shell CSS stays in the document after its shell unmounts, so it must be as
// strictly scoped as the lens stylesheet itself.
const lensStyles = (id) => [
  `src/prism/lenses/${id}.css`,
  ...walk(`src/prism/shells/${id}`).filter((path) => path.endsWith(".css")),
];

test("a lens only ever styles itself, never Daylight, other lenses or the prism", () => {
  for (const id of refractions) {
    const scoped = new RegExp(`^:root\\[data-lens="${id}"\\]`);
    for (const path of lensStyles(id)) {
      const css = read(path);
      for (const selector of selectors(css)) {
        assert.match(selector, scoped, `${path}: unscoped selector "${selector}"`);
        assert.doesNotMatch(selector, /prism-/, `${path}: styles prism chrome`);
      }
      for (const [, name] of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
        assert.ok(name.startsWith(`${id}-`), `${path}: keyframes "${name}" needs the "${id}-" prefix`);
      }
    }
  }
});

test("every refraction has a shell module and Daylight has none", () => {
  const runtime = read("src/prism/shell-runtime.ts");
  for (const id of refractions) {
    assert.ok(existsSync(`src/prism/shells/${id}/index.ts`), id);
    assert.match(runtime, new RegExp(`import\\("./shells/${id}/index"\\)`));
  }
  assert.doesNotMatch(runtime, /shells\/daylight/);
});

test("every page boots its lens before paint and carries the prism runtime", () => {
  const html = read("dist/client/index.html");
  assert.match(html, /<html[^>]*data-lens="daylight"/);
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /prism:lens/, "lens applied from <head>, before paint");
  assert.match(head, /astro:after-swap/, "lens survives client navigation");
  assert.match(html, /class="lens-decor" aria-hidden="true"/);
  assert.doesNotMatch(
    html,
    /class="prism-(stage|lure)/,
    "the prism adds nothing to the page until curiosity is shown",
  );
});
