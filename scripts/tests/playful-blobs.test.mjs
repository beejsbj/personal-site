import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/playful-blobs.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function physics() {
  const context = { exports: {}, Math };
  vm.runInNewContext(compiled, context);
  return context.exports.advancePlayfulBlob;
}

test("toss physics preserves velocity, bounces inside bounds, and settles", () => {
  const step = physics();
  const bounds = { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  let state = {
    x: 44,
    y: 44,
    vx: 900,
    vy: 900,
    targetX: 44,
    targetY: 44,
    tossing: true,
  };
  state = step(state, 1 / 60, bounds);
  assert.equal(state.x, 50);
  assert.equal(state.y, 50);
  assert.ok(state.vx < 0, "right edge reverses horizontal velocity");
  assert.ok(state.vy < 0, "bottom edge reverses vertical velocity");
  for (let index = 0; index < 1800; index++)
    state = step(state, 1 / 60, bounds);
  assert.equal(state.tossing, false, "resting balls stop scheduling physics");
  assert.ok(state.x >= bounds.minX && state.x <= bounds.maxX);
  assert.ok(state.y >= bounds.minY && state.y <= bounds.maxY);
});

test("spring motion moves toward its target without exceeding bounds", () => {
  const step = physics();
  const bounds = { minX: -20, maxX: 20, minY: -20, maxY: 20 };
  let state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 100,
    targetY: -100,
    tossing: false,
  };
  for (let index = 0; index < 300; index++) state = step(state, 1 / 60, bounds);
  assert.equal(state.x, 20);
  assert.equal(state.y, -20);
});

class Surface {
  listeners = new Map();
  dataset = {};
  style = {
    removeProperty(name) {
      delete this[name];
    },
  };
  removeAttribute(name) {
    delete this[name];
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

function harness(matches = true) {
  const document = new Surface();
  document.hidden = false;
  const window = new Surface();
  window.innerWidth = 900;
  window.innerHeight = 650;
  const media = new Surface();
  media.matches = matches;
  const root = new Surface();
  const reset = new Surface();
  const balls = [new Surface(), new Surface(), new Surface(), new Surface()];
  balls.forEach((ball, index) => {
    ball.disabled = true;
    ball.focus = () => {
      document.activeElement = ball;
    };
    ball.getBoundingClientRect = () => ({
      left:
        600 +
        index * 4 +
        Number.parseFloat(
          ball.style.transform?.match(/translate3d\((-?[\d.]+)px/)?.[1] ?? 0,
        ),
      top:
        100 +
        index * 5 +
        Number.parseFloat(
          ball.style.transform?.match(/, (-?[\d.]+)px/)?.[1] ?? 0,
        ),
      width: 60,
      height: 60,
    });
  });
  root.querySelectorAll = (selector) =>
    selector === "[data-playful-blob]" ? balls : [];
  root.querySelector = (selector) =>
    selector === "[data-playful-blobs-reset]" ? reset : null;
  document.querySelector = (selector) =>
    selector === "[data-playful-blobs]" ? root : null;
  const frames = new Map();
  let nextFrame = 0;
  const context = {
    exports: {},
    document,
    window,
    Math,
    AbortController: class {
      signal = new Surface();
      abort() {
        this.signal.emit("abort");
      }
    },
    requestAnimationFrame(callback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  };
  window.matchMedia = (query) => {
    assert.match(query, /pointer: fine/);
    assert.match(query, /prefers-reduced-motion: no-preference/);
    return media;
  };
  vm.runInNewContext(compiled, context);
  context.exports.installPlayfulBlobs();
  let time = 0;
  const tick = (count = 1) => {
    for (let index = 0; index < count; index++) {
      time += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    }
  };
  return { document, window, media, root, balls, reset, frames, tick };
}

test("reduced motion, visibility, and Astro navigation remove animation work", () => {
  const h = harness(false);
  assert.ok(
    h.balls.every((ball) => ball.disabled === undefined),
    "the mounted controller enables the initially inert balls",
  );
  assert.equal(h.root.dataset.motion, "paused");
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 620,
    clientY: 120,
  });
  assert.equal(h.frames.size, 0);
  h.media.matches = true;
  h.media.emit("change");
  h.document.emit("pointermove", {
    pointerType: "mouse",
    clientX: 620,
    clientY: 120,
  });
  h.tick(4);
  assert.match(h.balls[0].style.transform, /translate3d/);
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  assert.equal(h.root.dataset.motion, "paused");
  assert.equal(h.frames.size, 0);
  h.document.emit("astro:before-swap");
  assert.equal(h.document.listeners.get("pointermove").size, 0);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.document.listeners.get("pointermove").size, 1);
});

test("a recent drag keeps its sampled velocity through pointer-up, while cancel does not toss", () => {
  const h = harness();
  const ball = h.balls[0];
  ball.emit("pointerdown", {
    pointerType: "mouse",
    pointerId: 7,
    clientX: 630,
    clientY: 130,
    timeStamp: 10,
    preventDefault() {},
  });
  ball.emit("pointermove", {
    pointerId: 7,
    clientX: 730,
    clientY: 200,
    timeStamp: 30,
  });
  ball.emit("pointerup", {
    pointerId: 7,
    clientX: 730,
    clientY: 200,
    timeStamp: 40,
  });
  assert.ok(h.frames.size > 0, "a velocity-preserving release starts physics");
  const positionAtRelease = ball.style.transform;
  h.tick(2);
  assert.notEqual(
    ball.style.transform,
    positionAtRelease,
    "released ball moves on",
  );
  assert.equal(h.root.dataset.displaced, "true", "a moved ball reveals reset");

  ball.emit("pointerdown", {
    pointerType: "mouse",
    pointerId: 8,
    clientX: 730,
    clientY: 200,
    timeStamp: 60,
    preventDefault() {},
  });
  ball.emit("pointermove", {
    pointerId: 8,
    clientX: 780,
    clientY: 230,
    timeStamp: 70,
  });
  ball.emit("pointercancel", {
    pointerId: 8,
    clientX: 780,
    clientY: 230,
    timeStamp: 80,
  });
  h.tick(3);
  assert.equal(h.frames.size, 0, "a cancelled drag is placed without a toss");
  h.reset.emit("click");
  assert.equal(
    h.document.activeElement,
    ball,
    "reset transfers focus before it hides",
  );
  h.tick(180);
  assert.equal(
    h.root.dataset.displaced,
    "false",
    "visible reset returns the balls",
  );
});
