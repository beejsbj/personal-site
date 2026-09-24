import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/house.astro");
const component = read("src/design/unique/ActivityHouse.astro");
const controller = read("src/design/unique/activity-house.ts");
const docs = read("docs/activity-house.md");

test("the house is unlisted and its initial floorplan comes from the shared model", () => {
  assert.match(page, /noindex=\{true\}/);
  assert.match(component, /import \{ buildHouseModel \}/);
  assert.match(component, /const model = buildHouseModel\(input\)/);
  assert.match(component, /data-house-input/);
  assert.match(component, /replace\(\/</);
  assert.doesNotMatch(component, /house-room--(?:mac|dispatch|s23|undertext)/);
  assert.doesNotMatch(component, /--house-grid-(?:column|row)/);
});

test("the interactive controls enhance an already-readable room list", () => {
  assert.match(component, /data-house-controls hidden/);
  assert.match(component, /\.activity-house__controls\[hidden\]/);
  assert.match(component, /<details>/);
  assert.match(component, /<summary>/);
  assert.match(component, /data-house-search/);
  assert.match(component, /data-house-filter="active"/);
  assert.match(controller, /controls\?\.removeAttribute\("hidden"\)/);
  assert.match(controller, /search\.disabled = false/);
});

test("fresh presence and reviewed activity redraw safely without making invented claims", () => {
  assert.match(controller, /activity:presence/);
  assert.match(controller, /activity:request/);
  assert.match(controller, /buildHouseModel\(\{ \.\.\.input, events, signals/);
  assert.match(controller, /events = detail\?\.events \?\? input\.events/);
  assert.match(controller, /houseExcludedIds/);
  assert.match(controller, /!excluded\.has\(item\.id\)/);
  assert.match(controller, /document\.createElement/);
  assert.match(controller, /textContent =/);
  assert.match(component, /No fresh postcard/);
  assert.match(component, /Reviewed milestones/);
  assert.match(component, /Fresh postcards/);
  assert.doesNotMatch(component, /Imagine a busy house/);
  assert.doesNotMatch(controller, /setInterval|requestAnimationFrame/);
  assert.match(controller, /astro:before-swap/);
});

test("documentation keeps the public activity and catalog boundary explicit", () => {
  assert.match(docs, /catalog/i);
  assert.match(docs, /fresh/i);
  assert.match(docs, /no real feed/i);
});
