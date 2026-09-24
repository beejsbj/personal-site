import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildHouseModel } from "../../src/lib/activity-house-model.mjs";
import {
  buildHouseScene,
  esc,
  propFor,
  renderHouseMarkup,
  renderRoomDetail,
} from "../../src/lib/house-scene.mjs";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/house.astro");
const component = read("src/design/unique/ActivityHouse.astro");
const controller = read("src/design/unique/activity-house.ts");
const docs = read("docs/activity-house.md");

const NOW = Date.parse("2026-09-20T12:00:00Z");
const catalog = {
  version: 1,
  rooms: [
    { id: "undertext", title: "Undertext", summary: "Reading slowly.", kind: "project", furnishing: "shelves", pinned: true, order: 10 },
    { id: "cockpit", title: "Cockpit", summary: "Loose threads.", kind: "place", furnishing: "table", order: 20 },
  ],
  residents: [{ id: "hermes", name: "Hermes", role: "Resident", roomId: "cockpit" }],
};
const signal = (n, extra) => ({
  id: `activity_${String(n).padStart(16, "0")}`,
  title: "Astra is tinkering on Undertext",
  summary: "A bounded public note.",
  href: "https://burooj.dev/house",
  linkLabel: "Look around",
  source: "bjslab",
  kind: "agents",
  observedAt: new Date(NOW - 60_000).toISOString(),
  expiresAt: new Date(NOW + 60_000).toISOString(),
  ...extra,
});
const scene = (signals = [], events = []) =>
  buildHouseScene(buildHouseModel({ catalog, events, signals, now: NOW }));

test("the house is unlisted and first paint uses the shared scene renderer", () => {
  assert.match(page, /noindex=\{true\}/);
  assert.match(page, /rehearsal=\{import\.meta\.env\.DEV\}/);
  assert.match(component, /buildHouseScene\(model\)/);
  assert.match(component, /renderHouseMarkup\(scene/);
  assert.match(controller, /renderHouseMarkup\(scene/);
  assert.match(component, /replace\(\/</);
  assert.match(component, /<noscript>/);
  // Browser-redrawn markup cannot carry Astro's scoped-style attributes.
  assert.match(component, /<style is:global>/);
});

test("a quiet house names its residents without inventing visitors", () => {
  const quiet = scene();
  assert.equal(quiet.busy, false);
  assert.equal(quiet.status, "Hermes is minding Cockpit. Nobody else has checked in just now.");
  assert.deepEqual(quiet.upstairs.map((room) => room.id), ["undertext"]);
  assert.deepEqual(quiet.downstairs.map((room) => room.id), ["cockpit"]);
  const markup = renderHouseMarkup(quiet, { selectedId: "undertext" });
  assert.doesNotMatch(markup, /data-figure="visitor"/);
  assert.match(markup, /data-figure="resident"/);
  assert.match(markup, /The front door/);
});

test("a fresh actor lights their room and walks in; one without a room waits at the door", () => {
  const busy = scene([
    signal(1, { relatedProject: "Undertext", actor: { id: "astra", name: "Astra", role: "Tinkerer" } }),
    signal(2, { title: "Opal has a parcel", actor: { id: "opal", name: "Opal", role: "Courier" } }),
  ]);
  const undertext = busy.rooms.find((room) => room.id === "undertext");
  assert.equal(undertext.lit, true);
  assert.equal(undertext.whisper, "Astra is tinkering on Undertext");
  assert.equal(busy.waiting[0].name, "Opal");
  assert.match(busy.status, /Astra in Undertext and Opal at the door/);
  const markup = renderHouseMarkup(busy, {
    arriving: new Set(["visitor:astra:undertext"]),
  });
  assert.match(markup, /data-figure="visitor" data-prop="tinkerer" data-arriving/);
  assert.match(markup, /Someone’s at the door/);
});

test("expired signals leave the lights off", () => {
  const stale = scene([
    signal(3, {
      relatedProject: "Undertext",
      observedAt: new Date(NOW - 400_000).toISOString(),
      expiresAt: new Date(NOW - 200_000).toISOString(),
    }),
  ]);
  assert.equal(stale.busy, false);
});

test("every public string is escaped before it becomes markup", () => {
  assert.equal(esc(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  const hostile = scene([
    signal(4, { relatedProject: "Undertext", title: "<script>x</script>", actor: { id: "x", name: "<b>X</b>", role: "Builder" } }),
  ]);
  const markup =
    renderHouseMarkup(hostile) + renderRoomDetail(hostile.rooms[0]);
  assert.doesNotMatch(markup, /<script>|<b>X<\/b>/);
});

test("roles choose a costume, never a claim", () => {
  assert.equal(propFor("Builder"), "builder");
  assert.equal(propFor("Scout"), "scout");
  assert.equal(propFor("Tinkerer"), "tinkerer");
  assert.equal(propFor("Consultant"), "consultant");
  assert.equal(propFor("Messenger"), "messenger");
  assert.equal(propFor("Resident"), "keeper");
  assert.equal(propFor("Juggler"), "plain");
});

test("the browser redraws from shared presence without polling of its own", () => {
  assert.match(controller, /activity:presence/);
  assert.match(controller, /activity:request/);
  assert.match(controller, /houseExcludedIds/);
  assert.match(controller, /astro:before-swap/);
  assert.doesNotMatch(controller, /setInterval|requestAnimationFrame/);
  // Pretend visitors exist only behind the dev-only rehearsal flag.
  assert.match(controller, /rehearsal === "available"/);
});

test("documentation keeps the public activity and catalog boundary explicit", () => {
  assert.match(docs, /catalog/i);
  assert.match(docs, /fresh/i);
  assert.match(docs, /no real feed/i);
  assert.match(docs, /rehears/i);
});
