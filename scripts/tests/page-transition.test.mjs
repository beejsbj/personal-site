import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = readFileSync(
  new URL(
    "../../src/design/unique/default-page-transition.ts",
    import.meta.url,
  ),
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
  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    options.signal?.addEventListener("abort", () => listeners.delete(listener));
  }
  emit(type, event = {}) {
    event.type ??= type;
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }
}

function harness() {
  const document = new Surface();
  document.documentElement = { dataset: { theme: "default" } };
  const overlay = new Surface();
  overlay.dataset.state = "idle";
  overlay.children = Array.from({ length: 14 });
  document.querySelector = (selector) =>
    selector === '[data-page-transition="default"]' ? overlay : null;
  const motion = new Surface();
  motion.matches = false;
  const timers = new Map();
  let nextTimer = 0;
  const context = {
    exports: {},
    document,
    window: Object.assign(new Surface(), {
      matchMedia: (query) => {
        assert.equal(query, "(prefers-reduced-motion: reduce)");
        return motion;
      },
    }),
    AbortController: class {
      signal = new Surface();
      abort() {
        this.signal.emit("abort");
      }
    },
    setTimeout: (callback, duration) => {
      timers.set(++nextTimer, { callback, duration });
      return nextTimer;
    },
    clearTimeout: (timer) => timers.delete(timer),
    getComputedStyle: () => ({
      getPropertyValue: (name) =>
        ({
          "--page-transition-sweep": "0.28s",
          "--page-transition-stagger": "0.012s",
        })[name] ?? "",
    }),
  };
  vm.runInNewContext(compiled, context);
  const install = context.exports.installDefaultPageTransition;
  const timerCount = () => timers.size;
  const runTimers = (maxDuration = Infinity) => {
    for (const [id, { callback, duration }] of [...timers]) {
      if (duration > maxDuration) continue;
      timers.delete(id);
      callback();
    }
  };
  const navigation = (loader = async () => {}) => {
    const signal = new Surface();
    return { loader, signal };
  };
  return {
    document,
    window: context.window,
    overlay,
    motion,
    install,
    navigation,
    runTimers,
    timerCount,
  };
}

test("the strip cover fetches concurrently, then exposes the swapped page", async () => {
  const h = harness();
  h.install();
  let loaderCalls = 0;
  const navigation = h.navigation(async () => {
    loaderCalls += 1;
  });

  h.document.emit("astro:before-preparation", navigation);
  assert.equal(h.overlay.dataset.state, "covering");
  const settled = navigation.loader();
  assert.equal(loaderCalls, 1, "the incoming document starts loading at once");
  assert.equal(h.timerCount(), 2);
  h.runTimers(436);
  await settled;

  h.document.emit("astro:after-swap");
  assert.equal(h.overlay.dataset.state, "revealing");
  h.runTimers();
  assert.equal(h.overlay.dataset.state, "idle");
});

test("a stalled fetch and a window pagehide cannot leave the page covered", () => {
  const h = harness();
  h.install();
  h.document.emit(
    "astro:before-preparation",
    h.navigation(() => new Promise(() => {})),
  );
  h.runTimers(436);
  assert.equal(h.overlay.dataset.state, "covering");
  h.runTimers(5000);
  assert.equal(h.overlay.dataset.state, "idle");
  assert.equal(h.timerCount(), 0);

  h.document.emit("astro:before-preparation", h.navigation());
  h.window.emit("pagehide");
  assert.equal(h.overlay.dataset.state, "idle");
  assert.equal(h.timerCount(), 0);
});

test("aborts, failed loads, and rapid replacement leave no covering overlay", async () => {
  const h = harness();
  h.install();
  const first = h.navigation();
  h.document.emit("astro:before-preparation", first);
  assert.equal(h.overlay.dataset.state, "covering");
  first.signal.emit("abort");
  assert.equal(h.overlay.dataset.state, "idle");
  assert.equal(h.timerCount(), 0);

  const failure = h.navigation(async () => {
    throw new Error("network failure");
  });
  h.document.emit("astro:before-preparation", failure);
  h.runTimers();
  await assert.rejects(failure.loader(), /network failure/);
  assert.equal(h.overlay.dataset.state, "idle");

  const oldNavigation = h.navigation();
  const newNavigation = h.navigation();
  h.document.emit("astro:before-preparation", oldNavigation);
  h.document.emit("astro:before-preparation", newNavigation);
  assert.equal(h.overlay.dataset.state, "covering");
  h.runTimers();
  h.document.emit("astro:after-swap");
  h.runTimers();
  assert.equal(h.overlay.dataset.state, "idle");
  assert.equal(h.timerCount(), 0);
});

test("live reduced motion and repeated Astro mounting remain safe", async () => {
  const h = harness();
  h.install();
  h.install();
  assert.equal(h.document.listeners.get("astro:before-preparation").size, 1);
  assert.equal(h.document.listeners.get("astro:after-swap").size, 1);
  assert.equal(h.motion.listeners.get("change").size, 1);

  const navigation = h.navigation();
  h.document.emit("astro:before-preparation", navigation);
  assert.equal(h.overlay.dataset.state, "covering");
  h.motion.matches = true;
  h.motion.emit("change");
  assert.equal(h.overlay.dataset.state, "idle");
  assert.equal(h.timerCount(), 0);
  await navigation.loader();

  const reducedNavigation = h.navigation();
  h.document.emit("astro:before-preparation", reducedNavigation);
  await reducedNavigation.loader();
  assert.equal(h.overlay.dataset.state, "idle");
});
