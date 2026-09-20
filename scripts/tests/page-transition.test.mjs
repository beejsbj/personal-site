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
const specimen = readFileSync(
  new URL("../../src/design/unique/PageTransition.astro", import.meta.url),
  "utf8",
);

class Surface {
  listeners = new Map();
  dataset = {};
  style = {
    properties: new Map(),
    setProperty: (name, value) => this.style.properties.set(name, value),
    getPropertyValue: (name) => this.style.properties.get(name) ?? "",
  };
  offsetWidth = 1;
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
  overlay.querySelector = (selector) =>
    selector === ".page-transition__orb"
      ? { getBoundingClientRect: () => ({ width: 50 }) }
      : null;
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
      innerWidth: 1000,
      innerHeight: 600,
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
          "--page-transition-travel": "0.5s",
          "--page-transition-grow": "0.3s",
          "--page-transition-reveal": "0.3s",
          "--page-transition-orb-size": "3.125rem",
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
  const navigation = (loader = async () => {}, sourceElement) => {
    const signal = new Surface();
    return { loader, signal, sourceElement };
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

test("the traveling circle starts at the clicked link, covers after travel plus growth, then reveals", async () => {
  const h = harness();
  h.install();
  let loaderCalls = 0;
  const navigation = h.navigation(
    async () => {
      loaderCalls += 1;
    },
    {
      getBoundingClientRect: () => ({
        left: 100,
        top: 300,
        width: 80,
        height: 40,
      }),
    },
  );

  h.document.emit("astro:before-preparation", navigation);
  assert.equal(h.overlay.dataset.state, "covering");
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-x"),
    "140px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-y"),
    "320px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-travel-x"),
    "360px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-travel-y"),
    "-20px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-cover-scale"),
    `${Math.hypot(1000, 600) / 50}`,
  );
  const settled = navigation.loader();
  assert.equal(loaderCalls, 1, "the incoming document starts loading at once");
  assert.equal(h.timerCount(), 2);
  h.runTimers(800);
  await settled;

  h.document.emit("astro:after-swap");
  assert.equal(h.overlay.dataset.state, "revealing");
  h.runTimers(299);
  assert.equal(h.overlay.dataset.state, "revealing");
  h.runTimers(300);
  assert.equal(h.overlay.dataset.state, "idle");
});

test("history navigation begins in the viewport center and trigger origins stay visible", () => {
  const h = harness();
  h.install();
  h.document.emit("astro:before-preparation", h.navigation());
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-x"),
    "500px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-y"),
    "300px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-travel-x"),
    "0px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-travel-y"),
    "0px",
  );

  h.document.emit(
    "astro:before-preparation",
    h.navigation(async () => {}, {
      getBoundingClientRect: () => ({
        left: -30,
        top: 590,
        width: 10,
        height: 40,
      }),
    }),
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-x"),
    "0px",
  );
  assert.equal(
    h.overlay.style.getPropertyValue("--page-transition-origin-y"),
    "600px",
  );
});

test("a stalled fetch and a window pagehide cannot leave the page covered", () => {
  const h = harness();
  h.install();
  h.document.emit(
    "astro:before-preparation",
    h.navigation(() => new Promise(() => {})),
  );
  h.runTimers(800);
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

test("the persistent specimen keeps the PHP circle choreography and removes PE strips", () => {
  assert.match(specimen, /page-transition__traveler/);
  assert.match(specimen, /page-transition__orb/);
  assert.match(specimen, /--page-transition-travel/);
  assert.match(specimen, /--page-transition-grow/);
  assert.match(specimen, /--page-transition-reveal/);
  assert.match(specimen, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(specimen, /stripe|rainbow|page-transition-red/);
});
