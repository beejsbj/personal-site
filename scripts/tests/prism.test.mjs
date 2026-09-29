import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("a lens only ever styles itself, never Daylight, other lenses or the prism", () => {
  for (const id of refractions) {
    const scoped = new RegExp(`^:root\\[data-lens="${id}"\\]`);
    for (const selector of selectors(read(`src/prism/lenses/${id}.css`))) {
      assert.match(selector, scoped, `${id}: unscoped selector "${selector}"`);
      assert.doesNotMatch(selector, /prism-/, `${id}: styles prism chrome`);
    }
  }
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
