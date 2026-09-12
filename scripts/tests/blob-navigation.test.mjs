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
  const media = new Surface();
  media.matches = matches;
  const link = new Surface();
  const label = new Surface();
  const magnet = new Surface();
  const slot = new Surface();
  const toggle = new Surface();
  const root = new Surface();
  slot.querySelector = (selector) =>
    ({ a: link, ".blob-nav__label": label, ".blob-nav__magnet": magnet })[
      selector
    ];
  slot.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  root.querySelector = () => toggle;
  root.querySelectorAll = () => [slot];
  document.querySelectorAll = () => [root];
  const frames = new Map();
  let nextFrame = 0;
  let now = 0;
  const context = {
    exports: {},
    document,
    window: { matchMedia: () => media },
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
    toggle,
    root,
    frames,
    tick,
    move,
  };
}

test("blob enhancement leaves reduced-motion and touch navigation stationary", () => {
  const h = harness(false);
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.toggle.hidden, true);
  h.move();
  h.slot.emit("pointerleave");
  assert.equal(h.frames.size, 0);
  h.media.matches = true;
  h.media.emit("change");
  h.slot.emit("pointermove", {
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

test("pause, preference changes and Astro navigation reset motion and listeners safely", () => {
  const h = harness();
  h.move();
  h.tick(4);
  h.toggle.emit("click");
  assert.equal(h.frames.size, 0);
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.toggle.attributes["aria-pressed"], "true");
  h.document.emit("astro:before-swap");
  assert.equal(h.slot.listeners.get("pointermove").size, 0);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.slot.listeners.get("pointermove").size, 1);
  assert.equal(
    h.root.dataset.motion,
    "paused",
    "user preference persists across navigation",
  );
  h.toggle.emit("click");
  h.move();
  h.tick(4);
  h.media.matches = false;
  h.media.emit("change");
  assert.equal(h.frames.size, 0);
  assert.equal(h.magnet.style.transform, undefined);
  assert.equal(h.toggle.hidden, true);
});
