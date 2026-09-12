import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/edge-magnet.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

class Surface {
  listeners = new Map();
  dataset = {};
  style = {
    removeProperty(name) {
      delete this[name];
    },
  };
  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    options.signal?.addEventListener("abort", () => listeners.delete(listener));
  }
  emit(type, properties = {}) {
    for (const callback of [...(this.listeners.get(type) ?? [])])
      callback(properties);
  }
}

function harness(matches = true) {
  const document = new Surface();
  document.hidden = false;
  const media = new Surface();
  media.matches = matches;
  const root = new Surface();
  const hit = new Surface();
  const surface = new Surface();
  hit.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  root.querySelector = (selector) =>
    ({
      ".edge-blob__hit": hit,
      ".edge-blob__surface": surface,
    })[selector] ?? null;
  document.querySelectorAll = (selector) =>
    selector === "[data-magnetic-edge]" ? [root] : [];
  const frames = new Map();
  let nextFrame = 0;
  let now = 0;
  const context = {
    exports: {},
    document,
    window: {
      matchMedia: (query) => {
        assert.match(query, /hover: hover/);
        assert.match(query, /pointer: fine/);
        assert.match(query, /prefers-reduced-motion: no-preference/);
        return media;
      },
    },
    AbortController: class {
      signal = new Surface();
      abort() {
        this.signal.emit("abort");
      }
    },
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  vm.runInNewContext(compiled, context);
  context.exports.installEdgeMagnet();
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    }
  };
  const move = (properties = {}) =>
    document.emit("pointermove", {
      pointerType: "mouse",
      clientX: 85,
      clientY: 25,
      ...properties,
    });
  return { document, media, root, hit, surface, frames, tick, move };
}

test("corner decoration remains stationary for reduced motion and touch", () => {
  const h = harness(false);
  assert.equal(h.root.dataset.motion, "paused");
  h.move();
  assert.equal(h.frames.size, 0);
  h.media.matches = true;
  h.media.emit("change");
  h.move({ pointerType: "touch" });
  assert.equal(h.frames.size, 0);
  h.move();
  h.tick(4);
  h.move({ pointerType: "touch" });
  assert.equal(h.frames.size, 0);
  assert.equal(h.surface.style.transform, undefined);
});

test("nearby pointer moves only artwork, then held and distant pointers settle without idle RAF", () => {
  const h = harness();
  h.move();
  h.tick(20);
  assert.match(h.surface.style.transform, /translate3d/);
  assert.equal(h.hit.style.transform, undefined);
  assert.equal(h.root.style.transform, undefined);
  h.tick(150);
  assert.equal(h.frames.size, 0, "held pointer has no idle RAF loop");
  h.move({ clientX: 300, clientY: 300 });
  h.tick(150);
  assert.equal(h.surface.style.transform, undefined);
  assert.equal(h.frames.size, 0);
  h.move();
  h.tick(4);
  h.document.emit("pointerleave");
  h.tick(150);
  assert.equal(h.surface.style.transform, undefined);
  assert.equal(h.frames.size, 0);
});

test("preference and visibility changes reset attraction and prevent background motion", () => {
  const h = harness();
  h.move();
  h.tick(4);
  h.media.matches = false;
  h.media.emit("change");
  assert.equal(h.frames.size, 0);
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.surface.style.transform, undefined);
  h.media.matches = true;
  h.media.emit("change");
  h.move();
  h.tick(4);
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  h.move();
  assert.equal(h.frames.size, 0);
  assert.equal(h.surface.style.transform, undefined);
  assert.equal(h.root.dataset.motion, "paused");
  h.document.hidden = false;
  h.document.emit("visibilitychange");
  assert.equal(h.root.dataset.motion, "running");
  assert.equal(h.frames.size, 0);
});

test("Astro navigation removes old listeners and repeated mounting stays singular", () => {
  const h = harness();
  h.move();
  h.tick(4);
  h.document.emit("astro:before-swap");
  assert.equal(h.frames.size, 0);
  assert.equal(h.surface.style.transform, undefined);
  assert.equal(h.document.listeners.get("pointermove").size, 0);
  assert.equal(h.document.listeners.get("pointerleave").size, 0);
  assert.equal(h.media.listeners.get("change").size, 0);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.document.listeners.get("pointermove").size, 1);
  assert.equal(h.document.listeners.get("pointerleave").size, 1);
  assert.equal(h.document.listeners.get("visibilitychange").size, 1);
  assert.equal(h.media.listeners.get("change").size, 1);
  h.move();
  h.tick(4);
  assert.match(h.surface.style.transform, /translate3d/);
});
