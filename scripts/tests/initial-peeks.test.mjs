import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../src/design/unique/initial-peeks.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const KEY = "daylight:initials-next-peek";

class Surface {
  listeners = new Map();
  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    options.signal?.addEventListener("abort", () => listeners.delete(listener));
  }
  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type, properties = {}) {
    for (const callback of [...(this.listeners.get(type) ?? [])])
      callback(properties);
  }
  count(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeElement extends Surface {
  dataset = {};
  attributes = new Map();
  children = [];
  parent = undefined;
  textContent = "";
  className = "";
  style = {
    setProperty(name, value) {
      this[name] = value;
    },
  };
  constructor(rect = { width: 150, height: 256 }) {
    super();
    this.rect = rect;
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  closest() {
    return null;
  }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = undefined;
  }
  getBoundingClientRect() {
    const { width, height, left = 0, top = 0 } = this.rect;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };
  }
}

/** A fake page: clock, timers, random, storage, media query and DOM, all
 * under the test's control. `storage` can be shared to simulate a reload. */
/** A rendered text line (what Range#getClientRects reports). */
const line = (left, top, width, height = 24) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

function harness({
  reduced = false,
  compact = false,
  storage = new Map(),
  random = 0,
} = {}) {
  let now = 1_000_000;
  let nextId = 0;
  const timers = new Map();
  const motion = new Surface();
  motion.matches = !reduced;
  const document = new Surface();
  document.hidden = false;
  document.cover = false;
  document.documentElement = {
    hasAttribute: (name) => name === "data-page-cover" && document.cover,
  };
  document.body = new FakeElement();
  document.createElement = () => new FakeElement();
  const compactMedia = new Surface();
  compactMedia.matches = compact;
  const page = {
    obstacles: [],
    horizons: [],
    controls: [],
    media: [],
    lines: [],
  };
  document.querySelectorAll = (selector) => {
    if (selector.includes("h1")) return page.obstacles;
    if (selector.includes("data-peek-horizon")) return page.horizons;
    if (selector.startsWith("a, button")) return page.controls;
    if (selector === "img, video") return page.media;
    return [];
  };
  // Text nodes for the compact rule, each reporting its rendered lines.
  document.createTreeWalker = () => {
    const nodes = page.lines.map((rect) => ({
      textContent: "words",
      parentElement: { closest: () => null },
      rects: [rect],
    }));
    return { nextNode: () => nodes.shift() ?? null };
  };
  document.createRange = () => ({
    selectNodeContents(node) {
      this.node = node;
    },
    getClientRects() {
      return this.node.rects;
    },
  });
  const window = new Surface();
  Object.assign(window, {
    innerWidth: compact ? 390 : 1280,
    innerHeight: compact ? 844 : 800,
    matchMedia: (query) => {
      if (query.includes("pointer: coarse")) {
        assert.match(query, /max-width: 40\.625rem/);
        return compactMedia;
      }
      assert.match(query, /prefers-reduced-motion: no-preference/);
      return motion;
    },
  });
  const context = {
    exports: {},
    window,
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    Math: Object.assign(Object.create(Math), { random: () => random }),
    Date: { now: () => now },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    setTimeout: (callback, ms) => {
      timers.set(++nextId, { at: now + ms, callback });
      return nextId;
    },
    clearTimeout: (id) => timers.delete(id),
    AbortController: class {
      signal = new Surface();
      abort() {
        this.signal.emit("abort");
      }
    },
  };
  vm.runInNewContext(compiled, context);
  const { PEEK, installInitialPeeks } = context.exports;
  installInitialPeeks();

  const advance = (ms) => {
    const until = now + ms;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= until)
        .sort(([, a], [, b]) => a.at - b.at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = Math.max(now, due[1].at);
      due[1].callback();
    }
    now = until;
  };
  const stage = () => document.body.children[0];
  const letter = () => stage()?.children[0];
  return {
    PEEK,
    motion,
    document,
    window,
    page,
    storage,
    timers,
    advance,
    stage,
    letter,
    now: () => now,
  };
}

test("rare: nothing before the first delay, then one peek, then a long cooldown", () => {
  const h = harness();
  const [firstDelay] = h.PEEK.firstDelay;
  h.advance(firstDelay - 1);
  assert.equal(h.stage(), undefined, "too early");
  h.advance(1);
  assert.equal(h.letter().dataset.peek, "in");
  assert.equal(h.stage().attributes.get("aria-hidden"), "true");
  assert.equal(h.letter().textContent, "B", "B shows its bowls...");
  assert.equal(h.stage().dataset.edge, "right", "...from the right");
  assert.equal(h.timers.size, 1, "only the hold runs: one peek at a time");

  const shownAt = h.now();
  const nextAt = shownAt + h.PEEK.cooldown[0];
  assert.equal(Number(h.storage.get(KEY)), nextAt, "cooldown kept for session");
  h.advance(h.PEEK.hold);
  assert.equal(h.letter().dataset.peek, "out", "ducks by itself");
  h.letter().emit("transitionend");
  assert.equal(h.stage(), undefined, "removed once it has gone");
  assert.ok(
    h.PEEK.hold + h.PEEK.exitFallback < 5_000,
    "a peek is brief (WCAG 2.2.2)",
  );

  h.advance(nextAt - h.now() - 1);
  assert.equal(h.stage(), undefined, "cooldown holds");
  h.advance(1);
  assert.equal(h.letter().dataset.peek, "in", "and then it may peek again");
});

test("reduced motion is an off switch, including mid-peek", () => {
  const off = harness({ reduced: true });
  assert.equal(off.timers.size, 0, "nothing scheduled");
  off.advance(60 * 60 * 1000);
  assert.equal(off.stage(), undefined);

  const h = harness();
  h.advance(h.PEEK.firstDelay[0]);
  assert.equal(h.letter().dataset.peek, "in");
  h.motion.matches = false;
  h.motion.emit("change");
  assert.equal(h.stage(), undefined, "removed at once");
  assert.equal(h.timers.size, 0, "and nothing left pending");
  h.advance(60 * 60 * 1000);
  assert.equal(h.stage(), undefined);
  h.motion.matches = true;
  h.motion.emit("change");
  assert.equal(h.timers.size, 1, "motion back on: scheduling resumes");
});

test("never over text: a blocked moment waits and retries without spending the cooldown", () => {
  const h = harness();
  const stored = h.storage.get(KEY);
  const text = new FakeElement({ left: 0, top: 0, width: 1280, height: 800 });
  h.page.obstacles = [text];
  h.advance(h.PEEK.firstDelay[0]);
  assert.equal(h.stage(), undefined, "no room beside the text: no peek");
  assert.equal(h.document.body.children.length, 0, "measuring left nothing");
  assert.equal(h.storage.get(KEY), stored, "cooldown not spent");
  assert.equal(h.timers.size, 1, "a retry is scheduled");

  h.page.obstacles = [
    new FakeElement({ left: 400, top: 0, width: 480, height: 800 }),
  ];
  h.advance(h.PEEK.retry[0]);
  assert.equal(h.letter().dataset.peek, "in", "room at an edge: it peeks");
  const [x] = h.letter().style["--peek-to"].split(" ").map(parseFloat);
  assert.ok(x + 150 * h.PEEK.show <= 400 || x >= 880, "clear of the text");
});

test("calm moments only: scrolling, hidden tabs and page transitions postpone a peek", () => {
  const h = harness();
  h.advance(h.PEEK.firstDelay[0] - 100);
  h.window.emit("scroll");
  h.advance(100);
  assert.equal(h.stage(), undefined, "reader is scrolling");
  h.document.cover = true;
  h.advance(h.PEEK.retry[0]);
  assert.equal(h.stage(), undefined, "page transition in flight");
  h.document.hidden = true;
  h.document.cover = false;
  h.advance(h.PEEK.retry[0]);
  assert.equal(h.stage(), undefined, "tab hidden");
  h.document.hidden = false;
  h.advance(h.PEEK.retry[0]);
  assert.equal(h.letter().dataset.peek, "in", "calm again: it peeks");
});

test("shy: an approaching pointer or a scroll makes it duck", () => {
  const h = harness();
  h.advance(h.PEEK.firstDelay[0]);
  h.document.emit("pointermove", { clientX: 900, clientY: 400 });
  assert.equal(h.letter().dataset.peek, "in", "a distant pointer is ignored");
  const [x, y] = h.letter().style["--peek-to"].split(" ").map(parseFloat);
  h.document.emit("pointermove", { clientX: x - 40, clientY: y + 100 });
  assert.equal(h.letter().dataset.peek, "duck");
  h.advance(h.PEEK.exitFallback);
  assert.equal(h.stage(), undefined, "gone even without transitionend");

  const s = harness();
  s.advance(s.PEEK.firstDelay[0]);
  s.window.emit("scroll");
  assert.equal(s.letter().dataset.peek, "duck");
});

test("Astro navigation cleans up, and remounting keeps the session's cooldown", () => {
  const storage = new Map();
  const h = harness({ storage });
  h.advance(h.PEEK.firstDelay[0]);
  assert.ok(h.stage());
  const nextAt = Number(storage.get(KEY));
  h.document.emit("astro:before-swap");
  assert.equal(h.stage(), undefined, "peek removed with the old page");
  assert.equal(h.timers.size, 0, "no timers survive");
  assert.equal(h.document.count("pointermove"), 0, "listeners released");
  assert.equal(h.window.count("scroll"), 0);
  assert.equal(h.motion.count("change"), 0);

  h.document.emit("astro:page-load");
  h.document.emit("astro:page-load");
  assert.equal(h.document.count("pointermove"), 1, "mounted once");
  assert.equal(h.timers.size, 1, "one scheduler");
  h.advance(nextAt - h.now() - 1);
  assert.equal(h.stage(), undefined, "a new page does not reset the cooldown");
  h.advance(1);
  assert.ok(h.stage());

  // A full reload in the same session reads the stored cooldown too.
  const reload = harness({ storage });
  const stored = Number(storage.get(KEY));
  reload.advance(stored - reload.now() - 1);
  assert.equal(reload.stage(), undefined);
});

test("each letter peeks with the side that reads: J only from the left", () => {
  const h = harness();
  // Only a band at the far left is free of text.
  h.page.obstacles = [
    new FakeElement({ left: 120, top: 0, width: 1160, height: 800 }),
  ];
  h.advance(h.PEEK.firstDelay[0]);
  assert.equal(h.stage().dataset.edge, "left");
  assert.equal(h.letter().textContent, "J", "J's hook comes in from the left");
});

test("phones: sooner, more often, and allowed over pictures but never over a text line", () => {
  const h = harness({ compact: true });
  const { compact } = h.PEEK;
  assert.ok(compact.cooldown[1] < h.PEEK.cooldown[0], "a shorter cooldown");
  assert.ok(
    compact.firstDelay[1] < h.PEEK.firstDelay[0],
    "a sooner first peek",
  );
  // A column of text, with one picture (and no words) between 300 and 560,
  // and a clear line of space under it.
  const lines = [];
  for (let top = 0; top < 844; top += 30)
    if (top + 24 < 300 || top > 580) lines.push(line(20, top, 350));
  h.page.lines = lines;
  const picture = new FakeElement({
    left: 20,
    top: 300,
    width: 350,
    height: 260,
  });
  h.page.media = [picture];
  h.page.controls = [
    new FakeElement({ left: 20, top: 600, width: 120, height: 24 }),
  ];
  h.page.controls[0].textContent = "All projects";

  h.advance(compact.firstDelay[0] - 1);
  assert.equal(h.stage(), undefined);
  h.advance(1);
  assert.equal(
    h.letter()?.dataset.peek,
    "in",
    "the first phone peek comes early",
  );
  // Wherever it chose, its visible part sits over the picture only.
  const { edge } = h.stage().dataset;
  const [x, y] = h.letter().style["--peek-to"].split(" ").map(parseFloat);
  const show = 150 * compact.show;
  const visible = {
    left: { left: 0, right: show, top: y, bottom: y + 256 },
    right: { left: 390 - show, right: 390, top: y, bottom: y + 256 },
    horizon: { left: x, right: x + 150, top: y, bottom: 560 },
  }[edge];
  assert.ok(visible, `a placement over the picture (got ${edge})`);
  if (edge === "horizon")
    assert.equal(h.stage().style["--peek-floor"], "560px", "behind its edge");
  assert.ok(visible.top >= 294 && visible.bottom <= 600, "inside the gap");
  for (const rect of lines)
    assert.ok(
      rect.bottom <= visible.top || rect.top >= visible.bottom,
      "never over a line of text",
    );
  assert.equal(
    Number(h.storage.get(KEY)),
    h.now() + compact.cooldown[0],
    "the phone cooldown applies",
  );

  // The same page on a wide screen keeps pictures off limits.
  const wide = harness();
  wide.page.obstacles = [
    new FakeElement({ left: 0, top: 0, width: 1280, height: 800 }),
  ];
  wide.advance(wide.PEEK.firstDelay[0]);
  assert.equal(wide.stage(), undefined);
});

test("phones: text with no room anywhere still means no peek", () => {
  const h = harness({ compact: true });
  const lines = [];
  for (let top = 0; top < 844; top += 26) lines.push(line(0, top, 390));
  h.page.lines = lines;
  h.advance(h.PEEK.compact.firstDelay[0]);
  assert.equal(h.stage(), undefined);
  assert.equal(h.document.body.children.length, 0);
});
