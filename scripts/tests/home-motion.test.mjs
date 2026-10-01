import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/home-motion.ts", import.meta.url),
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
  attributes = new Map();
  style = {
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  };
  constructor(rect = { left: 0, top: 0, width: 100, height: 100 }) {
    this.rect = rect;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
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

function harness({ matches = true, reduced = false } = {}) {
  const document = new Surface();
  document.hidden = false;
  const pointerMedia = new Surface();
  pointerMedia.matches = matches && !reduced;
  const motionMedia = new Surface();
  motionMedia.matches = !reduced;
  const root = new Surface();
  const scene = new Surface();
  const portrait = new Surface({
    left: 100,
    top: 100,
    width: 200,
    height: 200,
  });
  const art = new Surface({ left: 600, top: 100, width: 200, height: 200 });
  const blobs = [new Surface(), new Surface(), new Surface(), new Surface()];
  const above = new Surface({ left: 0, top: 300, width: 100, height: 100 });
  const belowA = new Surface({ left: 0, top: 1200, width: 100, height: 100 });
  const belowB = new Surface({ left: 0, top: 1400, width: 100, height: 100 });
  const targets = [above, belowA, belowB];
  scene.querySelector = (selector) =>
    ({ "figure img": portrait, "[data-blob-art]": art })[selector] ?? null;
  art.querySelectorAll = (selector) => (selector === "g" ? blobs : []);
  root.querySelector = (selector) =>
    selector === "[data-motion-scene]" ? scene : null;
  root.querySelectorAll = (selector) =>
    selector.includes(".project-row") ? targets : [];
  document.querySelectorAll = (selector) =>
    selector === "[data-home-motion]" ? [root] : [];
  const frames = new Map();
  let nextFrame = 0;
  const observers = [];
  class IntersectionObserver {
    observed = new Set();
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      observers.push(this);
    }
    observe(element) {
      this.observed.add(element);
    }
    unobserve(element) {
      this.observed.delete(element);
    }
    disconnect() {
      this.observed.clear();
      this.disconnected = true;
    }
    enter(...elements) {
      this.callback(
        elements.map((target) => ({ target, isIntersecting: true })),
        this,
      );
    }
  }
  const context = {
    exports: {},
    document,
    IntersectionObserver,
    window: {
      innerHeight: 800,
      matchMedia: (query) => {
        assert.match(query, /prefers-reduced-motion: no-preference/);
        if (query.includes("hover: hover")) {
          assert.match(query, /pointer: fine/);
          return pointerMedia;
        }
        return motionMedia;
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
  context.exports.installHomeMotion();
  const tick = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(16));
  };
  const move = (properties = {}) =>
    scene.emit("pointermove", {
      pointerType: "mouse",
      clientX: 260,
      clientY: 140,
      ...properties,
    });
  return {
    document,
    pointerMedia,
    motionMedia,
    scene,
    portrait,
    blobs,
    frames,
    observers,
    targets: { above, belowA, belowB },
    tick,
    move,
  };
}

test("on-screen content is never hidden; off-screen content reveals once, staggered per batch", () => {
  const h = harness();
  const { above, belowA, belowB } = h.targets;
  assert.ok(above.hasAttribute("data-reveal"));
  assert.ok(above.hasAttribute("data-in"), "visible at load: shown at once");
  assert.ok(belowA.hasAttribute("data-reveal"));
  assert.equal(belowA.hasAttribute("data-in"), false);
  const [observer] = h.observers;
  assert.equal(observer.observed.size, 2);
  observer.enter(belowA, belowB);
  assert.ok(belowA.hasAttribute("data-in"));
  assert.ok(belowB.hasAttribute("data-in"));
  assert.equal(belowA.style["--i"], "0");
  assert.equal(belowB.style["--i"], "1");
  assert.equal(observer.observed.size, 0, "revealed once, then unobserved");
});

test("reduced motion marks nothing, so no content can be hidden", () => {
  const h = harness({ reduced: true });
  for (const element of Object.values(h.targets)) {
    assert.equal(element.hasAttribute("data-reveal"), false);
  }
  assert.equal(h.observers.length, 0);
  assert.equal(h.scene.dataset.motion, "paused");
  h.move();
  assert.equal(h.frames.size, 0);
});

test("a nearby fine pointer tilts the portrait and nudges the circles in one frame, then settles", () => {
  const h = harness();
  assert.equal(h.scene.dataset.motion, "running");
  h.move();
  h.move({ clientX: 280 });
  assert.equal(h.frames.size, 1, "pointer events coalesce into one frame");
  h.tick();
  assert.match(h.portrait.style["--tilt-y"], /deg$/);
  assert.notEqual(h.portrait.style["--tilt-y"], "0.00deg");
  assert.equal(h.frames.size, 0, "no idle loop after applying");
  h.move({ clientX: 650, clientY: 150 });
  h.tick();
  assert.match(h.blobs[0].style.transform, /translate\(/);
  assert.equal(h.portrait.style["--tilt-y"], "0.00deg", "out of reach: level");
  h.scene.emit("pointerleave");
  assert.equal(h.portrait.style["--tilt-x"], undefined);
  assert.equal(h.blobs[0].style.transform, undefined);
  assert.equal(h.frames.size, 0);
});

test("touch, hidden tabs and preference changes reset the scene", () => {
  const h = harness();
  h.move();
  h.tick();
  h.move({ pointerType: "touch" });
  assert.equal(h.portrait.style["--tilt-x"], undefined);
  assert.equal(h.frames.size, 0);
  h.move();
  h.tick();
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  assert.equal(h.scene.dataset.motion, "paused");
  assert.equal(h.portrait.style["--tilt-x"], undefined);
  h.document.hidden = false;
  h.document.emit("visibilitychange");
  h.move();
  h.tick();
  h.pointerMedia.matches = false;
  h.pointerMedia.emit("change");
  assert.equal(h.scene.dataset.motion, "paused");
  assert.equal(h.blobs[1].style.transform, undefined);
  h.move();
  assert.equal(h.frames.size, 0);
});

test("Astro navigation disconnects observers, clears marks and remounts singly", () => {
  const h = harness();
  h.move();
  h.tick();
  h.document.emit("astro:before-swap");
  assert.ok(h.observers[0].disconnected);
  for (const element of Object.values(h.targets)) {
    assert.equal(element.hasAttribute("data-reveal"), false);
    assert.equal(element.hasAttribute("data-in"), false);
  }
  assert.equal(h.portrait.style["--tilt-x"], undefined);
  assert.equal(h.scene.listeners.get("pointermove").size, 0);
  assert.equal(h.pointerMedia.listeners.get("change").size, 0);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.scene.listeners.get("pointermove").size, 1);
  assert.equal(h.scene.listeners.get("pointerleave").size, 1);
  assert.equal(h.document.listeners.get("visibilitychange").size, 1);
  assert.equal(h.observers.length, 3);
  assert.ok(h.targets.above.hasAttribute("data-in"));
  h.move();
  h.tick();
  assert.match(h.portrait.style["--tilt-y"], /deg$/);
});
