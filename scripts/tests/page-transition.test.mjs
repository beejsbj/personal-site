import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/page-transition.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const css = readFileSync(
  new URL("../../src/design/unique/PageTransition.astro", import.meta.url),
  "utf8",
);

const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/** A link from the family: classes, its box, and (for text) its lines. */
const link = ({ classes = [], ball = false, box, lines = [], paint }) => ({
  classList: { contains: (name) => classes.includes(name) },
  matches: (selector) => selector === "[data-ball]" && ball,
  getBoundingClientRect: () => box,
  querySelector: (selector) =>
    selector === ".ds-link__body" ? { getClientRects: () => lines } : null,
  paint,
});

const load = () => {
  const context = {
    exports: {},
    getComputedStyle: (element, pseudo) => ({
      height: pseudo === "::before" ? (element.paint ?? "auto") : "auto",
    }),
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
};

test("each family member is recognised, so a pill is never seeded as a ball", () => {
  const { linkKind } = load();
  assert.equal(linkKind(link({ ball: true })), "ball");
  assert.equal(linkKind(link({ classes: ["ds-link--pill"] })), "pill");
  assert.equal(linkKind(link({ classes: ["ds-link--text"] })), "text");
  assert.equal(linkKind(link({})), undefined);
});

test("a pill seeds from its own stretched paint: full width, its height, centred", () => {
  const { seedBox } = load();
  const pill = link({
    classes: ["ds-link--pill"],
    box: rect(600, 500, 113, 44),
    paint: "36px",
  });
  assert.deepEqual(
    { ...seedBox(pill, "pill") },
    { left: 600, top: 504, width: 113, height: 36 },
  );
});

test("a text link seeds from the line of words that was clicked", () => {
  const { seedBox } = load();
  const words = link({
    classes: ["ds-link--text"],
    box: rect(100, 100, 300, 64),
    lines: [rect(250, 100, 150, 32), rect(100, 132, 120, 32)],
  });
  assert.deepEqual(
    { ...seedBox(words, "text", { x: 140, y: 150 }) },
    { left: 100, top: 132, width: 120, height: 32 },
  );
  // Keyboard (no point): the first line.
  assert.deepEqual(
    { ...seedBox(words, "text") },
    { left: 250, top: 100, width: 150, height: 32 },
  );
});

test("pills and text swell as a pill, balls as a circle", () => {
  assert.match(
    css,
    /\[data-from="pill"\], \[data-from="text"\]\) \.page-cover__sheet \{\s*animation-name: page-swell-pill/,
  );
  assert.match(
    css,
    /@keyframes page-swell-pill \{\s*from \{\s*clip-path: inset\(\s*var\(--seed-t\)/,
  );
  // The cover still takes the pointer while it is up, and a stray link's
  // fallback ball stays capped.
  assert.match(css, /\.page-cover \{[^}]*pointer-events: auto/);
  assert.match(
    css,
    /\.page-cover__ball \{[^}]*max-width: var\(--page-ball-max\)/,
  );
});
