import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/house.astro");
const component = read("src/design/unique/ActivityHouse.astro");
const data = read("src/data/activity-house.ts");
const controller = read("src/design/unique/activity-house.ts");
const docs = read("docs/activity-house.md");

test("the house is hidden, static by default, and has a clear public boundary", () => {
  assert.match(page, /noindex=\{true\}/);
  assert.match(data, /The house is waiting for a signal/);
  assert.match(component, /Imagine a busy house/);
  assert.match(component, /Imagined scene/);
  assert.match(component, /data-house-connection/);
  assert.match(data, /href: "\/projects"/);
  assert.doesNotMatch(data, /https?:\/\//);
  assert.doesNotMatch(data, /\b(?:IP|token|secret|password)\b/i);
});

test("the plan remains keyboard-friendly and readable without the controller", () => {
  assert.match(component, /type="button"[\s\S]*data-room-button/);
  assert.match(component, /aria-pressed=/);
  assert.match(component, /<details>/);
  assert.match(component, /<summary>/);
  assert.match(component, /data-house-detail/);
  assert.match(component, /data-house-motion/);
  assert.match(
    component,
    /activity-house__controls" aria-label="House controls" hidden/,
  );
  assert.match(
    component,
    /\.activity-house__controls\[hidden\][\s\S]*display: none/,
  );
  assert.match(component, /data-room-button=\{room\.id\}[\s\S]*disabled/);
  assert.match(controller, /room\.disabled = false/);
  assert.match(controller, /root\.dataset\.ready = "true"/);
});

test("presence is opt-in, expires locally, and never blends into the fictional demo", () => {
  assert.match(controller, /activity:presence/);
  assert.match(controller, /expiry > Date\.now\(\)/);
  assert.match(controller, /if \(!signal\.expiresAt\) return false/);
  assert.match(controller, /if \(!demoActive\) renderPresence\(\)/);
  assert.match(controller, /Fresh postcards from around the house/);
  assert.match(component, /installLiveActivity\(\)/);
  assert.match(controller, /astro:before-swap/);
  assert.doesNotMatch(controller, /setInterval|requestAnimationFrame/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(
    component,
    /\.activity-house\[data-scene="demo"\]\[data-motion="playing"\][\s\S]*\.house-worker__figure[\s\S]*animation: none/,
  );
  assert.match(docs, /never merged into the demo story/);
});
