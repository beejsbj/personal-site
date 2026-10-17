/** One window (issue #28): pulling out of a lens into the prism and stepping
 * back in is one continuous space, not two page loads.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * For every lens, at desktop and phone sizes:
 * - Round trip: let the page run, scroll it, pull out, step back in. The
 *   page is never rebuilt (the same nodes), keeps its scroll, and plays no
 *   entrance. While the prism is open, its own face is the live page itself,
 *   not a reloaded copy in a frame.
 * - Crossing: pull out, turn to the next lens, step in. That lens arrives
 *   settled: no entrance plays, here or on any face.
 * - Faces never play an entrance.
 *
 * Entrances are spotted by what each lens does when it plays one: Daylight's
 * arrival keyframes, Calling Card's `data-enter="in"`, Cut Paper's entering
 * view, Back Page's book coming onto the desk or ink being written in, and
 * Hion's arriving page. Same server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const ALL = ["daylight", "calling-card", "cut-paper", "back-page", "hion"];
const LENSES = (process.env.PRISM_LENSES ?? ALL.join(",")).split(",");
const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};

function chromium() {
  if (process.env.PRISM_CHROMIUM) return process.env.PRISM_CHROMIUM;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return null;
  const found = readdirSync(cache)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map((name) =>
      join(
        cache,
        name,
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
      ),
    )
    .find((path) => existsSync(path));
  return found ?? null;
}

/** Runs in every frame (the page and each face): logs each entrance as it
 * starts. */
function watchEntrances() {
  const DAYLIGHT = new Set([
    "sunrise",
    "wave",
    "land",
    "rise",
    "portrait-in",
    "below-in",
  ]);
  const SIGNS = [
    '.cc-screen[data-enter="in"]',
    '.cp-screen[data-state="entering"]',
    ".bp-book[data-closed]",
    ".bp-page[data-fresh], [data-fresh]",
    '.hion-page[data-state="arriving"]',
  ].join(", ");
  const log = (window.__entrances = []);
  const now = () => performance.timeOrigin + performance.now();
  const lens = () => document.documentElement.dataset.lens;
  document.addEventListener(
    "animationstart",
    (event) => {
      if (DAYLIGHT.has(event.animationName))
        log.push({ at: now(), lens: lens(), what: event.animationName });
    },
    true,
  );
  const check = (node) => {
    if (!(node instanceof Element)) return;
    const hits = node.matches(SIGNS) ? [node] : [];
    hits.push(...node.querySelectorAll(SIGNS));
    for (const hit of hits)
      log.push({
        at: now(),
        lens: lens(),
        what: hit.className.toString().split(" ")[0] || hit.tagName,
      });
  };
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") check(record.target);
      else record.addedNodes.forEach(check);
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-enter", "data-state", "data-closed", "data-fresh"],
  });
}

const now = (page) =>
  page.evaluate(() => performance.timeOrigin + performance.now());
const entrancesSince = (page, since) =>
  page.evaluate(
    (since) => window.__entrances.filter((entry) => entry.at > since),
    since,
  );

/** A high-density desktop, where late paint shows most. */
const HIDPI = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
};

async function arrive(browser, base, lens, size) {
  const context = await browser.newContext({
    ...(SIZES[size] ?? (size === "desktop-2x" ? HIDPI : {})),
  });
  await context.addInitScript(watchEntrances);
  await context.addInitScript((lenses) => {
    try {
      // The lure is already tame and every face is known: revisiting.
      localStorage.setItem("prism:found", "1");
      localStorage.setItem("prism:journey", JSON.stringify(lenses));
    } catch {}
  }, ALL);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/?lens=${lens}`, { waitUntil: "load" });
  if (lens !== "daylight")
    await page.waitForSelector("html[data-shell-ready]", { timeout: 15000 });
  await page.waitForSelector("#prism-lure");
  // let the arrival finish and the page run a while
  await page.waitForTimeout(2600);
  return { context, page, errors };
}

/** Scroll partway: the window, or the lens's own scroller. Returns where. */
function scrollPartway(page) {
  return page.evaluate(() => {
    const range = document.documentElement.scrollHeight - innerHeight;
    if (range > 200) {
      scrollTo({ top: Math.round(range * 0.3), behavior: "instant" });
      return { window: scrollY, inner: null };
    }
    const scroller = [...document.querySelectorAll("#lens-shell *")]
      .filter((el) => {
        const style = getComputedStyle(el);
        return (
          /(auto|scroll)/.test(style.overflowY) &&
          el.scrollHeight - el.clientHeight > 200 &&
          el.clientHeight > 200
        );
      })
      .sort((a, b) => b.clientHeight - a.clientHeight)[0];
    if (!scroller) return { window: scrollY, inner: null };
    scroller.dataset.oneWindowScroller = "";
    scroller.scrollTo({
      top: Math.round((scroller.scrollHeight - scroller.clientHeight) * 0.3),
      behavior: "instant",
    });
    return { window: scrollY, inner: scroller.scrollTop };
  });
}

const where = (page) =>
  page.evaluate(() => ({
    window: scrollY,
    inner:
      document.querySelector("[data-one-window-scroller]")?.scrollTop ?? null,
  }));

/** Tag what is on screen, to tell later whether it was rebuilt. */
const tag = (page) =>
  page.evaluate(() => {
    const lens = document.documentElement.dataset.lens;
    const root =
      lens === "daylight"
        ? document.querySelector(".site-frame")
        : document.getElementById("lens-shell");
    const nodes = [...(root?.querySelectorAll("*") ?? [])]
      .filter((el) => el.checkVisibility())
      .slice(0, 40);
    nodes.forEach((el) => (el.__oneWindow = true));
    return nodes.length;
  });
const kept = (page) =>
  page.evaluate(() => {
    const lens = document.documentElement.dataset.lens;
    const root =
      lens === "daylight"
        ? document.querySelector(".site-frame")
        : document.getElementById("lens-shell");
    return [...(root?.querySelectorAll("*") ?? [])].filter(
      (el) => el.__oneWindow,
    ).length;
  });

/** Wait for the prism, saying where it got stuck if it never comes. */
async function until(page, what, fn) {
  try {
    await page.waitForFunction(fn, null, { timeout: 10000 });
  } catch {
    const state = await page.evaluate(() => {
      const stage = document.getElementById("prism-stage");
      return {
        stage: stage ? { ...stage.dataset } : null,
        lens: document.documentElement.dataset.lens,
        focus: document.activeElement?.className,
      };
    });
    assert.fail(`${what}: ${JSON.stringify(state)}`);
  }
}

async function pullOut(page) {
  await page.click("#prism-lure");
  // the camera's pull plus the HUD's arrival
  await until(
    page,
    "the prism never finished opening",
    () =>
      document.querySelector('#prism-stage[data-outside="true"]') &&
      document.activeElement?.classList.contains("prism-enter") &&
      !document.querySelector("#prism-stage[data-entering]"),
  );
  await page.waitForTimeout(900);
}

async function stepIn(page) {
  await page.click("#prism-stage .prism-enter");
  await until(
    page,
    "the prism never let go",
    () => !document.getElementById("prism-stage"),
  );
  await page.waitForTimeout(1500);
}

/** Every face's entrances, by lens. */
const faceEntrances = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("#prism-stage .prism-face")].map((face) => [
        face.dataset.face,
        face.querySelector("iframe")?.contentWindow?.__entrances ?? [],
      ]),
    ),
  );

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "pulling out and stepping back in is one window",
  { skip, timeout: 20 * 60_000 },
  async (t) => {
    const { chromium: browserType } = await import("playwright-core");
    assert.ok(
      existsSync("dist/client/index.html"),
      "build first: dist/client is missing",
    );
    const server = await serveRuntimeFixture();
    const browser = await browserType.launch({ executablePath: executable });
    try {
      for (const size of Object.keys(SIZES))
        for (const lens of LENSES) {
          await t.test(
            `${size} ${lens}: round trip keeps the page`,
            async () => {
              const { context, page, errors } = await arrive(
                browser,
                server.base,
                lens,
                size,
              );
              try {
                const before = await scrollPartway(page);
                await page.waitForTimeout(600);
                const tagged = await tag(page);
                assert.ok(tagged > 0, "nothing on screen to follow");
                const start = await now(page);
                await pullOut(page);
                const outside = await page.evaluate((lens) => {
                  const face = document.querySelector(
                    `#prism-stage .prism-face[data-face="${lens}"]`,
                  );
                  return {
                    frame: !!face?.querySelector("iframe"),
                    live: getComputedStyle(document.body).transform !== "none",
                  };
                }, lens);
                assert.equal(
                  outside.frame,
                  false,
                  "its face is a reloaded copy in a frame, not the live page",
                );
                assert.ok(outside.live, "the live page is not on its face");
                const faces = await faceEntrances(page);
                for (const [face, list] of Object.entries(faces))
                  assert.deepEqual(
                    list.map((entry) => entry.what),
                    [],
                    `the ${face} face played an entrance`,
                  );
                await page.keyboard.press("Escape");
                await until(
                  page,
                  "Esc never stepped back in",
                  () => !document.getElementById("prism-stage"),
                );
                await page.waitForTimeout(1500);
                const host = await entrancesSince(page, start);
                assert.deepEqual(
                  host.map((entry) => entry.what),
                  [],
                  "stepping back in replayed an entrance",
                );
                assert.equal(
                  await kept(page),
                  tagged,
                  "stepping back in rebuilt the page",
                );
                assert.deepEqual(await where(page), before, "scroll moved");
                assert.deepEqual(errors, []);
              } finally {
                await context.close();
              }
            },
          );

          const next = ALL[(ALL.indexOf(lens) + 1) % ALL.length];
          await t.test(
            `${size} ${lens} → ${next}: arrives settled`,
            async () => {
              const { context, page, errors } = await arrive(
                browser,
                server.base,
                lens,
                size,
              );
              try {
                await pullOut(page);
                await page.keyboard.press("ArrowRight");
                await page.waitForTimeout(300);
                await until(
                  page,
                  "the prism never finished turning",
                  () =>
                    !document
                      .querySelector("#prism-stage .prism-body")
                      ?.getAnimations().length,
                );
                await page.waitForTimeout(600);
                const start = await now(page);
                await stepIn(page);
                assert.equal(
                  await page.evaluate(
                    () => document.documentElement.dataset.lens,
                  ),
                  next,
                );
                const host = await entrancesSince(page, start);
                assert.deepEqual(
                  host.map((entry) => entry.what),
                  [],
                  `${next} played its entrance coming in from the prism`,
                );
                assert.deepEqual(errors, []);
              } finally {
                await context.close();
              }
            },
          );
        }
    } finally {
      await browser.close();
      await server.close();
    }
  },
);

/** Turning the prism once all the way round, how often the compositor drew
 * a face with tiles it hadn't painted yet ("checkerboard": blank, then
 * filled in, the pop-in Burooj saw). Faces turned away used to be culled,
 * so they lost their tiles and were painted late as they came round. */
async function lateTiles(browser, base, lens, size) {
  const { context, page, errors } = await arrive(browser, base, lens, size);
  try {
    await pullOut(page);
    await browser.startTracing(page, { categories: ["cc"] });
    for (let i = 0; i < ALL.length; i += 1) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      await until(
        page,
        "the prism never finished turning",
        () =>
          !document.querySelector("#prism-stage .prism-body")?.getAnimations()
            .length,
      );
      await page.waitForTimeout(400);
    }
    const trace = JSON.parse((await browser.stopTracing()).toString());
    const events = trace.traceEvents ?? trace;
    assert.deepEqual(errors, []);
    return events.filter(
      (event) => event.name === "PictureLayerImpl::AppendQuads checkerboard",
    ).length;
  } finally {
    await context.close();
  }
}

/** Late-tile draws in a full turn, measured in headless Chromium (software
 * compositing, so far slower to paint than a real GPU): with faces culled,
 * 18 to 154; shaded instead, 0 to 12. */
const LATE_TILES = 16;

test(
  "turning the prism paints no face late",
  { skip, timeout: 20 * 60_000 },
  async (t) => {
    const { chromium: browserType } = await import("playwright-core");
    const server = await serveRuntimeFixture();
    const browser = await browserType.launch({ executablePath: executable });
    try {
      for (const size of [...Object.keys(SIZES), "desktop-2x"])
        for (const lens of size === "desktop-2x" ? ["daylight"] : LENSES)
          await t.test(`${size} ${lens}: a full turn`, async () => {
            const late = await lateTiles(browser, server.base, lens, size);
            assert.ok(
              late <= LATE_TILES,
              `${late} draws with faces painted late (at most ${LATE_TILES})`,
            );
          });
    } finally {
      await browser.close();
      await server.close();
    }
  },
);

/** Listens to every AudioContext's output and counts every note struck. */
function earsOn() {
  const connect = AudioNode.prototype.connect;
  window.__ears = [];
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode) {
      const ear = this.context.createAnalyser();
      ear.fftSize = 2048;
      connect.call(this, ear);
      window.__ears.push(ear);
    }
    return connect.call(this, target, ...rest);
  };
  window.__strikes = [];
  const start = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (...args) {
    window.__strikes.push(performance.now());
    return start.apply(this, args);
  };
  window.__peak = () => {
    const buffer = new Float32Array(2048);
    let peak = 0;
    for (const ear of window.__ears) {
      ear.getFloatTimeDomainData(buffer);
      for (const v of buffer) peak = Math.max(peak, Math.abs(v));
    }
    return peak;
  };
}

test(
  "Cut Paper plays on unheard in the prism, and is heard again stepping back in",
  {
    skip: skip || (LENSES.includes("cut-paper") ? false : "no cut-paper"),
    timeout: 5 * 60_000,
  },
  async () => {
    const { chromium: browserType } = await import("playwright-core");
    const server = await serveRuntimeFixture();
    const browser = await browserType.launch({ executablePath: executable });
    try {
      const context = await browser.newContext({ ...SIZES.desktop });
      await context.addInitScript((all) => {
        try {
          localStorage.setItem("prism:found", "1");
          localStorage.setItem("prism:journey", JSON.stringify(all));
        } catch {}
      }, ALL);
      await context.addInitScript(earsOn);
      const page = await context.newPage();
      await page.goto(`${server.base}/?lens=cut-paper`);
      await page.waitForSelector("html[data-shell-ready]");
      await page.waitForTimeout(1200);
      await page.click(".cp-sound");
      await page.click(".cp-tp--play");
      await page.waitForTimeout(1500);
      const loudness = async () => {
        let peak = 0;
        for (let i = 0; i < 8; i += 1) {
          peak = Math.max(peak, await page.evaluate(() => window.__peak()));
          await page.waitForTimeout(60);
        }
        return peak;
      };
      const where = () =>
        page.evaluate(() =>
          document
            .querySelector(".cp-pos__num")
            .textContent.split(".")
            .map(Number),
        );
      const later = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || 0;
      assert.ok(
        (await loudness()) > 0.01,
        "the session is heard to begin with",
      );

      await pullOut(page);
      const onFace = await where();
      assert.ok((await loudness()) < 0.001, "heard on its face of the prism");
      await page.waitForTimeout(800);
      const stillOnFace = await where();
      assert.ok(
        later(stillOnFace, onFace) > 0,
        `the playhead stopped on the face (${onFace} → ${stillOnFace})`,
      );
      assert.ok(
        await page.evaluate(() =>
          document.querySelector(".cp-app").hasAttribute("data-playing"),
        ),
      );

      await page.keyboard.press("Escape");
      await until(
        page,
        "Esc never stepped back in",
        () => !document.getElementById("prism-stage"),
      );
      const stepped = await page.evaluate(() => performance.now());
      const back = await where();
      assert.ok(
        later(back, stillOnFace) >= 0,
        `the playhead went back (${stillOnFace} → ${back})`,
      );
      assert.ok((await loudness()) > 0.01, "not heard again stepping back in");
      await page.waitForTimeout(300);
      const struck = await page.evaluate(
        (t) => window.__strikes.filter((at) => at > t && at < t + 300).length,
        stepped,
      );
      // a held chord and bass at most, not the notes the hush passed over
      assert.ok(struck <= 6, `${struck} notes struck on stepping back in`);
      await context.close();
    } finally {
      await browser.close();
      await server.close();
    }
  },
);
