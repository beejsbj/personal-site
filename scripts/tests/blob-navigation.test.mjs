import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/blob-navigation.ts", import.meta.url),
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
  attributes = {};
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
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

function harness(matches = true) {
  const document = new Surface();
  document.activeElement = {};
  const media = new Surface();
  media.matches = matches;
  const link = new Surface();
  const label = new Surface();
  const magnet = new Surface();
  const slot = new Surface();
  const root = new Surface();
  const edgeRoot = new Surface();
  const edgeSlot = new Surface();
  const edgeSurface = new Surface();
  slot.querySelector = (selector) =>
    ({
      a: link,
      ".blob-nav__label": label,
      ".blob-nav__magnet, .edge-blob__surface": magnet,
    })[selector] ?? null;
  slot.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  edgeSlot.querySelector = (selector) =>
    selector === ".blob-nav__magnet, .edge-blob__surface" ? edgeSurface : null;
  edgeSlot.getBoundingClientRect = slot.getBoundingClientRect;
  root.querySelectorAll = (selector) =>
    selector === ".blob-nav__slot, .edge-blob__hit" ? [slot] : [];
  edgeRoot.querySelectorAll = (selector) =>
    selector === ".blob-nav__slot, .edge-blob__hit" ? [edgeSlot] : [];
  document.querySelectorAll = (selector) =>
    selector === "[data-blob-nav], [data-magnetic-edge]"
      ? [root, edgeRoot]
      : [];
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
  context.exports.installBlobNavigation();
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    }
  };
  const move = () =>
    slot.emit("pointermove", {
      pointerType: "mouse",
      clientX: 85,
      clientY: 25,
    });
  return {
    document,
    media,
    link,
    label,
    magnet,
    slot,
    edgeRoot,
    edgeSlot,
    edgeSurface,
    root,
    frames,
    tick,
    move,
  };
}

test("blob enhancement leaves reduced-motion and touch navigation stationary", () => {
  const h = harness(false);
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.edgeRoot.dataset.motion, "paused");
  h.move();
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 85,
    clientY: 25,
  });
  h.slot.emit("pointerleave");
  assert.equal(h.frames.size, 0);
  h.media.matches = true;
  h.media.emit("change");
  h.slot.emit("pointermove", {
    pointerType: "touch",
    clientX: 85,
    clientY: 25,
  });
  h.document.emit("pointermove", {
    pointerType: "touch",
    clientX: 85,
    clientY: 25,
  });
  assert.equal(h.frames.size, 0);
});

test("spring moves the visual body and label but never the link; it settles without an idle loop", () => {
  const h = harness();
  h.move();
  h.tick(20);
  assert.match(h.magnet.style.transform, /translate3d/);
  assert.match(h.label.style.transform, /translate3d/);
  assert.equal(h.link.style.transform, undefined);
  h.slot.emit("pointerleave");
  h.tick(150);
  assert.equal(h.frames.size, 0);
  assert.equal(h.magnet.style.transform, undefined);
  assert.equal(h.label.style.transform, undefined);
});

test("corner decoration follows nearby pointers, leaves click geometry still, and settles at rest", () => {
  const h = harness();
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 85,
    clientY: 25,
  });
  h.tick(20);
  assert.match(h.edgeSurface.style.transform, /translate3d/);
  assert.equal(h.edgeSlot.style.transform, undefined);
  assert.equal(h.edgeRoot.style.transform, undefined);
  h.tick(150);
  assert.equal(h.frames.size, 0, "held pointer has no idle RAF loop");
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 300,
    clientY: 300,
  });
  h.tick(150);
  assert.equal(h.edgeSurface.style.transform, undefined);
  assert.equal(h.frames.size, 0);
});

test("keyboard focus immediately resets navigation attraction and suppresses further pull", () => {
  const h = harness();
  h.move();
  h.tick(4);
  h.document.activeElement = h.link;
  h.link.emit("focus");
  assert.equal(h.magnet.style.transform, undefined);
  assert.equal(h.label.style.transform, undefined);
  assert.equal(h.frames.size, 0);
  h.move();
  assert.equal(h.frames.size, 0);
});

test("preference changes, visibility and Astro navigation reset both surfaces and listeners safely", () => {
  const h = harness();
  h.move();
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 85,
    clientY: 25,
  });
  h.tick(4);
  h.media.matches = false;
  h.media.emit("change");
  assert.equal(h.frames.size, 0);
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.edgeRoot.dataset.motion, "paused");
  assert.equal(h.edgeSurface.style.transform, undefined);
  h.document.emit("astro:before-swap");
  assert.equal(h.slot.listeners.get("pointermove").size, 0);
  assert.equal(h.document.listeners.get("pointermove").size, 0);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.slot.listeners.get("pointermove").size, 1);
  assert.equal(h.document.listeners.get("pointermove").size, 1);
  assert.equal(h.media.listeners.get("change").size, 1);
  assert.equal(h.root.dataset.motion, "paused");
  h.media.matches = true;
  h.media.emit("change");
  h.move();
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 85,
    clientY: 25,
  });
  h.tick(4);
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  assert.equal(h.frames.size, 0);
  assert.equal(h.magnet.style.transform, undefined);
  assert.equal(h.edgeSurface.style.transform, undefined);
});
