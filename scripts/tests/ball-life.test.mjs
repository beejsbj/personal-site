import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/ball-life.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const PAINT = new Set(["--face-x", "--face-y", "--face-sx", "--face-sy"]);

class Surface {
  listeners = new Map();
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
  count(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

/** A ball link. Its style records every write, so a test can prove the
 * runtime only ever touches the painted layer's custom properties. */
class Ball extends Surface {
  dataset = {};
  writes = [];
  constructor(href, left) {
    super();
    this.href = href;
    this.rect = { left, top: 0, width: 80, height: 80 };
    const values = {};
    const writes = this.writes;
    this.style = new Proxy(values, {
      get(target, name) {
        if (name === "setProperty")
          return (key, value) => {
            writes.push(key);
            target[key] = value;
          };
        if (name === "removeProperty") return (key) => delete target[key];
        return target[name];
      },
      set(target, name, value) {
        writes.push(String(name));
        target[name] = value;
        return true;
      },
    });
  }
  getBoundingClientRect() {
    const { left, top, width, height } = this.rect;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };
  }
  closest(selector) {
    return selector === "[data-ball]" ? this : null;
  }
  matches() {
    return true;
  }
  value(name) {
    return Number.parseFloat(this.style[name] ?? "NaN");
  }
}

function harness({ reduced = false, form = "cluster" } = {}) {
  const motion = new Surface();
  motion.matches = !reduced;
  const fine = new Surface();
  fine.matches = true;
  const wide = new Surface();
  wide.matches = true;
  const balls = [
    new Ball("/", 0),
    new Ball("/lab", 90),
    new Ball("/about", 400),
  ];
  const nav = new Surface();
  nav.dataset = { form };
  nav.querySelectorAll = () => balls;
  nav.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 480,
    height: 80,
  });
  const document = new Surface();
  document.hidden = false;
  document.querySelectorAll = (selector) =>
    selector === "[data-ball-nav]" ? [nav] : [];
  const window = new Surface();
  window.matchMedia = (query) => {
    if (query.includes("prefers-reduced-motion")) return motion;
    if (query.includes("pointer: fine")) return fine;
    assert.match(query, /min-width/);
    return wide;
  };
  const frames = new Map();
  let nextFrame = 0;
  let clock = 0;
  const context = {
    exports: {},
    window,
    document,
    performance: { now: () => clock },
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    AbortController: class {
      signal = new Surface();
      abort() {
        this.signal.emit("abort");
      }
    },
  };
  vm.runInNewContext(compiled, context);
  context.exports.installBallLife();
  let time = 1000;
  const tick = (count = 1) => {
    for (let i = 0; i < count && frames.size; i++) {
      time += 16;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    }
  };
  const settle = () => {
    let guard = 0;
    while (frames.size && guard++ < 2000) tick();
    return guard;
  };
  let stamp = 0;
  const move = (ball, x, y, extra = {}) =>
    nav.emit("pointermove", {
      target: ball,
      clientX: x,
      clientY: y,
      pointerType: "mouse",
      timeStamp: (stamp += 16),
      ...extra,
    });
  return { motion, nav, document, balls, frames, tick, settle, move };
}

test("only paint moves: nothing but --face-* properties is ever written", () => {
  const h = harness();
  const [home, lab] = h.balls;
  h.nav.emit("pointerenter", { pointerType: "mouse" });
  h.move(home, 70, 30);
  h.move(lab, 140, 40);
  h.move(lab, 400, 40); // a fast swipe
  h.tick(10);
  h.nav.emit("pointerdown", { target: lab, button: 0, pointerType: "mouse" });
  h.tick(5);
  h.document.emit("pointerup", {});
  h.settle();
  for (const ball of h.balls) {
    const touched = new Set(ball.writes);
    assert.ok(touched.size > 0, `${ball.href} came alive`);
    for (const name of touched)
      assert.ok(PAINT.has(name), `${ball.href} wrote ${name}: paint only`);
  }
  assert.doesNotMatch(source, /setPointerCapture|dragstart|preventDefault/);
});

test("hover leans the face toward the cursor, neighbours jostle aside, then it parks", () => {
  const h = harness();
  const [home, lab, about] = h.balls;
  h.nav.emit("pointerenter", { pointerType: "mouse" });
  h.move(home, 75, 40); // right edge of Home
  h.tick(40);
  assert.ok(home.value("--face-x") > 2, "Home leans toward the cursor");
  assert.ok(home.value("--face-sx") > 1, "and swells");
  assert.ok(lab.value("--face-x") > 1, "its neighbour Lab jostles away");
  assert.equal(about.dataset.alive, "", "far balls wake but stay home");
  assert.ok(Math.abs(about.value("--face-x")) < 0.05);
  const frames = h.settle();
  assert.ok(frames < 2000, "the loop parks when the springs settle");
  assert.equal(h.frames.size, 0, "no idle frames");

  h.nav.emit("pointerleave", {});
  h.settle();
  for (const ball of h.balls) {
    assert.equal(ball.dataset.alive, undefined, `${ball.href} handed back`);
    assert.equal(ball.style["--face-x"], undefined);
  }
});

test("press squashes and release bounces past full size, touch included", () => {
  const h = harness({ form: "row" });
  const [, lab] = h.balls;
  h.nav.emit("pointerdown", { target: lab, button: 0, pointerType: "touch" });
  h.tick(30);
  assert.ok(lab.value("--face-sx") < 0.95, "squashed while pressed");
  h.document.emit("pointerup", {});
  let peak = 0;
  for (let i = 0; i < 40; i++) {
    h.tick();
    const scale = lab.value("--face-sx");
    if (Number.isFinite(scale)) peak = Math.max(peak, scale);
  }
  // A plain under-damped return from the squash peaks near 1.03; the
  // release kick is what makes it bounce.
  assert.ok(peak > 1.045, `bounces past full size (peak ${peak.toFixed(3)})`);
  h.settle();
  assert.equal(lab.dataset.alive, undefined, "and comes to rest");
  // Touch never leans or jostles: a touch move is ignored.
  h.move(lab, 130, 40, { pointerType: "touch" });
  assert.equal(h.frames.size, 0);
});

test("reduced motion: still balls, nothing runs", () => {
  const h = harness({ reduced: true });
  const [home] = h.balls;
  h.move(home, 70, 30);
  h.nav.emit("pointerdown", { target: home, button: 0, pointerType: "mouse" });
  h.document.emit("pointerup", {});
  assert.equal(h.frames.size, 0);
  for (const ball of h.balls) {
    assert.equal(ball.dataset.alive, undefined);
    assert.equal(ball.writes.length, 0);
  }

  const live = harness();
  live.move(live.balls[0], 70, 30);
  live.tick(3);
  live.motion.matches = false;
  live.motion.emit("change");
  assert.equal(live.frames.size, 0, "switching to reduce stops at once");
  assert.equal(live.balls[0].dataset.alive, undefined, "and rests the faces");
});

test("Astro navigation releases everything and remounts once", () => {
  const h = harness();
  h.move(h.balls[0], 70, 30);
  h.tick(3);
  h.document.emit("astro:before-swap");
  assert.equal(h.frames.size, 0);
  assert.equal(h.nav.count("pointermove"), 0);
  assert.equal(h.document.count("pointerup"), 0);
  assert.equal(h.balls[0].dataset.alive, undefined);
  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.nav.count("pointermove"), 1);
  assert.equal(h.nav.count("pointerdown"), 1);
});
