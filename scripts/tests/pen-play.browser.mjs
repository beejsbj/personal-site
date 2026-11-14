/** A played Pen shows its result, at a size you can see, in every lens
 * (issue #166). CodePen's embed draws its tabs above the result and its
 * toolbar below it whatever its address asks, so the stage frames a Pen
 * a little larger than the room it shows it in, and the room shows the
 * result alone. A Pen held small (a card on the Lab, a pin, a rack slot, a
 * line of the library card, a stitched place) opens, when
 * pressed, in a window of its own over the page, in the lens's own idiom,
 * at its full size from the press: no larger once it has loaded, and
 * nothing under it moves. Escape puts it away. With less motion asked for,
 * it opens without moving. In Back Page the window is the sticky note,
 * unfolded where it was stuck. A Pen on an experiment's page already spans
 * its column, and a Labbook's stands as a figure in its entry: each plays
 * where it is, showing its result alone.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on fixtures: Daylight's own fixture pages, each lens in the harness
 * (lab-kinds, labbook, lab-blocks). BASE=<origin> runs it against a server
 * already up; LAB_ONLY=<regexp> runs the subtests whose names match. Every
 * request to another site is answered with a stub page, held back while a
 * test watches the piece loading. Same server and Chromium as
 * prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ONLY = process.env.LAB_ONLY && new RegExp(process.env.LAB_ONLY);
const LENSES = ["daylight", "calling-card", "cut-paper", "back-page", "hion"];
const harness = (lens, fixture, route) =>
  `/prism/harness?lens=${lens}&fixture=${fixture}&route=${encodeURIComponent(route)}`;
/** Where each lens shows the Lab, the Labbook and an experiment's page. */
const ROOMS = {
  list: (lens) =>
    lens === "daylight"
      ? "/prism/fixtures/lab?fixture=kinds"
      : harness(lens, "lab-kinds", "/lab"),
  labbook: (lens) =>
    lens === "daylight"
      ? "/prism/fixtures/lab?fixture=preview"
      : harness(lens, "labbook", "/lab"),
  blocks: (lens) =>
    lens === "daylight"
      ? "/prism/fixtures/lab/fixture-blocks"
      : harness(lens, "lab-blocks", "/lab/fixture-blocks"),
};
/** The Pens on the Lab, one in each place. */
const CARDS = ["fixture-kinds-pen", "fixture-kinds-shelf-pen"];
const BOOK_PEN = "u-fixture-replay";
/** CodePen's embed, measured: a 1px border round a 50px bar of tabs above
 * the result and a 30px toolbar below it. */
const CHROME = { top: 51, right: 1, bottom: 31, left: 1 };
/** Big enough to see the piece: at least this on a desktop; on a phone,
 * the screen's width but for a margin either side. */
const LEAST = { width: 320, height: 240 };
const MARGIN = 24;

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "a played Pen shows its result, at a size you can see",
  { skip, timeout: 20 * 60_000 },
  async (suite) => {
    const t = {
      test: (name, fn) =>
        suite.test(name, { skip: !!ONLY && !ONLY.test(name) }, fn),
    };
    const { chromium: browserType } = await import("playwright-core");
    const external = process.env.BASE;
    if (!external)
      assert.ok(
        existsSync("dist/client/index.html"),
        "build first: dist/client is missing",
      );
    const server = external ? null : await serveRuntimeFixture();
    const base = external ?? server.base;
    const browser = await browserType.launch({ executablePath: executable });

    /** Open a room in a lens. Every request to another site is answered
     * with a stub, once `go()` lets it; `hold()` holds the next ones. */
    async function visit(lens, path, options, look) {
      const context = await browser.newContext(options);
      let release = () => {};
      let gate = Promise.resolve();
      const control = {
        hold() {
          gate = new Promise((go) => (release = go));
        },
        go: () => release(),
      };
      await context.route("**/*", async (route) => {
        if (route.request().url().startsWith(base)) return route.continue();
        await gate;
        return route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>stub</title><p>Stub piece.</p>",
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(`${base}${path}`, { waitUntil: "load" });
        if (lens !== "daylight") {
          await page.waitForSelector("html[data-shell-ready]", {
            timeout: 30000,
          });
          await page.waitForFunction(() => window.prismHarness?.ready);
        }
        await page.waitForTimeout(300);
        await look(page, control);
        assert.deepEqual(errors, [], "page errors");
      } finally {
        control.go();
        await context.close();
      }
    }

    /** What the shell shows: under a lens the Daylight page beneath holds
     * the same parts, hidden. Back Page shows only its open pages. */
    const scope = (lens) =>
      lens === "daylight"
        ? ""
        : lens === "back-page"
          ? "#lens-shell .bp-spread "
          : "#lens-shell ";
    /** Turn Back Page's book on until `selector` is on its open pages. */
    async function reveal(page, lens, selector) {
      if (lens !== "back-page") return;
      const next = page.locator("#lens-shell [data-prism-turn='next']");
      for (let i = 0; i < 80; i += 1) {
        if (await page.locator(`${scope(lens)}${selector}`).count()) return;
        assert.ok(await next.count(), `${selector} is in the book`);
        await next.click();
        await page.waitForTimeout(450);
      }
    }

    /** The playing piece in a stage, as a visitor sees it: the window it
     * opened in, the box the frame is shown through, and the frame. */
    const look = (page, stageSelector) =>
      page.evaluate((selector) => {
        const stage = document.querySelector(selector);
        const frame = stage?.querySelector("iframe");
        if (!frame) return null;
        let clip = frame.parentElement;
        while (clip && getComputedStyle(clip).overflow === "visible")
          clip = clip.parentElement;
        const rect = (el) => {
          const r = el.getBoundingClientRect();
          return {
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
          };
        };
        const win = frame.closest("[popover]");
        return {
          src: frame.getAttribute("src"),
          live: stage.dataset.live ?? null,
          frame: rect(frame),
          clip: clip && rect(clip),
          clipped: clip && getComputedStyle(clip).overflow,
          window: win && rect(win),
          open: !!win?.matches(":popover-open"),
          moving: win
            ? win.getAnimations({ subtree: true }).length
            : stage.getAnimations({ subtree: true }).length,
          view: [document.documentElement.clientWidth, innerHeight],
          page: document.documentElement.scrollHeight,
        };
      }, stageSelector);
    const box = (page, selector) =>
      page.evaluate((selector) => {
        const { width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return [Math.round(width), Math.round(height)];
      }, selector);
    const near = (a, b, what) =>
      assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} against ${b}`);

    /** The address asks for the result alone, and nothing to edit. */
    function resultOnly(src, what) {
      const url = new URL(src);
      assert.equal(url.origin, "https://codepen.io", `${what}: a Pen`);
      assert.match(url.pathname, /^\/[\w-]+\/embed\/\w+$/, `${what}: embed`);
      assert.equal(
        url.searchParams.get("default-tab"),
        "result",
        `${what}: opens on its result`,
      );
      assert.notEqual(
        url.searchParams.get("editable"),
        "true",
        `${what}: nothing to edit`,
      );
    }
    /** The frame is shown only through its result: its tabs and toolbar
     * lie outside the box it is shown through, which hides them. */
    function chromeHidden(seen, what) {
      assert.ok(seen.clip, `${what}: shown through a box that clips`);
      assert.match(seen.clipped, /hidden|clip/, `${what}: the box clips`);
      near(seen.clip.top - seen.frame.top, CHROME.top, `${what}: tabs above`);
      near(
        seen.frame.bottom - seen.clip.bottom,
        CHROME.bottom,
        `${what}: toolbar below`,
      );
      near(seen.clip.left - seen.frame.left, CHROME.left, `${what}: left`);
      near(seen.frame.right - seen.clip.right, CHROME.right, `${what}: right`);
    }
    /** Big enough to see the piece, and all of it on the screen. */
    function bigEnough(seen, size, what) {
      const { clip } = seen;
      const [width, height] = seen.view;
      if (size === "desktop") {
        assert.ok(
          clip.width >= LEAST.width && clip.height >= LEAST.height,
          `${what}: ${Math.round(clip.width)}×${Math.round(clip.height)} is big enough`,
        );
      } else
        assert.ok(
          clip.width >= width - 2 * MARGIN,
          `${what}: ${Math.round(clip.width)} wide fills the screen's width`,
        );
      const all = seen.window ?? clip;
      assert.ok(
        all.left >= -1 &&
          all.top >= -1 &&
          all.right <= width + 1 &&
          all.bottom <= height + 1,
        `${what}: on the screen`,
      );
    }

    try {
      for (const [size, options] of Object.entries(SIZES)) {
        for (const lens of LENSES) {
          await t.test(
            `${size}, ${lens}: a Pen on the Lab opens on its result, big enough to see, and nothing moves`,
            () =>
              visit(
                lens,
                ROOMS.list(lens),
                { ...options, reducedMotion: "reduce" },
                async (page, control) => {
                  for (const slug of CARDS) {
                    const part = `[data-part='lab.preview'][data-ref='${slug}']`;
                    await reveal(page, lens, part);
                    const toggle = await page.evaluate(
                      (selector) => {
                        const el = document.querySelector(selector);
                        const toggle = el.matches("[data-block-toggle]")
                          ? el
                          : el.querySelector("[data-block-toggle]");
                        toggle.dataset.testToggle = "";
                        const stage = document.getElementById(
                          toggle.getAttribute("aria-controls"),
                        );
                        stage.dataset.testStage = "";
                        stage.closest("[data-stage-room]").dataset.testRoom = "";
                        return toggle.getAttribute("aria-controls");
                      },
                      `${scope(lens)}${part}`,
                    );
                    const stage = `[id="${toggle}"]`;
                    const room = "[data-test-room]";
                    await page.focus("[data-test-toggle]");
                    const before = {
                      room: await box(page, room),
                      page: await page.evaluate(
                        () => document.documentElement.scrollHeight,
                      ),
                      // Where the press was: Back Page's note is the window.
                      note: await page.evaluate(() => {
                        const r = document
                          .querySelector("[data-test-toggle]")
                          .getBoundingClientRect();
                        return [r.left + r.width / 2, r.top + r.height / 2];
                      }),
                    };

                    // Pressed, and still loading: already at its full size.
                    control.hold();
                    await page.keyboard.press("Enter");
                    await page.waitForSelector(`${stage} iframe`, { state: "attached" });
                    const loading = await look(page, stage);
                    assert.equal(loading.live, "loading", `${slug}: loading`);
                    resultOnly(loading.src, slug);
                    chromeHidden(loading, slug);
                    bigEnough(loading, size, slug);
                    assert.ok(loading.open, `${slug}: in a window of its own`);
                    assert.equal(loading.moving, 0, `${slug}: opens still`);
                    assert.deepEqual(
                      await box(page, room),
                      before.room,
                      `${slug}: its card keeps its size`,
                    );
                    assert.equal(loading.page, before.page, `${slug}: page`);
                    if (lens === "back-page")
                      assert.ok(
                        await page.evaluate(
                          ([x, y]) =>
                            !!document
                              .elementFromPoint(x, y)
                              ?.closest("[popover]:popover-open"),
                          before.note,
                        ),
                        `${slug}: the note unfolds where it was stuck`,
                      );

                    // Loaded: no larger, and nothing under it has moved.
                    control.go();
                    await page.waitForFunction(
                      (selector) =>
                        document.querySelector(selector)?.dataset.live === "on",
                      stage,
                    );
                    const on = await look(page, stage);
                    for (const key of ["width", "height"]) {
                      near(on.clip[key], loading.clip[key], `${slug}: ${key}`);
                      near(
                        on.window[key],
                        loading.window[key],
                        `${slug}: window ${key}`,
                      );
                    }
                    chromeHidden(on, `${slug}, loaded`);
                    assert.deepEqual(await box(page, room), before.room);
                    assert.equal(on.page, before.page);

                    // Escape puts it away.
                    await page.focus("[data-test-toggle]");
                    await page.keyboard.press("Escape");
                    assert.equal(
                      await page.locator(`${stage} iframe`).count(),
                      0,
                      `${slug}: put away`,
                    );
                    assert.equal(
                      await page.locator(":popover-open").count(),
                      0,
                      `${slug}: its window with it`,
                    );
                    await page.evaluate(() => {
                      for (const el of document.querySelectorAll(
                        "[data-test-toggle], [data-test-stage], [data-test-room]",
                      )) {
                        delete el.dataset.testToggle;
                        delete el.dataset.testStage;
                        delete el.dataset.testRoom;
                      }
                    });
                  }
                },
              ),
          );

          await t.test(
            `${size}, ${lens}: a Labbook Pen shows only its result, where it is`,
            () =>
              visit(
                lens,
                ROOMS.labbook(lens),
                { ...options, reducedMotion: "reduce" },
                async (page) => {
                  const entry = `[id="${BOOK_PEN}"]`;
                  await reveal(page, lens, entry);
                  const stage = `${scope(lens)}${entry} [data-block-stage]`;
                  await page.focus(`${scope(lens)}${entry} [data-artifact-load]`);
                  await page.keyboard.press("Enter");
                  await page.waitForSelector(`${stage} iframe`, { state: "attached" });
                  const seen = await look(page, stage);
                  resultOnly(seen.src, BOOK_PEN);
                  chromeHidden(seen, BOOK_PEN);
                  assert.equal(seen.window, null, "it plays where it is");
                  await page.focus(`${scope(lens)}${entry} figcaption a`);
                  await page.keyboard.press("Escape");
                  assert.equal(await page.locator(`${stage} iframe`).count(), 0);
                },
              ),
          );

          await t.test(
            `${size}, ${lens}: a Pen on an experiment's page shows only its result, where it is`,
            () =>
              visit(
                lens,
                ROOMS.blocks(lens),
                { ...options, reducedMotion: "reduce" },
                async (page) => {
                  const pen = `${scope(lens)}[data-block-stage][data-frame*="codepen.io"]`;
                  await reveal(page, lens, '[data-block-stage][data-frame*="codepen.io"]');
                  const id = await page.getAttribute(pen, "id");
                  await page.focus(`[data-block-toggle][aria-controls="${id}"]`);
                  await page.keyboard.press("Enter");
                  await page.waitForSelector(`[id="${id}"] iframe`, { state: "attached" });
                  const seen = await look(page, `[id="${id}"]`);
                  resultOnly(seen.src, id);
                  chromeHidden(seen, id);
                  assert.equal(seen.window, null, "it plays where it is");
                  if (size === "desktop")
                    assert.ok(
                      seen.clip.width >= LEAST.width &&
                        seen.clip.height >= LEAST.height,
                      `${Math.round(seen.clip.width)}×${Math.round(seen.clip.height)}`,
                    );
                },
              ),
          );
        }
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
