import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { selectPresenceSignals } from "../../src/lib/activity-presence.mjs";
import { selectFeedEvents } from "../../src/lib/activity-feed.mjs";

const code = ts.transpileModule(
  readFileSync("src/lib/live-activity.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const START = Date.parse("2026-09-20T12:00:00Z");
const flush = () => new Promise(setImmediate);
const snapshot = () => ({
  version: 1,
  status: "connected",
  generatedAt: new Date(START).toISOString(),
  events: [{ id: "activity_fedcba9876543210", kind: "milestone", source: "bjslab", title: "Undertext opens a chapter", summary: "A public milestone.", href: "https://burooj.dev/house", linkLabel: "Look around", occurredAt: new Date(START - 1000).toISOString(), relatedProject: "Undertext" }],
  signals: [
    {
      id: "activity_0123456789abcdef",
      title: "Astra is tinkering on Undertext",
      summary: "A few ideas on the workbench.",
      href: "https://example.test/undertext",
      linkLabel: "Visit the workbench",
      source: "agent-session",
      kind: "agents",
      observedAt: new Date(START).toISOString(),
      expiresAt: new Date(START + 1_000).toISOString(),
      relatedProject: "undertext",
    },
  ],
});
function harness() {
  let clock = START,
    timerId = 0,
    calls = 0,
    fail = false;
  let frame = snapshot();
  const timers = new Map();
  const states = [];
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    querySelector: () => ({}),
    querySelectorAll: () => [],
  });
  const window = new EventTarget();
  window.addEventListener("activity:presence", (event) =>
    states.push(event.detail),
  );
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: () => ({ selectPresenceSignals, selectFeedEvents }),
    window,
    document,
    AbortController,
    CustomEvent,
    Date: class extends Date {
      static now() {
        return clock;
      }
    },
    setTimeout: (fn, delay) => {
      const id = ++timerId;
      timers.set(id, { fn, at: clock + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    fetch: async () => {
      calls++;
      if (fail) throw new Error("offline");
      return { ok: true, text: async () => JSON.stringify(frame) };
    },
  });
  return {
    install: module.exports.installLiveActivity,
    document,
    window,
    states,
    get calls() {
      return calls;
    },
    get timerCount() {
      return timers.size;
    },
    set fail(value) {
      fail = value;
    },
    set frame(value) { frame = value; },
    async advance(ms) {
      const target = clock + ms;
      while (true) {
        const next = [...timers]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        clock = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        await flush();
      }
      clock = target;
    },
  };
}

test("fresh presence expires in an open page without waiting for another poll", async () => {
  const h = harness();
  const cleanup = h.install();
  await flush();
  assert.equal(
    h.states.at(-1).signals[0].title,
    "Astra is tinkering on Undertext",
  );
  await h.advance(1_002);
  assert.equal(h.states.at(-1).signals.length, 0);
  assert.equal(h.states.at(-1).events.length, 1);
  assert.equal(h.calls, 1);
  cleanup();
  assert.equal(h.timerCount, 0);
});

test("hidden tabs stop polling and resume without reviving expired claims", async () => {
  const h = harness();
  const cleanup = h.install();
  await flush();
  h.document.hidden = true;
  h.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.timerCount, 0);
  await h.advance(60_000);
  assert.equal(h.calls, 1);
  h.document.hidden = false;
  h.document.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(h.calls, 2);
  assert.equal(h.states.at(-1).signals.length, 0);
  cleanup();
});

test("installation is singular, route cleanup cancels timers, and failure becomes unknown", async () => {
  const h = harness();
  const cleanup = h.install();
  assert.equal(h.install(), cleanup);
  await flush();
  assert.equal(h.calls, 1);
  h.fail = true;
  h.document.dispatchEvent(new Event("astro:page-load"));
  await flush();
  assert.equal(h.states.at(-1).status, "unavailable");
  assert.equal(h.states.at(-1).signals.length, 0);
  assert.equal(h.states.at(-1).events.length, 0);
  h.document.dispatchEvent(new Event("astro:before-swap"));
  assert.equal(h.timerCount, 0);
  await h.advance(60_000);
  assert.equal(h.calls, 2);
  cleanup();
});

test("new consumers can request the shared state and an authoritative feed removes retracted milestones", async () => {
  const h = harness();
  const cleanup = h.install();
  await flush();
  const count = h.states.length;
  h.window.dispatchEvent(new Event("activity:request"));
  assert.equal(h.states.length, count + 1);
  assert.equal(h.states.at(-1).events[0].relatedProject, "Undertext");
  h.frame = { ...snapshot(), events: [], signals: [] };
  await h.advance(30_001);
  assert.equal(h.states.at(-1).events.length, 0);
  cleanup();
});
